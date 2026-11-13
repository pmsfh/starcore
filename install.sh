#!/usr/bin/env bash
# 星核纪元安装脚本：选择最新开发版或最新稳定版
# 用法：bash install.sh [--mode main|release] [--dir 目录] [--yes]
set -euo pipefail

REPO="renlang119/starcore"
REPO_URL="https://github.com/${REPO}.git"
DIR="./starcore"
MODE=""
YES=0

say() { printf '%s\n' "$*"; }
die() { printf '[安装失败] %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
星核纪元安装脚本

用法：
  bash install.sh                  交互选择安装方式
  bash install.sh --mode main      最新开发版，main 分支最新提交，需要 Node.js
  bash install.sh --mode release   最新稳定版，最新 Release 的预构建产物
  bash install.sh --dir 目录       指定安装目录，默认 ./starcore

选项：
  -y, --yes    非交互安装，未指定 --mode 时按最新稳定版处理
  -h, --help   显示本帮助
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      [[ $# -ge 2 ]] || die "--mode 缺少参数"
      MODE="$2"
      shift 2
      ;;
    --dir)
      [[ $# -ge 2 ]] || die "--dir 缺少参数"
      DIR="$2"
      shift 2
      ;;
    -y | --yes)
      YES=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      die "未知参数：$1"
      ;;
  esac
done

choose_mode() {
  say "请选择安装方式："
  say "  1) 最新开发版：main 分支最新提交，包含尚未发布的改动"
  say "  2) 最新稳定版：GitHub 最新 Release，预构建产物"
  printf '输入 1 或 2 [2]：'
  read -r choice || choice="2"
  case "${choice:-2}" in
    1) MODE="main" ;;
    2) MODE="release" ;;
    *) die "无效选择：$choice" ;;
  esac
}

if [[ -z "$MODE" ]]; then
  if [[ $YES -eq 1 ]]; then
    MODE="release"
  else
    choose_mode
  fi
fi

case "$MODE" in
  main | release) ;;
  *) die "未知安装方式：$MODE，可选 main 或 release" ;;
esac

if [[ -e "$DIR" && -n "$(ls -A "$DIR" 2>/dev/null || true)" ]]; then
  die "目录已存在且非空：$DIR，请换一个目录或先手动清空"
fi
mkdir -p "$DIR"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

need() {
  command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1"
}

if [[ "$MODE" == "main" ]]; then
  need git
  need node
  need corepack
  node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=18)?0:1)' ||
    die "需要 Node.js 22.18 或更高版本，当前为 $(node -v)"
  say "正在获取 main 分支最新提交..."
  git clone --depth 1 "$REPO_URL" "$DIR"
  say "正在安装依赖并构建..."
  (cd "$DIR" && corepack pnpm install --frozen-lockfile && corepack pnpm build)
  COMMIT="$(git -C "$DIR" rev-parse --short HEAD)"
  VERSION="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$DIR/package.json" | head -1)"
  MODE_LABEL="最新开发版 main @ ${COMMIT}"
else
  need curl
  need unzip
  say "正在查询最新 Release..."
  TAG="$(curl -fsSIL -o /dev/null -w '%{url_effective}' "https://github.com/${REPO}/releases/latest" |
    sed -n 's#.*/tag/##p')"
  [[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "无法解析最新 Release，请检查网络后重试"
  ZIP="${TMP}/release.zip"
  say "正在下载 ${TAG} 构建产物..."
  curl -fL --progress-bar -o "$ZIP" \
    "https://github.com/${REPO}/releases/download/${TAG}/starcore-${TAG}-dist.zip" ||
    die "下载失败：${TAG} 没有找到构建产物包"
  unzip -q "$ZIP" -d "$DIR"
  VERSION="$(sed -n 's/.*name="app-version" content="\([^"]*\)".*/\1/p' "$DIR/dist/index.html" | head -1)"
  MODE_LABEL="最新稳定版 Release ${TAG}"
fi

[[ -f "$DIR/dist/index.html" ]] || die "安装产物缺少 dist/index.html"
ABS_DIR="$(cd "$DIR" && pwd)"

say ""
say "安装完成"
say "  方式：${MODE_LABEL}"
say "  版本：${VERSION}"
say "  目录：${ABS_DIR}"
say "  产物：${ABS_DIR}/dist"
if [[ "$MODE" == "main" ]]; then
  say "  开发预览：cd \"${ABS_DIR}\" && corepack pnpm dev"
fi
say "  本地预览：python3 -m http.server 8080 -d \"${ABS_DIR}/dist\""
say "  部署：将 dist/ 目录内容同步到站点目录"
