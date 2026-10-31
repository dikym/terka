begin;
select plan(20);

select set_config('tests.a', tests.create_user('sessions-a@test.terka')::text, true);
select set_config('tests.b', tests.create_user('sessions-b@test.terka')::text, true);
select set_config('tests.s1', tests.add_session(current_setting('tests.a')::uuid)::text, true);
select set_config('tests.s2', tests.add_session(current_setting('tests.a')::uuid)::text, true);
select set_config('tests.s3', tests.add_session(current_setting('tests.a')::uuid)::text, true);
select set_config('tests.b_device', tests.add_device(current_setting('tests.b')::uuid)::text, true);
select set_config('tests.legacy', tests.add_device(current_setting('tests.a')::uuid)::text, true);
select set_config('tests.legacy_left', tests.add_device(current_setting('tests.a')::uuid)::text, true);
select set_config('tests.legacy_marked', tests.add_device(current_setting('tests.a')::uuid)::text, true);
select set_config('tests.legacy_removed', tests.add_device(current_setting('tests.a')::uuid)::text, true);
update public.devices set removed_at = now(), last_seen_at = now() - interval '2 days'
where id = current_setting('tests.legacy_left')::uuid;
update public.devices set removal_reason = 'left' where removed_at is not null;
select is(
	(select last_seen_at from public.devices where id = current_setting('tests.legacy_left')::uuid), now() - interval '2 days',
	'marking old sign-outs as left keeps when the device was last seen'
);

select tests.as_session(current_setting('tests.a')::uuid, current_setting('tests.s1')::uuid);
select set_config('tests.d1', tests.add_device(current_setting('tests.a')::uuid)::text, true);
select is(
	(select session_id from public.devices where id = current_setting('tests.d1')::uuid),
	current_setting('tests.s1')::uuid, 'an insert records the session that sent it'
);
update public.devices set last_seen_at = now() where id = current_setting('tests.d1')::uuid;
select is(
	(select session_id from public.devices where id = current_setting('tests.d1')::uuid),
	current_setting('tests.s1')::uuid, 'a touch from the same session keeps the session'
);

select tests.as_session(current_setting('tests.a')::uuid, current_setting('tests.s2')::uuid);
select set_config('tests.d2', tests.add_device(current_setting('tests.a')::uuid)::text, true);
update public.devices set removed_at = now() where id = current_setting('tests.d2')::uuid;
select tests.as_session(current_setting('tests.a')::uuid, current_setting('tests.s3')::uuid);
update public.devices set last_seen_at = now() where id = current_setting('tests.d2')::uuid;
select ok(
	(select session_id = current_setting('tests.s3')::uuid and removed_at is null and removal_reason is null
	from public.devices where id = current_setting('tests.d2')::uuid),
	'a touch from a new session takes the row over and clears a sign-out mark'
);

select tests.as_owner();
update public.devices set last_seen_at = now() - interval '1 day' where id = current_setting('tests.d2')::uuid;
select tests.as_session(current_setting('tests.a')::uuid, current_setting('tests.s1')::uuid);
select public.remove_device(current_setting('tests.d2')::uuid);
select ok(
	(select removed_at is not null and removal_reason = 'removed' from public.devices where id = current_setting('tests.d2')::uuid),
	'removing a device marks it removed'
);
select tests.as_owner();
select is(
	(select count(*)::integer from auth.sessions where id = current_setting('tests.s3')::uuid), 0,
	'removing a device deletes its session'
);
select is(
	(select last_seen_at from public.devices where id = current_setting('tests.d2')::uuid), now() - interval '1 day',
	'removing a device does not make it look active'
);

update public.devices set removed_at = now() - interval '1 hour' where id = current_setting('tests.d2')::uuid;
select tests.as_session(current_setting('tests.a')::uuid, current_setting('tests.s1')::uuid);
select public.remove_device(current_setting('tests.d2')::uuid);
select is(
	(select removed_at from public.devices where id = current_setting('tests.d2')::uuid), now() - interval '1 hour',
	'removing a removed device again changes nothing'
);
select throws_ok(
	format('select public.remove_device(%L)', current_setting('tests.d1')),
	'TK008', null, 'a device cannot remove its own session'
);
select throws_ok(
	format('select public.remove_device(%L)', current_setting('tests.b_device')),
	'TK009', null, 'a device of another account cannot be removed'
);

select tests.as_session(current_setting('tests.a')::uuid, current_setting('tests.s3')::uuid);
update public.devices set removed_at = null where id = current_setting('tests.d2')::uuid;
select ok(
	(select removed_at is not null and removal_reason = 'removed' from public.devices where id = current_setting('tests.d2')::uuid),
	'a touch from the removed session keeps the removal'
);

select tests.as_session(current_setting('tests.a')::uuid, current_setting('tests.s2')::uuid);
select throws_ok(
	format($$ update public.devices set removed_at = now() where id = %L $$, current_setting('tests.d1')),
	'TK007', null, 'a direct mark on another session''s device is refused'
);

select tests.as_session(current_setting('tests.a')::uuid, current_setting('tests.s1')::uuid);
select public.remove_device(current_setting('tests.legacy')::uuid);
select tests.as_session(current_setting('tests.a')::uuid, current_setting('tests.s2')::uuid);
update public.devices set removed_at = null where id = current_setting('tests.legacy')::uuid;
select ok(
	(select session_id = current_setting('tests.s2')::uuid and removal_reason = 'removed'
	from public.devices where id = current_setting('tests.legacy')::uuid),
	'a removed legacy device stays removed when its session is first recorded'
);

update public.devices set last_seen_at = now() where id = current_setting('tests.legacy_left')::uuid;
select ok(
	(select session_id = current_setting('tests.s2')::uuid and removed_at is null and removal_reason is null
	from public.devices where id = current_setting('tests.legacy_left')::uuid),
	'a legacy sign-out mark is cleared by the first touch'
);

update public.devices set removed_at = now() where id = current_setting('tests.legacy_marked')::uuid;
select ok(
	(select session_id is null and removed_at is not null and removal_reason = 'left'
	from public.devices where id = current_setting('tests.legacy_marked')::uuid),
	'a direct mark on a legacy device does not bind the marking session'
);

select tests.as_session(current_setting('tests.a')::uuid, current_setting('tests.s1')::uuid);
select public.remove_device(current_setting('tests.legacy_removed')::uuid);
select tests.as_owner();
update public.devices set removed_at = now() - interval '1 day'
where id = current_setting('tests.legacy_removed')::uuid;
select tests.as_session(current_setting('tests.a')::uuid, current_setting('tests.s2')::uuid);
update public.devices set removed_at = now() where id = current_setting('tests.legacy_removed')::uuid;
select ok(
	(select session_id is null and removed_at = now() - interval '1 day' and removal_reason = 'removed'
	from public.devices where id = current_setting('tests.legacy_removed')::uuid),
	'a direct mark on a removed legacy device keeps the removal and stays unbound'
);

select tests.as_anon();
select is(public.session_removed(current_setting('tests.s3')::uuid), true, 'the removed session is reported removed');
select is(public.session_removed(current_setting('tests.s1')::uuid), false, 'other sessions are not reported removed');
select throws_ok(
	format('select public.remove_device(%L)', current_setting('tests.d1')),
	'42501', null, 'anon cannot remove a device'
);

select tests.as_session(current_setting('tests.a')::uuid, tests.uuid7());
update public.devices set removed_at = null where id = current_setting('tests.d2')::uuid;
select ok(
	(select removed_at is null and removal_reason is null from public.devices where id = current_setting('tests.d2')::uuid),
	'a new session after removal clears the removal'
);

select * from finish();
rollback;
