#!/bin/sh
set -e
# Fix volume ownership at runtime — the named volume may have been
# created by a root-running container and the node user cannot write to it.
chown -R node:node /app/data
exec su-exec node "$@"
