begin;
select plan(49);

create function pg_temp.reviews(owner uuid, count integer, overrides jsonb default '{}') returns jsonb
language sql as $$
	select jsonb_agg(tests.review(owner, overrides)) from generate_series(1, count);
$$;
create function pg_temp.insert_as(owner uuid, rows jsonb) returns void
language plpgsql as $$
begin
	perform tests.as_user(owner);
	perform tests.insert_reviews(rows);
	perform tests.as_owner();
end;
$$;

-- Retries and usage counting
select set_config('tests.a', tests.ready_user('a@test.terka')::text, true);
select set_config('tests.batch', pg_temp.reviews(current_setting('tests.a')::uuid, 200)::text, true);
select pg_temp.insert_as(current_setting('tests.a')::uuid, current_setting('tests.batch')::jsonb);
select pg_temp.insert_as(current_setting('tests.a')::uuid, current_setting('tests.batch')::jsonb);
select is((select count(*)::integer from public.review_logs where user_id = current_setting('tests.a')::uuid), 200, 'a resent batch stores each answer once');
select is(
	(select row_count from public.usage_daily where user_id = current_setting('tests.a')::uuid and table_name = 'review_logs'),
	200, 'the daily counter counts only rows that were stored'
);
select is((select row_count from public.usage_totals where user_id = current_setting('tests.a')::uuid), 200, 'the total counter counts the same rows');
select ok(
	(select tgtype & 1 = 0 from pg_trigger where tgname = 'bump_usage' and tgrelid = 'public.review_logs'::regclass),
	'usage is counted once per statement, not per row'
);

-- Daily and total limits
select set_config('tests.c', tests.ready_user('c@test.terka')::text, true);
select lives_ok(
	format('select pg_temp.insert_as(%L, %L)', current_setting('tests.c'), pg_temp.reviews(current_setting('tests.c')::uuid, 1000)),
	'1,000 answers in one server day are accepted'
);
select throws_ok(
	format('select pg_temp.insert_as(%L, %L)', current_setting('tests.c'), pg_temp.reviews(current_setting('tests.c')::uuid, 1)),
	'TK001', null, 'the 1,001st answer of the server day is refused'
);
select tests.as_owner();
update public.usage_daily set received_day = received_day - 1 where user_id = current_setting('tests.c')::uuid;
select lives_ok(
	format('select pg_temp.insert_as(%L, %L)', current_setting('tests.c'), pg_temp.reviews(current_setting('tests.c')::uuid, 1)),
	'answers are accepted again on the next server day'
);
update public.usage_totals set row_count = 50000 where user_id = current_setting('tests.c')::uuid;
select throws_ok(
	format('select pg_temp.insert_as(%L, %L)', current_setting('tests.c'), pg_temp.reviews(current_setting('tests.c')::uuid, 1)),
	'TK002', null, 'an account at 50,000 log rows is refused'
);
select tests.as_owner();

-- Consent
select set_config('tests.d', tests.create_user('d@test.terka')::text, true);
select set_config('tests.d_device', tests.add_device(current_setting('tests.d')::uuid)::text, true);
select throws_ok(
	format('select pg_temp.insert_as(%L, %L)', current_setting('tests.d'), pg_temp.reviews(current_setting('tests.d')::uuid, 1)),
	'TK005', null, 'logs without the current consent are refused with the consent code'
);
select tests.as_user(current_setting('tests.d')::uuid);
select lives_ok(
	format(
		$$ insert into public.privacy_consents (device_id, consented_at, policy_version) values (%L, now(), '2026-10-01') on conflict (user_id, policy_version) do nothing $$,
		current_setting('tests.d_device')
	),
	'the first consent can be written without an earlier one'
);
select lives_ok(
	format(
		$$ insert into public.privacy_consents (device_id, consented_at, policy_version) values (%L, now(), '2026-10-01') on conflict (user_id, policy_version) do nothing $$,
		current_setting('tests.d_device')
	),
	'a resent consent is accepted'
);
select is((select count(*)::integer from public.privacy_consents), 1, 'a resent consent is stored once');
select lives_ok(
	format('select pg_temp.insert_as(%L, %L)', current_setting('tests.d'), pg_temp.reviews(current_setting('tests.d')::uuid, 1)),
	'logs are accepted once the consent is stored'
);
select tests.as_owner();
insert into public.privacy_policy_versions (version, published_at, requires_reconsent, summary_url)
values ('2026-12-01', '2026-12-01T00:00:00Z', true, 'https://terka.my.id/privasi');
select throws_ok(
	format('select pg_temp.insert_as(%L, %L)', current_setting('tests.d'), pg_temp.reviews(current_setting('tests.d')::uuid, 1)),
	'TK005', null, 'a new version that asks again stops logs until it is accepted'
);
insert into public.privacy_consents (user_id, device_id, consented_at, policy_version)
values (current_setting('tests.d')::uuid, current_setting('tests.d_device')::uuid, now(), '2026-12-01');
select is(
	(select count(*)::integer from public.privacy_consents where user_id = current_setting('tests.d')::uuid),
	2, 'both accepted versions stay recorded'
);
select throws_ok(
	$$ delete from public.privacy_policy_versions where version = '2026-10-01' $$,
	'23503', null, 'an accepted policy version cannot be deleted'
);

-- Sessions
create function pg_temp.open_run(owner uuid, kind text) returns uuid
language plpgsql as $$
declare
	run uuid := tests.uuid7();
begin
	perform tests.as_user(owner);
	insert into public.practice_runs (id, device_id, started_at, local_day, kind, scope_level)
	values (run, tests.device_of(owner), now() - interval '10 minutes', current_date, kind, 'national');
	perform tests.as_owner();
	return run;
end;
$$;
select set_config('tests.e', tests.ready_user('e@test.terka')::text, true);
select set_config('tests.run', pg_temp.open_run(current_setting('tests.e')::uuid, 'daily')::text, true);
select set_config('tests.seq', (select server_seq::text from public.practice_runs where id = current_setting('tests.run')::uuid), true);
select tests.as_user(current_setting('tests.e')::uuid);
select lives_ok(
	format($$ update public.practice_runs set ended_at = now(), answered = 5, correct = 4, active_ms = 60000 where id = %L $$, current_setting('tests.run')),
	'an open session is closed once'
);
select ok(
	(select server_seq > current_setting('tests.seq')::bigint from public.practice_runs where id = current_setting('tests.run')::uuid),
	'closing a session gives it a new server_seq'
);
select throws_ok(
	format($$ update public.practice_runs set ended_at = ended_at, answered = 5, correct = 4, active_ms = 60000 where id = %L $$, current_setting('tests.run')),
	'TK006', null, 'an identical close of a closed session is refused'
);
select throws_ok(
	format($$ update public.practice_runs set answered = 9 where id = %L $$, current_setting('tests.run')),
	'TK006', null, 'a different close of a closed session is refused'
);
select is((select answered from public.practice_runs where id = current_setting('tests.run')::uuid), 5::smallint, 'the first close stays');
select tests.as_owner();
select set_config('tests.placement', pg_temp.open_run(current_setting('tests.e')::uuid, 'placement')::text, true);
select set_config('tests.kilat', pg_temp.open_run(current_setting('tests.e')::uuid, 'kilat')::text, true);
select tests.as_user(current_setting('tests.e')::uuid);
select throws_ok(
	format($$ update public.practice_runs set ended_at = now(), answered = 5, correct = 4, active_ms = 1 where id = %L $$, current_setting('tests.placement')),
	'TK006', null, 'a placement session closes only with a placement level'
);
select throws_ok(
	format($$ update public.practice_runs set ended_at = now(), answered = 5, correct = 4, active_ms = 1, placement_level = 'mahir' where id = %L $$, current_setting('tests.kilat')),
	'TK006', null, 'a non-placement session cannot carry a placement level'
);
select throws_ok(
	format($$ update public.practice_runs set ended_at = now(), answered = 5, correct = 4, active_ms = 1 where id = %L $$, current_setting('tests.kilat')),
	'TK006', null, 'a Kilat session closes only with a score'
);
select throws_ok(
	format($$ update public.practice_runs set ended_at = now(), answered = 3, correct = 4, active_ms = 1, score = 3 where id = %L $$, current_setting('tests.kilat')),
	'23514', null, 'a close with more correct than answered is refused'
);
select tests.as_owner();

-- Devices
select set_config('tests.f', tests.create_user('f@test.terka')::text, true);
select tests.add_device(current_setting('tests.f')::uuid) from generate_series(1, 20);
select throws_ok(
	format('select tests.add_device(%L)', current_setting('tests.f')),
	'TK003', null, 'a 21st active device is refused'
);
alter table public.devices disable trigger device_seen;
update public.devices set last_seen_at = now() - interval '91 days'
where id = (select id from public.devices where user_id = current_setting('tests.f')::uuid limit 1);
alter table public.devices enable trigger device_seen;
select lives_ok(format('select tests.add_device(%L)', current_setting('tests.f')), 'a device unused for 91 days no longer counts');
select is((select count(*)::integer from public.devices where user_id = current_setting('tests.f')::uuid), 21, 'old devices are kept');
update public.devices set removed_at = now()
where id = (select id from public.devices where user_id = current_setting('tests.f')::uuid and last_seen_at > now() - interval '1 day' limit 1);
select lives_ok(format('select tests.add_device(%L)', current_setting('tests.f')), 'a device removed from the list no longer counts');
select lives_ok(
	format(
		$$ insert into public.devices (user_id, id, created_at, label, platform)
		select user_id, id, created_at, label, platform from public.devices
		where user_id = %L and last_seen_at > now() - interval '1 day' limit 1
		on conflict (user_id, id) do nothing $$,
		current_setting('tests.f')
	),
	'resending a registered device is accepted at the active-device limit'
);
select set_config('tests.g', tests.create_user('g@test.terka')::text, true);
select set_config('tests.g_device', tests.add_device(current_setting('tests.g')::uuid)::text, true);
select tests.as_user(current_setting('tests.g')::uuid);
select lives_ok(
	format($$ update public.devices set last_seen_at = now() - interval '1 year' where id = %L $$, current_setting('tests.g_device')),
	'a touch update is accepted'
);
select ok(
	(select last_seen_at > now() - interval '1 minute' from public.devices where id = current_setting('tests.g_device')::uuid),
	'the server time replaces the sent last_seen_at'
);
select lives_ok(
	format($$ update public.devices set removed_at = now() where id = %L $$, current_setting('tests.g_device')),
	'a device can be marked removed'
);
select ok(
	(select removed_at is not null from public.devices where id = current_setting('tests.g_device')::uuid),
	'the removal mark is stored'
);
select tests.as_owner();
update public.service_flags set signups_open = false;
select set_config('tests.h', tests.create_user('h@test.terka')::text, true);
select throws_ok(format('select tests.add_device(%L)', current_setting('tests.h')), 'TK004', null, 'closed signups refuse the first device of a new account');
select lives_ok(format('select tests.add_device(%L)', current_setting('tests.g')), 'closed signups still let an existing account add a device');
update public.service_flags set signups_open = true;

-- Last write wins
create function pg_temp.save_settings(owner uuid, at timestamptz, device uuid, special boolean) returns void
language plpgsql as $$
begin
	perform tests.as_user(owner);
	insert into public.user_settings (updated_by_device, updated_at, special_enabled, active_scope_level)
	values (device, at, special, 'national')
	on conflict (user_id) do update set updated_by_device = excluded.updated_by_device,
		updated_at = excluded.updated_at, special_enabled = excluded.special_enabled;
	perform tests.as_owner();
end;
$$;
select set_config('tests.g2', tests.add_device(current_setting('tests.g')::uuid)::text, true);
select pg_temp.save_settings(current_setting('tests.g')::uuid, '2026-10-02T10:00:00Z', current_setting('tests.g_device')::uuid, true);
select pg_temp.save_settings(current_setting('tests.g')::uuid, '2026-10-02T09:00:00Z', current_setting('tests.g_device')::uuid, false);
select is((select special_enabled from public.user_settings where user_id = current_setting('tests.g')::uuid), true, 'an older settings edit does not overwrite a newer one');
select pg_temp.save_settings(
	current_setting('tests.g')::uuid, '2026-10-02T10:00:00Z',
	greatest(current_setting('tests.g_device')::uuid, current_setting('tests.g2')::uuid), false
);
select pg_temp.save_settings(
	current_setting('tests.g')::uuid, '2026-10-02T10:00:00Z',
	least(current_setting('tests.g_device')::uuid, current_setting('tests.g2')::uuid), true
);
select is((select special_enabled from public.user_settings where user_id = current_setting('tests.g')::uuid), false, 'a tie goes to the larger device id');
create function pg_temp.save_note(owner uuid, at timestamptz, device uuid, body text) returns void
language plpgsql as $$
begin
	perform tests.as_user(owner);
	insert into public.card_notes (updated_by_device, updated_at, content_id, body) values (device, at, 'dk', body)
	on conflict (user_id, content_id) do update set updated_by_device = excluded.updated_by_device,
		updated_at = excluded.updated_at, body = excluded.body;
	perform tests.as_owner();
end;
$$;
select pg_temp.save_note(current_setting('tests.g')::uuid, '2026-10-02T10:00:00Z', current_setting('tests.g_device')::uuid, 'Denpasar');
select pg_temp.save_note(current_setting('tests.g')::uuid, '2026-10-02T11:00:00Z', current_setting('tests.g_device')::uuid, '');
select pg_temp.save_note(current_setting('tests.g')::uuid, '2026-10-02T10:30:00Z', current_setting('tests.g2')::uuid, 'Denpasar');
select is((select body from public.card_notes where user_id = current_setting('tests.g')::uuid), '', 'a deleted note stays deleted when an older copy arrives');
insert into public.usage_totals (user_id, row_count) values (current_setting('tests.g')::uuid, 50000)
on conflict (user_id) do update set row_count = 50000;
select tests.as_user(current_setting('tests.g')::uuid);
select throws_ok(
	format(
		$$ insert into public.card_notes (updated_by_device, updated_at, content_id, body) values (%L, now(), 'bk', 'Binjai') $$,
		current_setting('tests.g_device')
	),
	'TK002', null, 'new notes count toward the account row limit'
);
select tests.as_owner();

-- Cleanup job
insert into public.usage_daily (user_id, received_day, table_name, row_count)
values (current_setting('tests.a')::uuid, current_date - 31, 'review_logs', 5);
select public.cleanup_usage_daily();
select is(
	(select count(*)::integer from public.usage_daily where received_day < current_date - 30), 0,
	'the cleanup removes counters older than 30 days'
);
select is((select count(*)::integer from public.review_logs where user_id = current_setting('tests.a')::uuid), 200, 'the cleanup keeps answers');
select is((select count(*)::integer from cron.job where jobname = 'cleanup-usage-daily'), 1, 'the cleanup runs daily');
select tests.as_user(current_setting('tests.a')::uuid);
select throws_ok('select public.cleanup_usage_daily()', '42501', null, 'a user cannot run the cleanup');
select tests.as_owner();

-- Deleting an account
select has_index('public', 'review_logs', 'review_logs_run', 'answers are indexed by session for account deletion');
select has_index('public', 'fact_views', 'fact_views_run', 'fact views are indexed by session for account deletion');
select set_config('tests.k', tests.ready_user('k@test.terka')::text, true);
select set_config('tests.k_run', pg_temp.open_run(current_setting('tests.k')::uuid, 'daily')::text, true);
select set_config('tests.k_review', tests.uuid7()::text, true);
select pg_temp.insert_as(
	current_setting('tests.k')::uuid,
	jsonb_build_array(tests.review(current_setting('tests.k')::uuid, jsonb_build_object('id', current_setting('tests.k_review'), 'run_id', current_setting('tests.k_run'))))
);
select tests.as_user(current_setting('tests.k')::uuid);
insert into public.review_voids (id, device_id, review_id, client_ts)
values (tests.uuid7(), tests.device_of(current_setting('tests.k')::uuid), current_setting('tests.k_review')::uuid, now());
insert into public.fact_views (id, device_id, run_id, client_ts, local_day, fact_id)
values (tests.uuid7(), tests.device_of(current_setting('tests.k')::uuid), current_setting('tests.k_run')::uuid, now(), current_date, 'fact-a');
insert into public.card_events (id, device_id, client_ts, local_day, content_id, mode, kind)
values (tests.uuid7(), tests.device_of(current_setting('tests.k')::uuid), now(), current_date, 'dk', 'code2region', 'suspend');
insert into public.sightings (id, device_id, client_ts, local_day, region_id)
values (tests.uuid7(), tests.device_of(current_setting('tests.k')::uuid), now(), current_date, 'dk');
insert into public.fsrs_params (id, device_id, activated_at, created_at, logloss, rmse, baseline_logloss, baseline_rmse,
	trained_review_count, algorithm, status, library_version, weights, training_set_hash)
values (tests.uuid7(), tests.device_of(current_setting('tests.k')::uuid), now(), now(), 0.3, 0.05, 0.31, 0.05, 10, 'fsrs-6',
	'active', 'test', array_fill(0.5::float8, array[21]), decode(repeat('ab', 32), 'hex'));
insert into public.card_notes (updated_by_device, updated_at, content_id, body)
values (tests.device_of(current_setting('tests.k')::uuid), now(), 'dk', 'Denpasar');
insert into public.user_settings (updated_by_device, updated_at, active_scope_level)
values (tests.device_of(current_setting('tests.k')::uuid), now(), 'national');
select lives_ok('select public.delete_user()', 'an account that filled every table can delete itself');
select tests.as_owner();
select is(
	(
		select count(*)::integer from (
			select user_id from public.devices union all select user_id from public.user_settings
			union all select user_id from public.privacy_consents union all select user_id from public.practice_runs
			union all select user_id from public.review_logs union all select user_id from public.review_voids
			union all select user_id from public.card_events union all select user_id from public.sightings
			union all select user_id from public.fact_views union all select user_id from public.fsrs_params
			union all select user_id from public.card_notes union all select user_id from public.usage_daily
			union all select user_id from public.usage_totals
		) rows where user_id = current_setting('tests.k')::uuid
	),
	0, 'no row of the deleted account is left'
);
select is((select count(*)::integer from public.review_logs where user_id = current_setting('tests.a')::uuid), 200, 'another account keeps its data');

select * from finish();
rollback;
