#!/usr/bin/env bash
# Construit une entrée autonome et minifie le CSS des templates `css`.
set -euo pipefail
entry="$1"; out="$2"
npx esbuild "src/$entry" --bundle --format=esm --target=es2020 \
  --minify --line-limit=1000 --legal-comments=none --outfile="/tmp/$out.raw.js"
python3 scripts/packcss.py "/tmp/$out.raw.js" "dist/$out.js"
