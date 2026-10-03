begin;
select plan(38);

select set_config('tests.a', tests.ready_user('a@test.terka')::text, true);
select set_config('tests.b', tests.ready_user('b@test.terka')::text, true);
select tests.as_user(current_setting('tests.a')::uuid);

create function pg_temp.review(overrides jsonb default '{}') returns text
language sql as $$
	select format('select tests.insert_reviews(%L::jsonb)', jsonb_build_array(tests.review(current_setting('tests.a')::uuid, overrides)));
$$;

select lives_ok(pg_temp.review(), 'a valid answer is stored');
select lives_ok(pg_temp.review(jsonb_build_object('local_day', current_date - 7)), 'an answer from seven days ago is stored');
select throws_ok(pg_temp.review(jsonb_build_object('local_day', current_date + 2)), '23514', null, 'an answer two days ahead of the server date is refused');
select throws_ok(pg_temp.review('{"id": "0190a000-0000-4000-8000-000000000001"}'), '23514', null, 'an answer id that is not uuid v7 is refused');
select hasnt_column('public', 'review_logs', 'card_id', 'review_logs has no card_id column');
select hasnt_column('public', 'card_events', 'card_id', 'card_events has no card_id column');

select throws_ok(pg_temp.review('{"correct": false, "match_type": "unverified"}'), '23514', null, 'an unverified answer cannot be marked wrong');
select throws_ok(pg_temp.review('{"correct": null}'), '23514', null, 'an exact answer must be graded');
select lives_ok(pg_temp.review('{"correct": null, "match_type": "unverified"}'), 'an unverified answer is stored ungraded');
select lives_ok(
	pg_temp.review('{"correct": null, "question_type": "intro_read", "context": "intro", "level": 1, "raw_answer": null}'),
	'an intro read is stored ungraded'
);

select throws_ok(pg_temp.review('{"mode": "special2holder"}'), '23514', null, 'a special mode needs a cd- content id');
select throws_ok(pg_temp.review('{"content_id": "cd-49-jepang"}'), '23514', null, 'a region mode cannot use a cd- content id');
select lives_ok(pg_temp.review('{"content_id": "cd-49-jepang", "mode": "special2holder", "context": "special"}'), 'a special answer with a cd- id is stored');

select throws_ok(pg_temp.review('{"match_type": "typo"}'), '23514', null, 'a typo match needs a typo cost');
select throws_ok(pg_temp.review('{"typo_cost": 0.5}'), '23514', null, 'an exact match has no typo cost');
select lives_ok(pg_temp.review('{"match_type": "typo", "typo_cost": 0.5}'), 'a typo match with its cost is stored');

select throws_ok(pg_temp.review(jsonb_build_object('raw_answer', repeat('a', 121))), '23514', null, 'an answer longer than 120 characters is refused');
select throws_ok(pg_temp.review(jsonb_build_object('key_gaps_ms', array_fill(1, array[121]))), '23514', null, 'more than 120 key gaps are refused');
select throws_ok(pg_temp.review('{"key_gaps_ms": [30001]}'), '23514', null, 'a key gap above 30,000 ms is refused');
select throws_ok(pg_temp.review('{"ms_total": 3600001}'), '23514', null, 'an answer longer than an hour is refused');
select throws_ok(pg_temp.review('{"tz": "Mars/Olympus"}'), '23503', null, 'an unknown time zone is refused');

create function pg_temp.set_answer(items jsonb) returns text
language sql as $$
	select pg_temp.review(jsonb_build_object(
		'content_id', 'bk', 'mode', 'setrecall', 'context', 'setrecall', 'question_type', 'setrecall',
		'raw_answer', null, 'set_correct', 1, 'set_threshold', 2, 'set_items', items
	));
$$;
select lives_ok(pg_temp.set_answer('[["medan", "kota-medan", "exact", 0, null]]'), 'a set answer with tuples is stored');
select throws_ok(pg_temp.set_answer('[{"raw": "medan"}]'), '23514', null, 'set items as keyed objects are refused');
select throws_ok(pg_temp.set_answer('[["medan", "kota-medan", "exact", 0]]'), '23514', null, 'a set item with four fields is refused');
select throws_ok(pg_temp.set_answer('[["medan", "kota-medan", "close", 0, null]]'), '23514', null, 'a set item with an unknown match type is refused');
select throws_ok(
	pg_temp.set_answer((select jsonb_agg(jsonb_build_array('a', null, 'none', 0, null)) from generate_series(1, 65))),
	'23514', null, 'more than 64 set items are refused'
);
select lives_ok(
	pg_temp.set_answer((select jsonb_agg(jsonb_build_array(repeat('a', 120), 'kota-medan', 'exact', 0, 'kota-binjai')) from generate_series(1, 64))),
	'the largest valid set answer is stored'
);
select throws_ok(
	pg_temp.set_answer((select jsonb_agg(jsonb_build_array(repeat('🚗', 120), 'kota-medan', 'exact', 0, 'kota-binjai')) from generate_series(1, 64))),
	'23514', null, 'a set answer above 32 KB is refused'
);
select throws_ok(
	pg_temp.review('{"set_correct": 1, "set_threshold": 2, "set_items": []}'),
	'23514', null, 'set columns are refused outside set recall'
);


select tests.as_owner();
select set_config('tests.b_review', (tests.review(current_setting('tests.b')::uuid) ->> 'id'), true);
select tests.as_user(current_setting('tests.b')::uuid);
select tests.insert_reviews(jsonb_build_array(tests.review(current_setting('tests.b')::uuid, jsonb_build_object('id', current_setting('tests.b_review')))));
select tests.as_user(current_setting('tests.a')::uuid);
select throws_ok(
	format(
		$$ insert into public.review_voids (id, device_id, review_id, client_ts) values (tests.uuid7(), %L, %L, now()) $$,
		tests.device_of(current_setting('tests.a')::uuid), current_setting('tests.b_review')
	),
	'23503', null, 'a void cannot point at another user''s answer'
);
select throws_ok(
	format(
		$$ insert into public.review_voids (id, device_id, review_id, client_ts) values (tests.uuid7(), %L, tests.uuid7(), now()) $$,
		tests.device_of(current_setting('tests.a')::uuid)
	),
	'23503', null, 'a void pointing at a missing answer fails the same way'
);
select hasnt_column('public', 'sightings', 'review_id', 'sightings has no link to answers');

select throws_ok(
	format(
		$$ insert into public.fsrs_params (user_id, id, device_id, activated_at, created_at, logloss, rmse, baseline_logloss, baseline_rmse,
			trained_review_count, algorithm, status, library_version, weights, training_set_hash)
		values (%L, tests.uuid7(), %L, null, now(), 0.3, 0.05, 0.31, 0.05, 10, 'fsrs-6', 'rejected', 'test',
			array_fill(0.5::float8, array[21]), decode(repeat('ab', 31), 'hex')) $$,
		current_setting('tests.a'), tests.device_of(current_setting('tests.a')::uuid)
	),
	'23514', null, 'a training set hash that is not 32 bytes is refused'
);
select throws_ok(
	format(
		$$ insert into public.fsrs_params (user_id, id, device_id, activated_at, created_at, logloss, rmse, baseline_logloss, baseline_rmse,
			trained_review_count, algorithm, status, library_version, weights, training_set_hash)
		values (%L, tests.uuid7(), %L, null, now(), 0.3, 0.05, 0.31, 0.05, 10, 'fsrs-6', 'rejected', repeat('v', 65),
			array_fill(0.5::float8, array[21]), decode(repeat('ab', 32), 'hex')) $$,
		current_setting('tests.a'), tests.device_of(current_setting('tests.a')::uuid)
	),
	'23514', null, 'a library version longer than 64 characters is refused'
);
select hasnt_column('public', 'fsrs_params', 'training_event_ids', 'the training id list never reaches the server');
select tests.as_owner();
select throws_ok(
	format($$ insert into public.devices (user_id, id, created_at, label, platform) values (%L, tests.uuid7(), now(), repeat('a', 41), 'x') $$, current_setting('tests.a')),
	'23514', null, 'a device label longer than 40 characters is refused'
);
select throws_ok(
	format(
		$$ insert into public.user_settings (user_id, updated_by_device, updated_at, active_scope_level, active_scope_id) values (%L, %L, now(), 'national', 'sumatera') $$,
		current_setting('tests.a'), tests.device_of(current_setting('tests.a')::uuid)
	),
	'23514', null, 'the national scope takes no scope id'
);
select throws_ok(
	format(
		$$ insert into public.card_notes (user_id, updated_by_device, updated_at, content_id, body) values (%L, %L, now(), 'dk', repeat('a', 281)) $$,
		current_setting('tests.a'), tests.device_of(current_setting('tests.a')::uuid)
	),
	'23514', null, 'a note longer than 280 characters is refused'
);

select * from finish();
rollback;
