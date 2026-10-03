-- Postgres 17 (local stack); on delete set null (column list) needs 15 or later.
create extension if not exists pg_cron;

create domain public.uuid_v7 as uuid
	check (substr(value::text, 15, 1) = '7' and substr(value::text, 20, 1) in ('8', '9', 'a', 'b'));
create domain public.scope_level as text
	check (value in ('national', 'group', 'province'));
create domain public.card_mode as text
	check (value in ('code2region', 'region2code', 'setrecall', 'special2holder', 'holder2special'));
create domain public.content_ref as text
	check (value ~ '^[a-z0-9-]{1,32}$');

-- A foreign key to this table replaces a per-row read of pg_timezone_names.
create table public.timezones (name text primary key);
insert into public.timezones (name) select name from pg_timezone_names;

create table public.privacy_policy_versions (
	version text primary key,
	published_at timestamptz not null,
	requires_reconsent boolean not null,
	summary_url text not null
);
insert into public.privacy_policy_versions (version, published_at, requires_reconsent, summary_url)
values ('2026-10-01', '2026-10-01T00:00:00Z', true, 'https://terka.my.id/privasi');

create table public.service_flags (
	id smallint primary key check (id = 1),
	updated_at timestamptz not null default now(),
	signups_open boolean not null default true
);
insert into public.service_flags (id) values (1);

create table public.usage_daily (
	user_id uuid not null references auth.users (id) on delete cascade,
	received_day date not null,
	row_count integer not null,
	table_name text not null,
	primary key (user_id, received_day, table_name)
);

create table public.usage_totals (
	user_id uuid primary key references auth.users (id) on delete cascade,
	row_count integer not null
);
