begin;
select plan(4);

select set_config('tests.a', tests.create_user('password-a@test.terka')::text, true);
update auth.users set encrypted_password = 'set-at-sign-up' where id = current_setting('tests.a')::uuid;
select is(
	(select encrypted_password from auth.users where id = current_setting('tests.a')::uuid), 'set-at-sign-up',
	'an unconfirmed address may still get a password, as Auth does for every code sign-up'
);
update auth.users set email_confirmed_at = now() where id = current_setting('tests.a')::uuid;
select is(
	(select encrypted_password from auth.users where id = current_setting('tests.a')::uuid), '',
	'confirming the address drops the password that came with it'
);
select throws_ok(
	format('update auth.users set encrypted_password = %L where id = %L', 'later', current_setting('tests.a')),
	'TK010', null, 'a confirmed account cannot get a password'
);
select lives_ok(
	format('update auth.users set last_sign_in_at = now() where id = %L', current_setting('tests.a')),
	'other updates to a confirmed account pass'
);

select * from finish();
rollback;
