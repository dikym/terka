-- Row limits alone let one account store about 1.6 GB, because one set answer may hold 32 KB. The
-- counters also add up stored bytes, so an account stays near the size the row limits assumed.
alter table public.usage_daily add column byte_count bigint not null default 0;
alter table public.usage_totals add column byte_count bigint not null default 0;

update public.usage_totals t set byte_count = s.bytes
from (
	select user_id, sum(bytes)::bigint as bytes from (
		select user_id, pg_column_size(r.*) as bytes from public.practice_runs r
		union all select user_id, pg_column_size(r.*) from public.review_logs r
		union all select user_id, pg_column_size(r.*) from public.review_voids r
		union all select user_id, pg_column_size(r.*) from public.card_events r
		union all select user_id, pg_column_size(r.*) from public.sightings r
		union all select user_id, pg_column_size(r.*) from public.fact_views r
		union all select user_id, pg_column_size(r.*) from public.fsrs_params r
		union all select user_id, pg_column_size(r.*) from public.card_notes r
	) rows
	group by user_id
) s
where t.user_id = s.user_id;

-- 5 MB a day per table and 50 MB in total: a typical answer is about 250 bytes, a set answer a few KB.
-- Going over reuses TK001 and TK002, so clients already treat it as the matching row limit.
create or replace function public.bump_usage() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
	entry record;
	daily integer;
	daily_bytes bigint;
	total integer;
	total_bytes bigint;
begin
	for entry in
		select i.user_id, count(*)::integer as added, sum(pg_column_size(i.*))::bigint as bytes
		from inserted i group by i.user_id
	loop
		insert into public.usage_daily as u (user_id, received_day, table_name, row_count, byte_count)
		values (entry.user_id, (now() at time zone 'UTC')::date, tg_table_name, entry.added, entry.bytes)
		on conflict (user_id, received_day, table_name)
			do update set row_count = u.row_count + excluded.row_count, byte_count = u.byte_count + excluded.byte_count
		returning row_count, byte_count into daily, daily_bytes;
		insert into public.usage_totals as t (user_id, row_count, byte_count)
		values (entry.user_id, entry.added, entry.bytes)
		on conflict (user_id)
			do update set row_count = t.row_count + excluded.row_count, byte_count = t.byte_count + excluded.byte_count
		returning row_count, byte_count into total, total_bytes;
		if tg_table_name in ('review_logs', 'sightings', 'fact_views') and daily > 1000 then
			raise exception using errcode = 'TK001', message = 'daily row limit reached for ' || tg_table_name;
		end if;
		if daily_bytes > 5242880 then
			raise exception using errcode = 'TK001', message = 'daily size limit reached for ' || tg_table_name;
		end if;
		if total > 50000 then
			raise exception using errcode = 'TK002', message = 'total row limit reached';
		end if;
		if total_bytes > 52428800 then
			raise exception using errcode = 'TK002', message = 'total size limit reached';
		end if;
	end loop;
	return null;
end;
$$;

create or replace function public.reset_progress() returns integer
language plpgsql security definer set search_path = '' as $$
declare
	me uuid := auth.uid();
	new_epoch integer;
begin
	-- Answers go first: voids follow them by cascade, and sessions are no longer referenced.
	delete from public.review_logs where user_id = me;
	delete from public.fact_views where user_id = me;
	delete from public.card_events where user_id = me;
	delete from public.sightings where user_id = me;
	delete from public.fsrs_params where user_id = me;
	delete from public.practice_runs where user_id = me;
	delete from public.card_notes where user_id = me;
	delete from public.user_settings where user_id = me;
	-- The total counts what the account holds, so deleting it frees the room again.
	update public.usage_totals set row_count = 0, byte_count = 0 where user_id = me;
	insert into public.progress_resets as r (user_id, epoch) values (me, 1)
	on conflict (user_id) do update set epoch = r.epoch + 1
	returning r.epoch into new_epoch;
	return new_epoch;
end;
$$;
