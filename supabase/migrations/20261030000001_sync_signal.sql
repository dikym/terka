-- Devices of one account nudge each other to pull after a sync sent something. The nudge is a
-- Realtime broadcast on the private topic sync:<user id>, and it carries no data. Only the account
-- itself may listen or send on its topic. RLS on realtime.messages is already on.
create policy sync_signal_receive on realtime.messages for select to authenticated using (
	(select realtime.topic()) = 'sync:' || (select auth.uid())::text
	and realtime.messages.extension = 'broadcast'
);
create policy sync_signal_send on realtime.messages for insert to authenticated with check (
	(select realtime.topic()) = 'sync:' || (select auth.uid())::text
	and realtime.messages.extension = 'broadcast'
);
