begin;
select plan(21);

select set_config('tests.a', tests.ready_user('a@test.terka')::text, true);
select set_config('tests.b', tests.ready_user('b@test.terka')::text, true);
select tests.as_user(current_setting('tests.a')::uuid);
select tests.insert_reviews(jsonb_build_array(tests.review(current_setting('tests.a')::uuid)));
select tests.as_user(current_setting('tests.b')::uuid);
select tests.insert_reviews(jsonb_build_array(tests.review(current_setting('tests.b')::uuid)));

select tests.as_user(current_setting('tests.a')::uuid);
select results_eq(
	'select distinct user_id from public.review_logs',
	format('select %L::uuid', current_setting('tests.a')),
	'a user reads only their own answers'
);
select is((select count(*)::integer from public.devices), 1, 'a user sees only their own devices');
select throws_ok(
	format('select tests.insert_reviews(%L::jsonb)', jsonb_build_array(tests.review(current_setting('tests.b')::uuid, jsonb_build_object('device_id', tests.device_of(current_setting('tests.a')::uuid))))),
	'42501', null, 'a user cannot write a row for another user'
);
select throws_ok('update public.review_logs set level = 1', '42501', null, 'a user cannot change their own answers');
select throws_ok('delete from public.review_logs', '42501', null, 'a user cannot delete their own answers');
select throws_ok(
	format(
		$$ insert into public.sightings (id, device_id, client_ts, local_day, region_id, received_at) values (tests.uuid7(), %L, now(), current_date, 'dk', now()) $$,
		tests.device_of(current_setting('tests.a')::uuid)
	),
	'42501', null, 'a client cannot send received_at'
);
select throws_ok(
	format(
		$$ insert into public.sightings (id, device_id, client_ts, local_day, region_id, server_seq) values (tests.uuid7(), %L, now(), current_date, 'dk', 1) $$,
		tests.device_of(current_setting('tests.a')::uuid)
	),
	'428C9', null, 'a client cannot send server_seq'
);
select throws_ok(
	format(
		$$ insert into public.practice_runs (id, device_id, started_at, local_day, kind, scope_level, ended_at, answered, correct, active_ms)
		values (tests.uuid7(), %L, now(), current_date, 'daily', 'national', now(), 1, 1, 1000) $$,
		tests.device_of(current_setting('tests.a')::uuid)
	),
	'42501', null, 'a client cannot insert a session already closed'
);
select throws_ok(
	$$ insert into public.devices (id, created_at, label, platform, last_seen_at) values (tests.uuid7(), now(), 'x', 'x', now() - interval '1 year') $$,
	'42501', null, 'a client cannot set last_seen_at on insert'
);
select throws_ok('select * from public.service_flags', '42501', null, 'a user cannot read service_flags');
select throws_ok('update public.service_flags set signups_open = false', '42501', null, 'a user cannot change service_flags');
select throws_ok('select * from public.usage_totals', '42501', null, 'a user cannot read usage counters');
select throws_ok('select * from public.timezones', '42501', null, 'a user cannot read the time zone catalog');
select is((select count(*)::integer from public.privacy_policy_versions), 1, 'a user reads the policy versions');

select tests.as_anon();
select throws_ok('select * from public.review_logs', '42501', null, 'the publishable key alone reads nothing');
select throws_ok('select * from public.privacy_policy_versions', '42501', null, 'the publishable key alone cannot read policy versions');
select throws_ok('select public.delete_user()', '42501', null, 'the publishable key alone cannot delete an account');

select tests.as_owner();
select is(
	array(select relname::text from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity),
	'{}'::text[], 'every public table has row level security'
);
select is(
	array(
		select distinct table_name::text from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'
		union select distinct table_name::text from information_schema.role_column_grants where grantee = 'anon' and table_schema = 'public'
	),
	'{}'::text[], 'anon has no grant on any public table'
);
select is(
	array(
		select table_name || '.' || column_name from information_schema.column_privileges
		where grantee = 'authenticated' and table_schema = 'public' and privilege_type in ('INSERT', 'UPDATE')
			and (column_name in ('received_at', 'server_seq') or (column_name = 'last_seen_at' and privilege_type = 'INSERT'))
	),
	'{}'::text[], 'clients can never write server-filled columns'
);
select is(
	array(
		select relname::text from pg_class c
		where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
			and relname not in ('timezones', 'service_flags', 'usage_daily', 'usage_totals')
			and not has_table_privilege('authenticated', c.oid, 'select')
		order by 1
	),
	'{}'::text[], 'every user table is readable by its owner through a grant'
);

select * from finish();
rollback;
