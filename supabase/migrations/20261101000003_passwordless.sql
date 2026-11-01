-- Sign-in is Google or an email code, but the Auth API still accepts a password at sign-up. A
-- stranger could sign up with someone's address and a password, and that password would keep working
-- after the owner confirms the address with their own code. Auth also gives every code sign-up a
-- random password, so passwords cannot be refused on insert. Confirming an address drops whatever
-- password came with it, and a confirmed account never gets a password afterwards.
create function public.passwordless() returns trigger
language plpgsql set search_path = '' as $$
begin
	if old.email_confirmed_at is null and new.email_confirmed_at is not null then
		new.encrypted_password := '';
	elsif old.email_confirmed_at is not null
		and coalesce(new.encrypted_password, '') <> coalesce(old.encrypted_password, '') then
		raise exception using errcode = 'TK010', message = 'accounts have no password';
	end if;
	return new;
end;
$$;

create trigger passwordless before update on auth.users
	for each row execute function public.passwordless();

revoke all on function public.passwordless() from anon, authenticated, public;
