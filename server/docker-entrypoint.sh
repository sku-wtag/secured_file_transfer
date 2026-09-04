#!/bin/sh
set -e

if [ "$(id -u)" = '0' ]; then
  mkdir -p "$BLOB_ROOT"
  chown node:node "$BLOB_ROOT"
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
