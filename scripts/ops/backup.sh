#!/usr/bin/env bash
# Weekly backup: dump and encrypt in one pipe, so no plain dump ever touches the disk.
# Only the public age key is needed here; the private key never lives in CI.
set -euo pipefail

output="${1:?usage: backup.sh OUTPUT_FILE}"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is required}"

trap 'rm -f "$output"' ERR
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" |
	age --recipient "$BACKUP_AGE_RECIPIENT" --output "$output"
