#!/usr/bin/env bash

set -evxo pipefail

cache restore "nixpkgs-last-successful-sha"

LAST_SHA=$(cat "nixpkgs-last-successful-sha" || echo '$SEMAPHORE_GIT_SHA')
SHA_SHORT=$(git rev-parse --short=8 "$SEMAPHORE_GIT_SHA")
AUTHOR_EMAIL=$(git show -s --format='%ae' "$SEMAPHORE_GIT_SHA")
ALL_AUTHORS=$(git log  --format="%ae" $LAST_SHA..$SEMAPHORE_GIT_SHA | sort | uniq | paste -sd "," -)

cat <<EOF >payload.json
{
  "url": "webhooks/webhook/nixpkgs-replit",
  "method": "POST",
  "body": {
    "secret": "$SPIN_SECRET",
    "parameters": {
      "sha": "$SEMAPHORE_GIT_SHA",
      "sha_range": "$LAST_SHA...$SEMAPHORE_GIT_SHA",
      "sha_short": "$SHA_SHORT",
      "last_author": "$AUTHOR_EMAIL",
      "all_authors": "$ALL_AUTHORS",
      "rollback_pipeline": "webhooks/webhook/nixpkgs-replit-rollback",
      "scratch": "false",
    }
  }
}
EOF

curl --fail -X POST \
  -H "WEBHOOK_AUTH" \
  -H "content-type: application/json" \
  -d @payload.json \
    $WEBHOOK_URL

git rev-parse --verify $SEMAPHORE_GIT_SHA >"nixpkgs-last-successful-sha"
cache delete "nixpkgs-last-successful-sha"
cache store "nixpkgs-last-successful-sha" "nixpkgs-last-successful-sha"