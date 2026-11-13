#!/usr/bin/env bash
# 兼容入口：维护者发布沿用旧行为（sudo、完整检查、删除多余文件、root 属主）
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$HERE/starcore.sh" deploy --dir "$HERE" --sudo --delete --check --owner root:root --chmod a+rX "$@"
