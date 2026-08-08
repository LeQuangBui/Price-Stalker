#!/usr/bin/env bash
# Capture the screenshot matrix in scripts/screens.json.
#   ./scripts/capture.sh before https://price-stalker.com
#   ./scripts/capture.sh after  http://localhost:5173
#
# NOTE on the gstack browse CLI (verified against the real binary, not assumed):
#   - `viewport` takes a single "WxH" token, not two args.
#   - `screenshot <path>` is full-page by default; there is no --full-page flag.
#     (Use `screenshot --viewport <path>` if you ever want viewport-only.)
#   - The browse daemon is a persistent background server with its own cwd,
#     which does not track the caller's shell. Relative paths passed to it
#     (e.g. to `screenshot`) resolve against ITS cwd, not this script's, and
#     get rejected by its path-safety check ("Path must be within: ..."), so
#     every path handed to "$B" must be made absolute first.
set -euo pipefail

SIDE="${1:?usage: capture.sh <before|after> <base-url>}"
BASE="${2:?usage: capture.sh <before|after> <base-url>}"
B="$(~/.claude/skills/gstack/browse/bin/find-browse)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT="$FRONTEND_DIR/.screens/$SIDE"
MATRIX="$SCRIPT_DIR/screens.json"
mkdir -p "$OUT"

# Deterministic rendering: pin the theme, force reveal-on-scroll elements visible,
# and kill animation/transition/caret so two runs of the same page are identical.
settle() {
  "$B" storage set theme light
  "$B" storage set theme_pinned 1
  "$B" js "document.querySelectorAll('[data-reveal]').forEach(function(e){e.classList.add('is-visible')})"
  "$B" js "var s=document.createElement('style');s.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';document.head.appendChild(s)"
}

widths=$(python3 -c "import json,sys;print(' '.join(map(str,json.load(open('$MATRIX'))['widths'])))")
routes=$(python3 -c "import json;d=json.load(open('$MATRIX'));print('\n'.join(r['name']+' '+r['path'] for r in d['routes']))")

for w in $widths; do
  while read -r name path; do
    "$B" viewport "${w}x900"
    "$B" goto "$BASE$path"
    "$B" wait --networkidle
    settle
    "$B" screenshot "$OUT/$name-$w-light.png"
  done <<< "$routes"
done
echo "captured $SIDE -> $OUT"
