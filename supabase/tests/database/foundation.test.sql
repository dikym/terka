begin;
select plan(11);

select ok('0190a000-0000-7000-8000-000000000001'::public.uuid_v7 is not null, 'a version 7 uuid fits uuid_v7');
select throws_ok(
	$$ select '0190a000-0000-4000-8000-000000000001'::public.uuid_v7 $$, '23514', null,
	'a version 4 uuid is refused by uuid_v7'
);
select throws_ok(
	$$ select '0190a000-0000-7000-c000-000000000001'::public.uuid_v7 $$, '23514', null,
	'a uuid with the wrong variant is refused by uuid_v7'
);
select throws_ok($$ select 'world'::public.scope_level $$, '23514', null, 'scope_level only takes national, group, province');
select throws_ok($$ select 'blindrecall'::public.card_mode $$, '23514', null, 'card_mode only takes the five modes');
select throws_ok($$ select 'DK'::public.content_ref $$, '23514', null, 'content_ref refuses upper case');
select throws_ok($$ select repeat('a', 33)::public.content_ref $$, '23514', null, 'content_ref refuses more than 32 characters');
select ok(exists (select 1 from public.timezones where name = 'Asia/Makassar'), 'timezones holds the IANA names');
select results_eq(
	$$ select version, requires_reconsent, summary_url from public.privacy_policy_versions $$,
	$$ values ('2026-10-01'::text, true, 'https://terka.my.id/privasi'::text) $$,
	'the first privacy policy version is seeded'
);
select results_eq($$ select id, signups_open from public.service_flags $$, $$ values (1::smallint, true) $$, 'one service flag row, signups open');
select throws_ok($$ insert into public.service_flags (id) values (2) $$, '23514', null, 'service_flags holds a single row');

select * from finish();
rollback;
