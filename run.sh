#!/usr/bin/env bash
# Serve the project folder and print the URL. Stop with Ctrl+C.
cd "$(dirname "$0")" || exit 1
echo "Open: http://localhost:8004"
exec python3 -m http.server 8004
