#!/bin/sh
set -e

: "${BACKEND_URL:=http://backend:3002}"
export BACKEND_URL

envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec "$@"
