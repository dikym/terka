-- A device row belongs to the auth session that last wrote it, so removing a device can end that
-- session. Clients have no grant on either column; the device_seen trigger fills them.
alter table public.devices
	add column session_id uuid,
	add column removal_reason text check (removal_reason in ('removed', 'left'));

update public.devices set removal_reason = 'left' where removed_at is not null;

-- Owner and security definer writes pass through untouched, so remove_device leaves last_seen_at alone.
create or replace function public.device_seen() returns trigger
language plpgsql set search_path = '' as $$
declare
	caller_session uuid := nullif(auth.jwt()->>'session_id', '')::uuid;
begin
	if current_user <> 'authenticated' then
		return new;
	end if;
	new.last_seen_at := now();
	if tg_op = 'INSERT' then
		new.session_id := caller_session;
		new.removed_at := null;
		new.removal_reason := null;
		return new;
	end if;
	new.session_id := coalesce(old.session_id, caller_session);
	new.removal_reason := old.removal_reason;
	if caller_session is null or new.session_id = caller_session then
		if old.removal_reason = 'removed' then
			new.removed_at := old.removed_at;
		else
			new.removal_reason := case when new.removed_at is not null then 'left' end;
		end if;
	elsif new.removed_at is not null and new.removed_at is distinct from old.removed_at then
		-- An older client removes another device by marking its row; only remove_device may do that now.
		raise exception using errcode = 'TK007', message = 'a device can only mark itself';
	else
		-- The device signed in again on a new session, which undoes an earlier removal.
		new.session_id := caller_session;
		new.removed_at := null;
		new.removal_reason := null;
	end if;
	return new;
end;
$$;

create function public.remove_device(device uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
	target public.devices;
begin
	select * into target from public.devices where user_id = auth.uid() and id = device for update;
	if not found then
		raise exception using errcode = 'TK009', message = 'no such device';
	end if;
	if target.session_id = nullif(auth.jwt()->>'session_id', '')::uuid then
		raise exception using errcode = 'TK008', message = 'cannot remove this session';
	end if;
	if target.removal_reason is distinct from 'removed' then
		update public.devices set removed_at = now(), removal_reason = 'removed'
		where user_id = target.user_id and id = target.id;
	end if;
	-- Deleting the session also deletes its refresh tokens, so the device cannot refresh again.
	delete from auth.sessions where id = target.session_id and user_id = auth.uid();
end;
$$;

-- Asked by a device that may already be signed out, hence open to anon.
create function public.session_removed(session uuid) returns boolean
language sql stable security definer set search_path = '' as $$
	select exists (select 1 from public.devices where session_id = session and removal_reason = 'removed');
$$;

revoke all on function public.remove_device(uuid) from anon, public;
revoke all on function public.session_removed(uuid) from anon, public;
grant execute on function public.remove_device(uuid) to authenticated;
grant execute on function public.session_removed(uuid) to anon, authenticated;
