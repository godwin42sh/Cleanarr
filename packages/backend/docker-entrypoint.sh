#!/bin/sh
set -e

# Build DATABASE_URL from the individual Postgres variables when it is not set
# explicitly. This lets the password be defined ONCE (as POSTGRES_PASSWORD) and
# shared with the db container, instead of being duplicated inside a full
# connection string.
#
# If you use a password containing URL-reserved characters (@ : / ? # etc.) or
# an external/managed database, set DATABASE_URL directly and it will be used
# as-is.
if [ -z "${DATABASE_URL:-}" ]; then
  : "${POSTGRES_USER:?Set DATABASE_URL, or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB}"
  : "${POSTGRES_PASSWORD:?Set DATABASE_URL, or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB}"
  : "${POSTGRES_DB:?Set DATABASE_URL, or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB}"
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}?schema=public"
fi

echo "Applying database migrations…"
node node_modules/prisma/build/index.js migrate deploy

echo "Starting Cleanarr API…"
exec node dist/main.js
