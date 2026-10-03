-- Shared by every test file; committed on purpose, unlike the test files that roll back.
create extension if not exists pgtap with schema extensions;
-- Helpers reference tables that early migrations have not created yet.
set check_function_bodies = off;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

-- Postgres 17 has no uuidv7(); version and variant bits are enough for the uuid_v7 domain.
create or replace function tests.uuid7() returns uuid
language sql volatile as $$
	select overlay(overlay(gen_random_uuid()::text placing '7' from 15) placing '8' from 20)::uuid;
$$;

create or replace function tests.create_user(email text) returns uuid
language plpgsql as $$
declare
	id uuid := gen_random_uuid();
begin
	insert into auth.users (id, email, aud, role) values (id, email, 'authenticated', 'authenticated');
	return id;
end;
$$;

-- Runs the rest of the transaction as that user through PostgREST's claims setting.
create or replace function tests.as_user(user_id uuid) returns void
language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
end;
$$;

create or replace function tests.as_anon() returns void
language plpgsql as $$
begin
	perform set_config('role', 'anon', true);
	perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
end;
$$;

create or replace function tests.as_owner() returns void
language plpgsql as $$
begin
	perform set_config('role', 'postgres', true);
	perform set_config('request.jwt.claims', '', true);
end;
$$;

create or replace function tests.add_device(owner uuid) returns uuid
language plpgsql as $$
declare
	id uuid := tests.uuid7();
begin
	insert into public.devices (user_id, id, created_at, label, platform) values (owner, id, now(), 'test', 'test');
	return id;
end;
$$;

-- Accepts the version currently required, whichever a test has published.
create or replace function tests.add_consent(owner uuid, device uuid) returns void
language sql as $$
	insert into public.privacy_consents (user_id, device_id, consented_at, policy_version)
	select owner, device, now(), version from public.privacy_policy_versions
	where requires_reconsent order by published_at desc limit 1;
$$;

-- A user with one device and the current consent, ready to write logs.
create or replace function tests.ready_user(email text) returns uuid
language plpgsql as $$
declare
	owner uuid := tests.create_user(email);
begin
	perform tests.add_consent(owner, tests.add_device(owner));
	return owner;
end;
$$;

create or replace function tests.device_of(owner uuid) returns uuid
language sql stable as $$
	select id from public.devices where user_id = owner order by created_at, id limit 1;
$$;

-- One valid answer row; tests override single columns through jsonb.
create or replace function tests.review(owner uuid, overrides jsonb default '{}') returns jsonb
language sql volatile as $$
	select jsonb_build_object(
		'user_id', owner, 'id', tests.uuid7(), 'device_id', tests.device_of(owner), 'run_id', null,
		'client_ts', now(), 'ms_total', 3000, 'ms_to_first_key', 2000, 'ms_typing', 500,
		'local_day', current_date, 'level', 2, 'deleted_chars', 0, 'option_changes', 0, 'option_count', null,
		'answer_rules_version', 1, 'set_correct', null, 'set_threshold', null, 'content_version', 1,
		'engine_version', 1, 'correct', true, 'timed_out', false, 'interrupted', false, 'unknown', false,
		'content_id', 'dk', 'mode', 'code2region', 'context', 'daily', 'level_source', 'auto',
		'input_mode', 'keyboard', 'match_type', 'exact', 'question_type', 'typed', 'raw_answer', 'denpasar',
		'accepted_area_id', null, 'prompt_area_id', null, 'confused_with', null, 'drill_pair_with', null,
		'tz', 'Asia/Makassar', 'typo_cost', 0, 'key_gaps_ms', jsonb_build_array(100), 'set_items', null
	) || overrides;
$$;

-- Inserts tests.review rows through the policies of the current role; a resend is skipped like the client's.
create or replace function tests.insert_reviews(rows jsonb) returns void
language sql as $$
	insert into public.review_logs (
		user_id, id, device_id, run_id, client_ts, ms_total, ms_to_first_key, ms_typing, local_day, level,
		deleted_chars, option_changes, option_count, answer_rules_version, set_correct, set_threshold,
		content_version, engine_version, correct, timed_out, interrupted, unknown, content_id, mode, context,
		level_source, input_mode, match_type, question_type, raw_answer, accepted_area_id, prompt_area_id,
		confused_with, drill_pair_with, tz, typo_cost, key_gaps_ms, set_items
	)
	select
		user_id, id, device_id, run_id, client_ts, ms_total, ms_to_first_key, ms_typing, local_day, level,
		deleted_chars, option_changes, option_count, answer_rules_version, set_correct, set_threshold,
		content_version, engine_version, correct, timed_out, interrupted, unknown, content_id, mode, context,
		level_source, input_mode, match_type, question_type, raw_answer, accepted_area_id, prompt_area_id,
		confused_with, drill_pair_with, tz, typo_cost, key_gaps_ms, set_items
	from jsonb_populate_recordset(null::public.review_logs, rows)
	on conflict (user_id, id) do nothing;
$$;

grant execute on all functions in schema tests to anon, authenticated;

select plan(1);
select pass('test helpers are installed');
select * from finish();
