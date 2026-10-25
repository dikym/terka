-- Cek Ingatan: a run kind and an answer context for the test offered after a long break.
alter table practice_runs drop constraint practice_runs_kind_check;
alter table practice_runs add constraint practice_runs_kind_check
	check (kind in ('daily', 'focused', 'challenge', 'kilat', 'placement', 'setrecall', 'special', 'recheck'));

alter table review_logs drop constraint review_logs_context_check;
alter table review_logs add constraint review_logs_context_check
	check (context in ('intro', 'daily', 'drill', 'focused', 'challenge', 'kilat', 'placement', 'setrecall', 'special', 'recheck'));
