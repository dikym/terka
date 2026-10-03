-- Supabase grants new public tables to anon and authenticated by default; every grant here is explicit.

-- The newest version that asks for consent again is the one every account must have accepted.
create function public.has_current_consent() returns boolean
language sql stable security definer set search_path = '' as $$
	select coalesce((
		select exists (
			select 1 from public.privacy_consents c
			where c.user_id = auth.uid() and c.policy_version = v.version
		)
		from public.privacy_policy_versions v
		where v.requires_reconsent
		order by v.published_at desc
		limit 1
	), false);
$$;

create function public.delete_user() returns void
language sql security definer set search_path = '' as $$
	delete from auth.users where id = auth.uid();
$$;


do $$
declare
	name text;
begin
	foreach name in array array[
		'timezones', 'privacy_policy_versions', 'service_flags', 'usage_daily', 'usage_totals',
		'devices', 'user_settings', 'privacy_consents', 'practice_runs', 'review_logs',
		'review_voids', 'card_events', 'sightings', 'fact_views', 'fsrs_params', 'card_notes'
	] loop
		execute format('alter table public.%I enable row level security', name);
		execute format('revoke all on table public.%I from anon, authenticated, public', name);
	end loop;
end;
$$;
revoke all on sequence public.practice_runs_server_seq from anon, authenticated, public;

revoke all on function public.has_current_consent() from anon, public;
revoke all on function public.delete_user() from anon, public;
revoke all on function public.valid_set_items(jsonb) from anon, public;
grant execute on function public.has_current_consent() to authenticated;
grant execute on function public.delete_user() to authenticated;
grant execute on function public.valid_set_items(jsonb) to authenticated;

create policy read_versions on public.privacy_policy_versions for select to authenticated using (true);
grant select on public.privacy_policy_versions to authenticated;

do $$
declare
	name text;
begin
	foreach name in array array[
		'devices', 'user_settings', 'privacy_consents', 'practice_runs', 'review_logs',
		'review_voids', 'card_events', 'sightings', 'fact_views', 'fsrs_params', 'card_notes'
	] loop
		execute format(
			'create policy read_own on public.%I for select to authenticated using (user_id = (select auth.uid()))',
			name
		);
	end loop;
	foreach name in array array['devices', 'user_settings', 'privacy_consents', 'card_notes'] loop
		execute format(
			'create policy insert_own on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
			name
		);
	end loop;
	foreach name in array array[
		'practice_runs', 'review_logs', 'review_voids', 'card_events', 'sightings', 'fact_views', 'fsrs_params'
	] loop
		execute format(
			'create policy insert_own on public.%I for insert to authenticated'
			' with check (user_id = (select auth.uid()) and (select public.has_current_consent()))',
			name
		);
	end loop;
	foreach name in array array['devices', 'user_settings', 'practice_runs', 'card_notes'] loop
		execute format(
			'create policy update_own on public.%I for update to authenticated'
			' using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
			name
		);
	end loop;
end;
$$;

-- Column grants keep server-filled columns (received_at, server_seq, last_seen_at) out of client reach.
grant select on public.devices, public.user_settings, public.privacy_consents, public.practice_runs,
	public.review_logs, public.review_voids, public.card_events, public.sightings, public.fact_views,
	public.fsrs_params, public.card_notes to authenticated;

grant insert (user_id, id, created_at, label, platform) on public.devices to authenticated;
grant update (last_seen_at) on public.devices to authenticated;

grant insert (user_id, updated_by_device, updated_at, special_enabled, active_scope_level, active_scope_id),
	update (updated_by_device, updated_at, special_enabled, active_scope_level, active_scope_id)
	on public.user_settings to authenticated;

grant insert (user_id, device_id, consented_at, policy_version) on public.privacy_consents to authenticated;

grant insert (user_id, id, device_id, started_at, estimated_ms, local_day, planned_count, kind, scope_level, scope_id),
	update (ended_at, active_ms, answered, correct, score, placement_level)
	on public.practice_runs to authenticated;

grant insert (
	user_id, id, device_id, run_id, client_ts, ms_total, ms_to_first_key, ms_typing, local_day, level,
	deleted_chars, option_changes, option_count, answer_rules_version, set_correct, set_threshold,
	content_version, engine_version, correct, timed_out, interrupted, unknown, content_id, mode, context,
	level_source, input_mode, match_type, question_type, raw_answer, accepted_area_id, prompt_area_id,
	confused_with, drill_pair_with, tz, typo_cost, key_gaps_ms, set_items
) on public.review_logs to authenticated;

grant insert (user_id, id, device_id, review_id, client_ts) on public.review_voids to authenticated;
grant insert (user_id, id, device_id, client_ts, local_day, content_id, mode, kind) on public.card_events to authenticated;
grant insert (user_id, id, device_id, client_ts, local_day, region_id) on public.sightings to authenticated;
grant insert (user_id, id, device_id, run_id, client_ts, local_day, fact_id) on public.fact_views to authenticated;

grant insert (
	user_id, id, device_id, activated_at, created_at, trained_through_seq, logloss, rmse, baseline_logloss,
	baseline_rmse, trained_review_count, algorithm, status, library_version, weights, training_set_hash
) on public.fsrs_params to authenticated;

grant insert (user_id, updated_by_device, updated_at, content_id, body),
	update (updated_by_device, updated_at, body)
	on public.card_notes to authenticated;
