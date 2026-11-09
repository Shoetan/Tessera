#!/usr/bin/env bash
# Fills a running database with 100 synthetic people, in the same way a real
# registration would: valid national IDs (ticket 02) and a CREATED audit row
# per person (ticket 05), because it runs through the real PersonsService.
#
# Safe to run more than once: it only tops the database up to 100 people, so
# a rerun against an already-seeded database does nothing.
#
# Usage: scripts/seed.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "Building the project (the seed script runs against dist/, not src/)..."
pnpm build

echo "Seeding..."
node scripts/seed-persons.js
