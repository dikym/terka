#!/usr/bin/env bash
# Daily size alarm: fails above half the Pro trigger, so the owner gets a GitHub notification.
# The default repeats DB_SIZE_ALARM_BYTES in src/rules.ts.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
limit="${DB_SIZE_LIMIT:-157286400}"

size=$(psql "$DATABASE_URL" --no-psqlrc --tuples-only --no-align \
	--command "select pg_database_size(current_database())")
echo "$size bytes (limit $limit)"
if [ "$size" -gt "$limit" ]; then
	echo "database is over the alarm size" >&2
	exit 1
fi
