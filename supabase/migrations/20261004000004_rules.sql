-- Error codes the sync client tells apart:
-- TK001 daily row limit, TK002 total row limit, TK003 active-device limit,
-- TK004 signups closed, TK005 no current consent, TK006 invalid session insert or close.

create function public.cleanup_usage_daily() returns void
language sql security definer set search_path = '' as $$
	delete from public.usage_daily where received_day < current_date - 30;
$$;

-- Once per statement, so a batch of 200 rows checks consent once.
create function public.require_consent() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
	if not public.has_current_consent() then
		raise exception using errcode = 'TK005', message = 'the current privacy policy has not been accepted';
	end if;
	return null;
end;
$$;

-- Rows skipped by on conflict do nothing are not in the transition table, so retries are not counted.
create function public.bump_usage() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
	entry record;
	daily integer;
	total integer;
begin
	for entry in select user_id, count(*)::integer as added from inserted group by user_id loop
		insert into public.usage_daily as u (user_id, received_day, table_name, row_count)
		values (entry.user_id, (now() at time zone 'UTC')::date, tg_table_name, entry.added)
		on conflict (user_id, received_day, table_name)
			do update set row_count = u.row_count + excluded.row_count
		returning row_count into daily;
		insert into public.usage_totals as t (user_id, row_count)
		values (entry.user_id, entry.added)
		on conflict (user_id) do update set row_count = t.row_count + excluded.row_count
		returning row_count into total;
		if tg_table_name in ('review_logs', 'sightings', 'fact_views') and daily > 1000 then
			raise exception using errcode = 'TK001', message = 'daily row limit reached for ' || tg_table_name;
		end if;
		if total > 50000 then
			raise exception using errcode = 'TK002', message = 'total row limit reached';
		end if;
	end loop;
	return null;
end;
$$;

do $$
declare
	log_table text;
begin
	foreach log_table in array array['practice_runs', 'review_logs', 'review_voids', 'card_events', 'sightings', 'fact_views', 'fsrs_params'] loop
		execute format(
			'create trigger require_consent before insert on public.%I for each statement execute function public.require_consent()',
			log_table
		);
		execute format(
			'create trigger bump_usage after insert on public.%I referencing new table as inserted for each statement execute function public.bump_usage()',
			log_table
		);
	end loop;
end;
$$;

-- Notes have no per-code limit on the server, so new ones count toward the account total too.
create trigger bump_usage after insert on public.card_notes
	referencing new table as inserted for each statement execute function public.bump_usage();

create function public.insert_open_run() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
	if new.ended_at is not null or new.answered is not null or new.correct is not null
		or new.active_ms is not null or new.score is not null or new.placement_level is not null then
		raise exception using errcode = 'TK006', message = 'a session is inserted open and closed by an update';
	end if;
	new.server_seq := nextval('public.practice_runs_server_seq');
	return new;
end;
$$;
create trigger insert_open_run before insert on public.practice_runs
	for each row execute function public.insert_open_run();

-- A new server_seq lets cursor-based pulls on other devices see the close.
create function public.close_run() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
	if old.ended_at is not null then
		raise exception using errcode = 'TK006', message = 'the session is already closed';
	end if;
	if new.ended_at is null or new.answered is null or new.correct is null or new.active_ms is null
		or (new.kind = 'kilat') <> (new.score is not null)
		or (new.kind = 'placement') <> (new.placement_level is not null) then
		raise exception using errcode = 'TK006', message = 'closing columns do not match the session kind';
	end if;
	new.server_seq := nextval('public.practice_runs_server_seq');
	return new;
end;
$$;
create trigger close_run before update on public.practice_runs
	for each row execute function public.close_run();

-- Server time only: a client cannot backdate a device to keep it out of the active count.
create function public.device_seen() returns trigger
language plpgsql set search_path = '' as $$
begin
	new.last_seen_at := now();
	return new;
end;
$$;
create trigger device_seen before insert or update on public.devices
	for each row execute function public.device_seen();

create function public.device_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
	-- A resent device that is already registered is skipped by on conflict, so it is never refused.
	if exists (select 1 from public.devices where user_id = new.user_id and id = new.id) then
		return new;
	end if;
	if not exists (select 1 from public.devices where user_id = new.user_id)
		and not (select signups_open from public.service_flags where id = 1) then
		raise exception using errcode = 'TK004', message = 'signups are closed';
	end if;
	if (
		select count(*) from public.devices
		where user_id = new.user_id and last_seen_at > now() - interval '90 days'
	) >= 20 then
		raise exception using errcode = 'TK003', message = 'active device limit reached';
	end if;
	return new;
end;
$$;
create trigger device_limit before insert on public.devices
	for each row execute function public.device_limit();

-- An older edit leaves the row unchanged, so a device that syncs late cannot overwrite a newer one.
create function public.keep_newer() returns trigger
language plpgsql set search_path = '' as $$
begin
	if (new.updated_at, new.updated_by_device) < (old.updated_at, old.updated_by_device) then
		return old;
	end if;
	new.received_at := now();
	return new;
end;
$$;
create trigger keep_newer before update on public.user_settings
	for each row execute function public.keep_newer();
create trigger keep_newer before update on public.card_notes
	for each row execute function public.keep_newer();

revoke all on function public.cleanup_usage_daily() from anon, authenticated, public;
