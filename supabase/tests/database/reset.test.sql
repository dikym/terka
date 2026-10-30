begin;
select plan(11);

select set_config('tests.a', tests.ready_user('reset-a@test.terka')::text, true);
select set_config('tests.b', tests.ready_user('reset-b@test.terka')::text, true);

select tests.as_user(current_setting('tests.a')::uuid);
select tests.insert_reviews(jsonb_build_array(
	tests.review(current_setting('tests.a')::uuid),
	tests.review(current_setting('tests.a')::uuid)
));
insert into public.sightings (id, device_id, client_ts, local_day, region_id)
values (tests.uuid7(), tests.device_of(current_setting('tests.a')::uuid), now(), current_date, 'dk');
insert into public.card_notes (updated_by_device, updated_at, content_id, body)
values (tests.device_of(current_setting('tests.a')::uuid), now(), 'dk', 'Denpasar');
insert into public.user_settings (updated_by_device, updated_at, active_scope_level)
values (tests.device_of(current_setting('tests.a')::uuid), now(), 'national');
select tests.as_user(current_setting('tests.b')::uuid);
select tests.insert_reviews(jsonb_build_array(tests.review(current_setting('tests.b')::uuid)));

select tests.as_user(current_setting('tests.a')::uuid);
select is((select count(*)::integer from public.progress_resets), 0, 'an account that never reset has no counter');
select is(public.reset_progress(), 1, 'the first reset sets the counter to 1');
select is((select count(*)::integer from public.review_logs), 0, 'a reset deletes the answers');
select is(
	(select count(*)::integer from (
		select user_id from public.sightings union all select user_id from public.card_notes
		union all select user_id from public.user_settings union all select user_id from public.practice_runs
	) rows),
	0, 'a reset deletes the other learning data'
);
select is((select count(*)::integer from public.devices), 1, 'a reset keeps the device');
select is((select count(*)::integer from public.privacy_consents), 1, 'a reset keeps the consent');
select is(public.reset_progress(), 2, 'every reset raises the counter');
select is((select epoch from public.progress_resets), 2, 'the account reads its own counter');

select tests.as_owner();
select is(
	(select row_count from public.usage_totals where user_id = current_setting('tests.a')::uuid), 0,
	'a reset frees the account row limit'
);
select is(
	(select count(*)::integer from public.review_logs where user_id = current_setting('tests.b')::uuid), 1,
	'another account keeps its data'
);

select tests.as_user(current_setting('tests.b')::uuid);
select is((select count(*)::integer from public.progress_resets), 0, 'an account cannot read another account''s counter');

select * from finish();
rollback;
