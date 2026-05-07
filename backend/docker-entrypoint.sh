#!/bin/sh
set -e

alembic upgrade head
python seed.py
exec supervisord -n -c /app/supervisord.conf
