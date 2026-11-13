#!/usr/bin/env bash
# 兼容入口：统一脚本见 starcore.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$HERE/starcore.sh" install "$@"
