#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_PATH="$1"
MONGO_URI="${2:-mongodb://localhost:27017}"

echo "Restoring from $ARCHIVE_PATH -> $MONGO_URI"
exec mongorestore --uri="$MONGO_URI" --archive="$ARCHIVE_PATH" --gzip

