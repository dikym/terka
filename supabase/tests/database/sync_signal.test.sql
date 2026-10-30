begin;
select plan(4);

select set_config('tests.a', tests.create_user('signal-a@test.terka')::text, true);
select set_config('tests.b', tests.create_user('signal-b@test.terka')::text, true);
create temp table topics on commit drop as
	select 'sync:' || current_setting('tests.a') as own, 'sync:' || current_setting('tests.b') as other;
grant select on topics to authenticated;

select tests.as_user(current_setting('tests.a')::uuid);

select set_config('realtime.topic', (select own from topics), true);
select lives_ok(
	$$ insert into realtime.messages (topic, extension, event, payload, private) values ((select own from topics), 'broadcast', 'changed', '{}', true) $$,
	'a user may nudge their own devices'
);
select ok(
	exists (select 1 from realtime.messages where topic = (select own from topics)),
	'a user may listen to their own devices'
);

select set_config('realtime.topic', (select other from topics), true);
select throws_ok(
	$$ insert into realtime.messages (topic, extension, event, payload, private) values ((select other from topics), 'broadcast', 'changed', '{}', true) $$,
	'42501', null, 'a user cannot nudge another account''s devices'
);
select is(
	(select count(*)::integer from realtime.messages where topic = (select other from topics)),
	0,
	'a user cannot listen to another account''s devices'
);

select * from finish();
rollback;
