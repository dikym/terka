-- A device row cannot be deleted: sessions and answers keep pointing at it. Removing a device
-- from the list marks it instead; the next sync from a device that is really in use clears the mark.
alter table public.devices add column removed_at timestamptz;
grant update (removed_at) on public.devices to authenticated;

create or replace function public.device_limit() returns trigger
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
		where user_id = new.user_id and removed_at is null and last_seen_at > now() - interval '90 days'
	) >= 20 then
		raise exception using errcode = 'TK003', message = 'active device limit reached';
	end if;
	return new;
end;
$$;
