begin;
select plan(2);

-- One million answers across 1,000 accounts, loaded without the per-statement guards.
insert into auth.users (id, email, aud, role)
select gen_random_uuid(), 'load' || n || '@test.terka', 'authenticated', 'authenticated' from generate_series(1, 1000) n;
insert into public.devices (user_id, id, created_at, label, platform)
select id, tests.uuid7(), now(), 'load', 'load' from auth.users where email like 'load%@test.terka';
alter table public.review_logs disable trigger user;
insert into public.review_logs (
	user_id, id, device_id, client_ts, ms_total, local_day, level, deleted_chars, option_changes,
	answer_rules_version, content_version, engine_version, correct, timed_out, interrupted, unknown,
	content_id, mode, context, level_source, input_mode, match_type, question_type, tz, typo_cost
)
select d.user_id, tests.uuid7(), d.id, now(), 3000, current_date, 2, 0, 0, 1, 1, 1, true, false, false, false,
	'dk', 'code2region', 'daily', 'auto', 'keyboard', 'exact', 'typed', 'Asia/Makassar', 0
from public.devices d, generate_series(1, 1000)
where d.label = 'load';
-- The account that pulls has a long history and a cursor near its end, like a daily user mid-sync.
select set_config('tests.puller', (select user_id::text from public.devices where label = 'load' limit 1), true);
insert into public.review_logs (
	user_id, id, device_id, client_ts, ms_total, local_day, level, deleted_chars, option_changes,
	answer_rules_version, content_version, engine_version, correct, timed_out, interrupted, unknown,
	content_id, mode, context, level_source, input_mode, match_type, question_type, tz, typo_cost
)
select d.user_id, tests.uuid7(), d.id, now(), 3000, current_date, 2, 0, 0, 1, 1, 1, true, false, false, false,
	'dk', 'code2region', 'daily', 'auto', 'keyboard', 'exact', 'typed', 'Asia/Makassar', 0
from public.devices d, generate_series(1, 19000)
where d.user_id = current_setting('tests.puller')::uuid;
alter table public.review_logs enable trigger user;
analyze public.review_logs;
select set_config(
	'tests.cursor',
	(select (max(server_seq) - 100)::text from public.review_logs where user_id = current_setting('tests.puller')::uuid),
	true
);
select tests.as_user(current_setting('tests.puller')::uuid);

create function pg_temp.pull_plan() returns text
language plpgsql as $$
declare
	line text;
	plan text := '';
begin
	for line in explain select * from public.review_logs where server_seq > current_setting('tests.cursor')::bigint order by server_seq limit 1000 loop
		plan := plan || line || E'\n';
	end loop;
	return plan;
end;
$$;
select ok(
	pg_temp.pull_plan() ~ 'review_logs_pull' and pg_temp.pull_plan() !~ 'Seq Scan',
	'a pull of one account uses the (user_id, server_seq) index'
);

create function pg_temp.pull_ms() returns float8
language plpgsql as $$
declare
	started timestamptz := clock_timestamp();
begin
	perform * from public.review_logs where server_seq > current_setting('tests.cursor')::bigint order by server_seq limit 1000;
	return extract(epoch from clock_timestamp() - started) * 1000;
end;
$$;
select ok(pg_temp.pull_ms() < 50, 'a pull of one account takes under 50 ms among a million rows');

select * from finish();
rollback;
