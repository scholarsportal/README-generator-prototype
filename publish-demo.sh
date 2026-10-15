#!/usr/bin/env bash
#
# Builds the static demo and publishes it to the gh-pages branch.
#
# For when GitHub Actions is unavailable: this does by hand what
# .github/workflows/pages.yml would do in CI. Run it from the project root
# whenever you want the published demo to catch up with your branch.
#
#   ./publish-demo.sh              build from the current branch and push
#   ./publish-demo.sh --dry-run    build only, print where it is, push nothing
#   ./publish-demo.sh --ref sep_22 build from a specific branch or tag
#
# It builds from what is COMMITTED, not your working tree, so uncommitted edits
# are not published by accident. Commit first if you want them included.

set -euo pipefail

DRY_RUN=0
REF=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --ref)     REF="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

die() { echo "" >&2; echo "FAILED: $*" >&2; exit 1; }

command -v git >/dev/null  || die "git is not installed."
command -v npm >/dev/null  || die "npm is not installed."

git rev-parse --git-dir >/dev/null 2>&1 || die "not inside a git repository."
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

[ -f package.json ] || die "no package.json at the repository root ($ROOT)."
[ -d lib/demo ]     || die "lib/demo is missing — apply the demo patch first."

REF="${REF:-$(git rev-parse --abbrev-ref HEAD)}"
git rev-parse --verify --quiet "$REF" >/dev/null || die "no such ref: $REF"

REMOTE="$(git remote get-url origin)" || die "no 'origin' remote."
# Repo name drives basePath: GitHub Pages serves a project site from /<repo>/.
REPO_NAME="$(basename -s .git "$REMOTE")"
OWNER="$(basename "$(dirname "$REMOTE")" | sed 's/.*://')"

# Warn, but do not block: the build uses the committed ref either way.
if ! git diff --quiet HEAD 2>/dev/null; then
  echo "note: you have uncommitted changes; building from $REF as committed."
fi

if [ "$DRY_RUN" -eq 1 ]; then
  # Keep the build around so it can be previewed; put it outside the repo so
  # it can never be committed by accident.
  WORK="${TMPDIR:-/tmp}/demo-build"
  rm -rf "$WORK"; mkdir -p "$WORK"
else
  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT
fi

echo "repo        $OWNER/$REPO_NAME"
echo "ref         $REF"
echo "basePath    /$REPO_NAME"
echo "workdir     $WORK"
echo

echo "→ exporting $REF"
git archive "$REF" | tar -x -C "$WORK"

cd "$WORK"

# Static export cannot build with route handlers present: they read
# request.url, so Next refuses to prerender them. They are unused in demo mode.
echo "→ removing app/api (not exportable; unused in demo mode)"
rm -rf app/api

echo "→ npm ci"
npm ci --silent

echo "→ building static demo"
NEXT_PUBLIC_DEMO=1 NEXT_PUBLIC_BASE_PATH="/$REPO_NAME" npx next build

[ -d out ] || die "the build produced no out/ directory."
[ -f out/index.html ] || die "out/index.html is missing — the export did not complete."

# Jekyll ignores directories starting with an underscore, which would discard
# _next/ — the entire JavaScript bundle.
touch out/.nojekyll

# Sanity: the fixture must be in the bundle, or the demo loads empty.
if ! grep -rqs "Transit Station Air Quality" out/; then
  die "the demo fixture is not in the build. Check lib/demo/fixture.json."
fi

SIZE="$(du -sh out | cut -f1)"
echo
echo "built  $SIZE  in $WORK/out"

if [ "$DRY_RUN" -eq 1 ]; then
  echo
  echo "Dry run — nothing pushed. Preview it with:"
  echo "  npx serve $WORK/out"
  echo
  echo "Note the demo expects to be served under /$REPO_NAME/, so a bare"
  echo "'serve out' shows an unstyled page. That is the basePath, not a bug."
  exit 0
fi

echo
echo "→ publishing to gh-pages"
cd out
git init -q -b gh-pages
git add -A
git -c user.email=demo@local -c user.name="demo build" \
    commit -q -m "Demo build from $REF ($(git -C "$ROOT" rev-parse --short "$REF"))"
git remote add origin "$REMOTE"
git push -f -q origin gh-pages

echo
echo "Pushed to gh-pages."
echo
echo "First time only — set the source:"
echo "  https://github.com/$OWNER/$REPO_NAME/settings/pages"
echo "  Source → Deploy from a branch → gh-pages → / (root)"
echo
echo "Then the site is at:"
echo "  https://$OWNER.github.io/$REPO_NAME/"
