-- Columns run uuid, 8-byte, 4-byte and date, 2-byte, boolean, then variable length, to avoid padding.

-- Set answers are stored as tuples [raw_answer, accepted_area_id, match_type, typo_cost, confused_with].
create function public.valid_set_items(items jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
	item jsonb;
begin
	if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 64 then
		return false;
	end if;
	for item in select value from jsonb_array_elements(items) loop
		if jsonb_typeof(item) <> 'array' or jsonb_array_length(item) <> 5 then
			return false;
		end if;
		if not (
			(jsonb_typeof(item -> 0) = 'null' or (jsonb_typeof(item -> 0) = 'string' and char_length(item ->> 0) <= 120))
			and (jsonb_typeof(item -> 1) = 'null' or (jsonb_typeof(item -> 1) = 'string' and (item ->> 1) ~ '^[a-z0-9-]{1,32}$'))
			and jsonb_typeof(item -> 2) = 'string' and (item ->> 2) in ('exact', 'variant', 'typo', 'unverified', 'none')
			and jsonb_typeof(item -> 3) = 'number' and (item ->> 3)::numeric between 0 and 3
			and (jsonb_typeof(item -> 4) = 'null' or (jsonb_typeof(item -> 4) = 'string' and (item ->> 4) ~ '^[a-z0-9-]{1,32}$'))
		) then
			return false;
		end if;
	end loop;
	return true;
end;
$$;

create table public.devices (
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	id public.uuid_v7 not null,
	created_at timestamptz not null,
	last_seen_at timestamptz not null default now(),
	label text not null check (char_length(label) <= 40),
	platform text not null check (char_length(platform) <= 200),
	primary key (user_id, id)
);

create table public.user_settings (
	user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
	updated_by_device public.uuid_v7 not null,
	updated_at timestamptz not null,
	received_at timestamptz not null default now(),
	special_enabled boolean not null default false,
	active_scope_level public.scope_level not null,
	active_scope_id public.content_ref,
	check ((active_scope_level = 'national') = (active_scope_id is null)),
	foreign key (user_id, updated_by_device) references public.devices (user_id, id) on delete no action
);

create table public.privacy_consents (
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	device_id public.uuid_v7 not null,
	consented_at timestamptz not null,
	received_at timestamptz not null default now(),
	policy_version text not null references public.privacy_policy_versions (version) on delete restrict,
	primary key (user_id, policy_version),
	foreign key (user_id, device_id) references public.devices (user_id, id) on delete no action
);

-- Filled by triggers only, so a closed session gets a fresh number and clients need no sequence grant.
create sequence public.practice_runs_server_seq;

create table public.practice_runs (
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	id public.uuid_v7 not null,
	device_id public.uuid_v7 not null,
	started_at timestamptz not null,
	ended_at timestamptz,
	received_at timestamptz not null default now(),
	server_seq bigint not null,
	estimated_ms integer check (estimated_ms >= 0),
	active_ms integer check (active_ms >= 0),
	local_day date not null,
	planned_count smallint check (planned_count >= 0),
	answered smallint check (answered >= 0),
	correct smallint check (correct >= 0 and correct <= answered),
	score smallint check (score >= 0),
	kind text not null check (kind in ('daily', 'focused', 'challenge', 'kilat', 'placement', 'setrecall', 'special')),
	scope_level public.scope_level not null,
	scope_id public.content_ref,
	placement_level text check (placement_level in ('pemula', 'menengah', 'mahir', 'ahli')),
	check (ended_at >= started_at),
	primary key (user_id, id),
	foreign key (user_id, device_id) references public.devices (user_id, id) on delete no action
);
create index practice_runs_pull on public.practice_runs (user_id, server_seq);

create table public.review_logs (
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	id public.uuid_v7 not null,
	device_id public.uuid_v7 not null,
	run_id public.uuid_v7,
	client_ts timestamptz not null,
	received_at timestamptz not null default now(),
	server_seq bigint generated always as identity,
	ms_total integer not null check (ms_total between 0 and 3600000),
	ms_to_first_key integer check (ms_to_first_key >= 0),
	ms_typing integer check (ms_typing >= 0),
	local_day date not null,
	level smallint not null check (level between 1 and 3),
	deleted_chars smallint not null check (deleted_chars >= 0),
	option_changes smallint not null check (option_changes >= 0),
	option_count smallint check (option_count >= 0),
	answer_rules_version smallint not null check (answer_rules_version > 0),
	set_correct smallint check (set_correct >= 0),
	set_threshold smallint check (set_threshold >= 0),
	content_version smallint not null check (content_version > 0),
	engine_version smallint not null check (engine_version > 0),
	correct boolean,
	timed_out boolean not null,
	interrupted boolean not null,
	unknown boolean not null,
	content_id public.content_ref not null,
	mode public.card_mode not null,
	context text not null check (context in ('intro', 'daily', 'drill', 'focused', 'challenge', 'kilat', 'placement', 'setrecall', 'special')),
	level_source text not null check (level_source in ('auto', 'manual_up', 'manual_down')),
	input_mode text not null check (input_mode in ('keyboard', 'touch')),
	match_type text not null check (match_type in ('exact', 'variant', 'typo', 'unverified', 'none')),
	question_type text not null check (question_type in ('intro_read', 'choice', 'truefalse', 'oddoneout', 'typed', 'setrecall')),
	raw_answer text check (char_length(raw_answer) <= 120),
	accepted_area_id public.content_ref,
	prompt_area_id public.content_ref,
	confused_with public.content_ref,
	drill_pair_with public.content_ref,
	tz text not null references public.timezones (name) on delete no action,
	typo_cost numeric(3, 1) not null check (typo_cost >= 0 and typo_cost <= 3),
	key_gaps_ms smallint[] check (
		cardinality(key_gaps_ms) <= 120
		and array_position(key_gaps_ms, null) is null
		and 0 <= all (key_gaps_ms)
		and 30000 >= all (key_gaps_ms)
	),
	set_items jsonb check (public.valid_set_items(set_items) and pg_column_size(set_items) <= 32768),
	check ((mode in ('special2holder', 'holder2special')) = (content_id ~ '^cd-[0-9]{1,3}-[a-z0-9-]+$')),
	check ((correct is null) = (match_type = 'unverified' or question_type = 'intro_read')),
	check ((match_type = 'typo') = (typo_cost > 0)),
	check (
		(set_correct is not null and set_threshold is not null and set_items is not null)
			= (mode = 'setrecall' and context <> 'intro')
		and (set_correct is null) = (set_threshold is null)
		and (set_correct is null) = (set_items is null)
	),
	check (local_day <= (received_at at time zone 'UTC')::date + 1),
	primary key (user_id, id),
	foreign key (user_id, device_id) references public.devices (user_id, id) on delete no action,
	foreign key (user_id, run_id) references public.practice_runs (user_id, id) on delete set null (run_id)
);
create index review_logs_pull on public.review_logs (user_id, server_seq);
-- Deleting a session sets run_id to null in its answers; without this, account deletion scans per session.
create index review_logs_run on public.review_logs (user_id, run_id) where run_id is not null;

create table public.review_voids (
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	id public.uuid_v7 not null,
	device_id public.uuid_v7 not null,
	review_id public.uuid_v7 not null,
	client_ts timestamptz not null,
	received_at timestamptz not null default now(),
	server_seq bigint generated always as identity,
	primary key (user_id, id),
	unique (user_id, review_id),
	foreign key (user_id, device_id) references public.devices (user_id, id) on delete no action,
	foreign key (user_id, review_id) references public.review_logs (user_id, id) on delete cascade
);
create index review_voids_pull on public.review_voids (user_id, server_seq);

create table public.card_events (
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	id public.uuid_v7 not null,
	device_id public.uuid_v7 not null,
	client_ts timestamptz not null,
	received_at timestamptz not null default now(),
	server_seq bigint generated always as identity,
	local_day date not null,
	content_id public.content_ref not null,
	mode public.card_mode not null,
	kind text not null check (kind in ('suspend', 'unsuspend')),
	check ((mode in ('special2holder', 'holder2special')) = (content_id ~ '^cd-[0-9]{1,3}-[a-z0-9-]+$')),
	primary key (user_id, id),
	foreign key (user_id, device_id) references public.devices (user_id, id) on delete no action
);
create index card_events_pull on public.card_events (user_id, server_seq);

create table public.sightings (
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	id public.uuid_v7 not null,
	device_id public.uuid_v7 not null,
	client_ts timestamptz not null,
	received_at timestamptz not null default now(),
	server_seq bigint generated always as identity,
	local_day date not null,
	region_id public.content_ref not null,
	primary key (user_id, id),
	foreign key (user_id, device_id) references public.devices (user_id, id) on delete no action
);
create index sightings_pull on public.sightings (user_id, server_seq);

create table public.fact_views (
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	id public.uuid_v7 not null,
	device_id public.uuid_v7 not null,
	run_id public.uuid_v7,
	client_ts timestamptz not null,
	received_at timestamptz not null default now(),
	server_seq bigint generated always as identity,
	local_day date not null,
	fact_id public.content_ref not null,
	primary key (user_id, id),
	foreign key (user_id, device_id) references public.devices (user_id, id) on delete no action,
	foreign key (user_id, run_id) references public.practice_runs (user_id, id) on delete set null (run_id)
);
create index fact_views_pull on public.fact_views (user_id, server_seq);
create index fact_views_run on public.fact_views (user_id, run_id) where run_id is not null;

create table public.fsrs_params (
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	id public.uuid_v7 not null,
	device_id public.uuid_v7 not null,
	activated_at timestamptz,
	created_at timestamptz not null,
	received_at timestamptz not null default now(),
	server_seq bigint generated always as identity,
	trained_through_seq bigint,
	logloss float8 not null,
	rmse float8 not null,
	baseline_logloss float8 not null,
	baseline_rmse float8 not null,
	trained_review_count integer not null check (trained_review_count > 0),
	algorithm text not null check (algorithm = 'fsrs-6'),
	status text not null check (status in ('active', 'rejected')),
	library_version text not null check (char_length(library_version) <= 64),
	weights float8[] not null check (cardinality(weights) = 21 and array_position(weights, null) is null),
	training_set_hash bytea not null check (octet_length(training_set_hash) = 32),
	check ((status = 'active') = (activated_at is not null)),
	primary key (user_id, id),
	foreign key (user_id, device_id) references public.devices (user_id, id) on delete no action
);
create index fsrs_params_pull on public.fsrs_params (user_id, server_seq);
create index fsrs_params_active on public.fsrs_params (user_id, activated_at desc) where status = 'active';

create table public.card_notes (
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	updated_by_device public.uuid_v7 not null,
	updated_at timestamptz not null,
	received_at timestamptz not null default now(),
	content_id public.content_ref not null,
	body text not null check (char_length(body) <= 280),
	primary key (user_id, content_id),
	foreign key (user_id, updated_by_device) references public.devices (user_id, id) on delete no action
);
