#!/bin/sh
# Starts the Next.js server and mirrors its stdout/stderr to Vector for log
# export (see vector-local.yaml), while keeping the container's real stdout
# working exactly as before (Railway's log viewer) and forwarding shutdown
# signals to the app explicitly -- necessary because the app can no longer be
# the directly-exec'd process once its output is piped through `tee`.
#
# VECTOR_URL unset/empty: skip the tee/vector entirely and run the app
# directly, so this is safe with no observability stack deployed.
set -e

if [ -z "${VECTOR_URL:-}" ]; then
  exec node_modules/.bin/next start
fi

# Save the real container stdout on fd 3 before the pipe below reassigns fd 1
# (tee's own stdout goes into the `| vector` pipe -- writing to the literal
# path /dev/stdout from inside tee would resolve to that same reassigned fd1,
# not the original stream, so it must target fd 3 explicitly -- verified with
# a standalone container test; the naive `tee ... /dev/stdout | vector` form
# silently produces no container-visible output at all).
exec 3>&1

FIFO="/tmp/app-log.fifo"
# rm -f first: /tmp persists across container restarts (e.g. a crash-loop
# under Railway's restartPolicyType=ON_FAILURE), so a FIFO from a previous
# attempt may already exist -- verified (in noesis-core, same pattern) that
# mkfifo failing here under `set -e` kills this entire script before the app
# even starts, permanently breaking the container on any restart after the
# first.
rm -f "$FIFO"
mkfifo "$FIFO"

node_modules/.bin/next start >"$FIFO" 2>&1 &
APP_PID=$!

tee <"$FIFO" /dev/fd/3 | vector --config vector-local.yaml --quiet &

trap 'kill -TERM "$APP_PID" 2>/dev/null; wait "$APP_PID"; exit 0' TERM INT

wait "$APP_PID"
