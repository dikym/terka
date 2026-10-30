-- Resetting progress deletes the account's learning data on the server and raises a counter. Other
-- devices compare the counter with their own and drop their copy instead of sending it back.
-- Devices, consents and the account itself stay.
create table public.progress_resets (
	user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
	epoch integer not null check (epoch > 0)
);

alter table public.progress_resets enable row level security;
revoke all on table public.progress_resets from anon, authenticated, public;
create policy read_own on public.progress_resets for select to authenticated using (user_id = (select auth.uid()));
grant select on public.progress_resets to authenticated;

create function public.reset_progress() returns integer
language plpgsql security definer set search_path = '' as $$
declare
	me uuid := auth.uid();
	next integer;
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
	-- The total counts rows the account holds, so deleting them frees the room again.
	update public.usage_totals set row_count = 0 where user_id = me;
	insert into public.progress_resets as r (user_id, epoch) values (me, 1)
	on conflict (user_id) do update set epoch = r.epoch + 1
	returning r.epoch into next;
	return next;
end;
$$;

revoke all on function public.reset_progress() from anon, public;
grant execute on function public.reset_progress() to authenticated;
