#!/bin/sh
# 빌드 → gh-pages 브랜치로 배포 (GitHub Pages는 이 저장소의 gh-pages 브랜치를 본다)
# 사용: ./deploy.sh
set -e
cd "$(dirname "$0")"

python3 build.py

TMP_INDEX="${TMPDIR:-/tmp}/ai-office-gh-pages-index.$$"
rm -f "$TMP_INDEX"
GIT_INDEX_FILE="$TMP_INDEX"
export GIT_INDEX_FILE

git read-tree --empty
git add -f index.html manifest.json sw.js \
  icon-192.png icon-512.png icon-maskable-512.png \
  README.md LICENSE .nojekyll
TREE=$(git write-tree)

unset GIT_INDEX_FILE
rm -f "$TMP_INDEX"

# 직전 배포(gh-pages) 위에 쌓아 fast-forward로 올린다
PARENT_ARGS=""
if git fetch -q origin gh-pages 2>/dev/null; then
  PARENT=$(git rev-parse --verify -q origin/gh-pages || true)
  if [ -n "$PARENT" ]; then
    PARENT_ARGS="-p $PARENT"
  fi
fi

COMMIT=$(git -c user.name="ai-office" -c user.email="ai-office@users.noreply.github.com" \
  commit-tree "$TREE" $PARENT_ARGS -m "내 AI 오피스 배포 $(date +%Y-%m-%d_%H:%M)")

git push origin "$COMMIT:refs/heads/gh-pages"
echo "배포 완료 → https://cnddmlek-hash.github.io/ai-office/  (반영까지 30초~1분)"
