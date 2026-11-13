#!/usr/bin/env bash
# 星核纪元统一脚本：环境检测、安装、部署
# 用法：bash starcore.sh [install|deploy|up|check] [选项]
set -euo pipefail

REPO="renlang119/starcore"
REPO_URL="https://github.com/${REPO}.git"
SITE_URL_DEFAULT=""

COMMAND=""
SOURCE=""
DIR="./starcore"
DEST=""
URL=""
OWNER=""
CHMOD=""
USE_SUDO=0
DO_DELETE=0
DO_BACKUP=0
DO_CHECK=0
NO_URL=0
DEPS_MODE="ask" # ask | yes | no
DRY_RUN=0
YES=0

say() { printf '%s\n' "$*"; }
warn() { printf '[提示] %s\n' "$*" >&2; }
die() { printf '[失败] %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
星核纪元统一脚本

用法：
  bash starcore.sh                      交互选择操作
  bash starcore.sh install              安装并构建
  bash starcore.sh deploy               发布已有构建
  bash starcore.sh up                   安装并发布
  bash starcore.sh check                只做环境检测

安装选项：
  --source main|release   安装来源，默认交互选择
  --dir PATH              安装目录，默认 ./starcore

发布选项：
  --dest PATH             发布目标目录，必填或交互输入
  --url URL               站点地址，提供后注入分享元数据并核验线上
  --no-url                不使用配置文件里的站点地址
  --sudo                  允许 sudo 提权
  --no-sudo               不使用 sudo
  --owner USER:GROUP      发布后修改目录属主
  --chmod MODE            发布后修改目录权限
  --delete                同步时删除目标目录多余文件
  --no-delete             不删除目标目录多余文件
  --backup                发布前备份目标目录
  --check                 发布前运行完整检查
  --no-check              不运行完整检查

通用选项：
  --install-deps          允许自动安装缺失的系统组件
  --no-install-deps       只报告缺失，不安装
  --dry-run               只打印将执行的命令
  -y, --yes               非交互，使用默认值
  -h, --help              显示本帮助

环境变量：
  DEPLOY_DEST / DEPLOY_URL 可作为 --dest / --url 的默认值
  配置文件：./.deploy.env 或 ~/.config/starcore/deploy.env

远程发布暂未实现，将在第二阶段加入。
EOF
}

# ---------- 参数 ----------

while [[ $# -gt 0 ]]; do
  case "$1" in
    install | deploy | up | check)
      [[ -z "$COMMAND" ]] || die "只能指定一个操作：$COMMAND 与 $1"
      COMMAND="$1"
      shift
      ;;
    --source | --mode)
      [[ $# -ge 2 ]] || die "--source 缺少参数"
      SOURCE="$2"
      shift 2
      ;;
    --dir)
      [[ $# -ge 2 ]] || die "--dir 缺少参数"
      DIR="$2"
      shift 2
      ;;
    --dest)
      [[ $# -ge 2 ]] || die "--dest 缺少参数"
      DEST="$2"
      shift 2
      ;;
    --url)
      [[ $# -ge 2 ]] || die "--url 缺少参数"
      URL="$2"
      shift 2
      ;;
    --no-url)
      NO_URL=1
      URL=""
      shift
      ;;
    --owner)
      [[ $# -ge 2 ]] || die "--owner 缺少参数"
      OWNER="$2"
      shift 2
      ;;
    --chmod)
      [[ $# -ge 2 ]] || die "--chmod 缺少参数"
      CHMOD="$2"
      shift 2
      ;;
    --sudo) USE_SUDO=1; shift ;;
    --no-sudo) USE_SUDO=0; shift ;;
    --delete) DO_DELETE=1; shift ;;
    --no-delete) DO_DELETE=0; shift ;;
    --backup) DO_BACKUP=1; shift ;;
    --check) DO_CHECK=1; shift ;;
    --no-check) DO_CHECK=0; shift ;;
    --install-deps) DEPS_MODE="yes"; shift ;;
    --no-install-deps) DEPS_MODE="no"; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -y | --yes) YES=1; shift ;;
    --ssh)
      die "远程发布将在第二阶段提供，当前版本只支持本机发布"
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

# 配置文件只补默认值，命令行优先，外部环境变量次之
CLI_DEST="$DEST"
CLI_URL="$URL"
EXT_DEST="${DEPLOY_DEST:-}"
EXT_URL="${DEPLOY_URL:-}"
for f in "$DIR/.deploy.env" "${XDG_CONFIG_HOME:-$HOME/.config}/starcore/deploy.env"; do
  if [[ -f "$f" ]]; then
    # shellcheck disable=SC1090
    source "$f"
  fi
done
DEST="${CLI_DEST:-${EXT_DEST:-${DEPLOY_DEST:-}}}"
URL="${CLI_URL:-${EXT_URL:-${DEPLOY_URL:-}}}"
[[ $NO_URL -eq 1 ]] && URL=""

# ---------- 交互 ----------

ask() {
  local prompt="$1" default="${2:-}" reply=""
  if [[ $YES -eq 1 ]]; then
    printf '%s' "$default"
    return 0
  fi
  printf '%s' "$prompt" >&2
  read -r reply || reply=""
  printf '%s' "${reply:-$default}"
}

ask_yes() {
  local prompt="$1" default="${2:-n}" reply=""
  if [[ $YES -eq 1 ]]; then
    [[ "$default" == "y" ]]
    return
  fi
  printf '%s' "$prompt" >&2
  read -r reply || reply=""
  reply="${reply:-$default}"
  [[ "$reply" == "y" || "$reply" == "Y" ]]
}

interactive_menu() {
  [[ -t 0 ]] || die "非交互环境请指定操作，例如：bash starcore.sh install"
  say "请选择操作："
  say "  1) 安装最新开发版"
  say "  2) 安装最新稳定版"
  say "  3) 安装并发布"
  say "  4) 仅发布已有构建"
  say "  5) 仅做环境检测"
  local choice
  printf '输入 1-5 [2]：' >&2
  read -r choice || choice="2"
  case "${choice:-2}" in
    1) COMMAND="install"; SOURCE="main" ;;
    2) COMMAND="install"; SOURCE="release" ;;
    3) COMMAND="up"; SOURCE="release" ;;
    4) COMMAND="deploy" ;;
    5) COMMAND="check" ;;
    *) die "无效选择：$choice" ;;
  esac

  if [[ "$COMMAND" == "install" || "$COMMAND" == "up" ]]; then
    DIR="$(ask "安装目录 [${DIR}]：" "$DIR")"
    [[ -n "$DIR" ]] || die "安装目录不能为空"
  fi

  if [[ "$COMMAND" == "deploy" ]]; then
    DIR="$(ask "构建目录 [${DIR}]：" "$DIR")"
    [[ -n "$DIR" ]] || die "构建目录不能为空"
  fi

  if [[ "$COMMAND" == "deploy" || "$COMMAND" == "up" ]]; then
    DEST="$(ask "发布目标目录（必填）：" "")"
    [[ -n "$DEST" ]] || die "发布目标目录不能为空"
    URL="$(ask "站点地址（可留空）：" "")"
    if ask_yes "发布前备份目标目录？[y/N]：" "n"; then DO_BACKUP=1; fi
    if ask_yes "同步时删除目标目录多余文件？[y/N]：" "n"; then DO_DELETE=1; fi
  fi
}

if [[ -z "$COMMAND" ]]; then
  interactive_menu
fi

case "$COMMAND" in
  install | deploy | up | check) ;;
  *) die "未知操作：$COMMAND" ;;
esac

# ---------- 环境检测 ----------

OS="$(uname -s)"
PM=""
if [[ "$OS" == "Darwin" ]]; then
  PM="brew"
elif [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  case " ${ID:-} ${ID_LIKE:-} " in
    *debian* | *ubuntu*) PM="apt" ;;
    *fedora* | *rhel* | *centos*) PM="dnf" ;;
    *arch*) PM="pacman" ;;
    *alpine*) PM="apk" ;;
  esac
fi

SUDO_CMD=""
if [[ $EUID -ne 0 ]]; then
  command -v sudo >/dev/null 2>&1 && SUDO_CMD="sudo"
fi

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

run_pkg() {
  if [[ $EUID -eq 0 || "$PM" == "brew" ]]; then
    run "$@"
  elif [[ -n "$SUDO_CMD" ]]; then
    run "$SUDO_CMD" "$@"
  else
    return 1
  fi
}

run_admin() {
  if [[ $EUID -eq 0 ]]; then
    run "$@"
  elif [[ $USE_SUDO -eq 1 && -n "$SUDO_CMD" ]]; then
    run "$SUDO_CMD" "$@"
  else
    run "$@"
  fi
}

node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  local v major minor rest
  v="$(node -v 2>/dev/null | sed 's/^v//')"
  [[ -n "$v" ]] || return 1
  major="${v%%.*}"
  rest="${v#*.}"
  minor="${rest%%.*}"
  [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ ]] || return 1
  [[ "$major" -gt 22 ]] || { [[ "$major" -eq 22 && "$minor" -ge 18 ]]; }
}

node_version() {
  command -v node >/dev/null 2>&1 && node -v 2>/dev/null || echo "未安装"
}

show_status() {
  local name="$1" ok="$2" detail="$3"
  if [[ "$ok" == "1" ]]; then
    printf '  %-10s %-14s %s\n' "$name" "$detail" "OK"
  else
    printf '  %-10s %-14s %s\n' "$name" "$detail" "缺失"
  fi
}

collect_missing() {
  local need_rsync="$1" need_curl="$2" need_tar="$3" need_node="$4"
  MISSING_TOOLS=()
  NEED_NODE=0
  command -v git >/dev/null 2>&1 || MISSING_TOOLS+=("git")
  command -v curl >/dev/null 2>&1 || MISSING_TOOLS+=("curl")
  if [[ "$need_rsync" == "1" ]]; then
    command -v rsync >/dev/null 2>&1 || MISSING_TOOLS+=("rsync")
  fi
  if [[ "$need_tar" == "1" ]]; then
    command -v tar >/dev/null 2>&1 || MISSING_TOOLS+=("tar")
  fi
  if [[ "$need_node" == "1" ]] && ! node_ok; then
    NEED_NODE=1
  fi
}

# 只做检查，不安装
report_environment() {
  local ok
  say "环境检测（$(uname -s) $(uname -m)，包管理器：${PM:-未识别}）"
  ok=0; command -v git >/dev/null 2>&1 && ok=1; show_status "git" "$ok" "$(git --version 2>/dev/null | awk '{print $3}' || true)"
  ok=0; node_ok && ok=1; show_status "node" "$ok" "$(node_version)"
  ok=0; command -v corepack >/dev/null 2>&1 && ok=1; show_status "corepack" "$ok" "$(corepack --version 2>/dev/null || echo '-')"
  ok=0; command -v curl >/dev/null 2>&1 && ok=1; show_status "curl" "$ok" "$(curl --version 2>/dev/null | head -1 | awk '{print $2}' || true)"
  ok=0; command -v rsync >/dev/null 2>&1 && ok=1; show_status "rsync" "$ok" "$(rsync --version 2>/dev/null | head -1 | awk '{print $3}' || true)"
  ok=0; command -v tar >/dev/null 2>&1 && ok=1; show_status "tar" "$ok" "$(tar --version 2>/dev/null | head -1 | awk '{print $4}' || true)"
  say "  python3    可选             $(command -v python3 >/dev/null 2>&1 && python3 --version 2>&1 || echo '未安装')"
}

# 安装 Node 需要联网与包管理器；只引导，不静默替换系统运行时
install_node() {
  local cmd=() desc=""
  case "$PM" in
    brew)
      cmd=(brew install node)
      desc="brew install node"
      ;;
    apt)
      if [[ $EUID -eq 0 ]]; then
        cmd=(bash -c "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs")
        desc="NodeSource 22.x + apt-get install nodejs"
      elif [[ -n "$SUDO_CMD" ]]; then
        cmd=(bash -c "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs")
        desc="NodeSource 22.x + apt-get install nodejs"
      fi
      ;;
    dnf)
      if [[ $EUID -eq 0 ]]; then
        cmd=(bash -c "curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - && dnf install -y nodejs")
        desc="NodeSource 22.x + dnf install nodejs"
      elif [[ -n "$SUDO_CMD" ]]; then
        cmd=(bash -c "curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo -E bash - && sudo dnf install -y nodejs")
        desc="NodeSource 22.x + dnf install nodejs"
      fi
      ;;
    *)
      ;;
  esac

  if [[ ${#cmd[@]} -eq 0 ]]; then
    warn "无法自动安装 Node.js。请安装 22.18 或更高版本：https://nodejs.org/"
    return 1
  fi

  say "Node.js 需要 22.18 或更高版本，当前：$(node_version)"
  say "将执行：${desc}"
  if [[ "$DEPS_MODE" == "no" ]]; then
    return 1
  fi
  if [[ "$DEPS_MODE" != "yes" ]]; then
    [[ -t 0 ]] || return 1
    ask_yes "是否继续安装 Node.js？[y/N]：" "n" || return 1
  fi
  run "${cmd[@]}" || return 1
  node_ok
}

ensure_environment() {
  local need_rsync="$1" need_curl="$2" need_tar="$3" need_node="$4"
  if [[ $DRY_RUN -eq 1 ]]; then
    report_environment
    return 0
  fi
  collect_missing "$need_rsync" "$need_curl" "$need_tar" "$need_node"

  if [[ ${#MISSING_TOOLS[@]} -eq 0 && $NEED_NODE -eq 0 ]] &&
    { [[ "$need_node" == "0" ]] || command -v corepack >/dev/null 2>&1; }; then
    if [[ "$need_node" == "1" ]]; then
      say "环境检测通过：git / node $(node_version) / corepack / curl"
    else
      say "环境检测通过：git / curl / rsync 等发布组件齐全"
    fi
    return 0
  fi

  say "环境检测："
  local c
  for c in git curl rsync tar; do
    if command -v "$c" >/dev/null 2>&1; then
      printf '  %-8s OK\n' "$c"
    else
      printf '  %-8s 缺失\n' "$c"
    fi
  done
  if node_ok; then printf '  %-8s %s OK\n' "node" "$(node_version)"; else printf '  %-8s %s 需要 22.18+\n' "node" "$(node_version)"; fi

  if [[ ${#MISSING_TOOLS[@]} -gt 0 ]]; then
    if [[ -z "$PM" ]]; then
      warn "未识别的系统包管理器，请手动安装：${MISSING_TOOLS[*]}"
      return 1
    fi
    local display="" pkgcmd=()
    case "$PM" in
      apt) display="sudo apt-get update && sudo apt-get install -y ${MISSING_TOOLS[*]}"; pkgcmd=(apt-get install -y "${MISSING_TOOLS[@]}") ;;
      dnf) display="sudo dnf install -y ${MISSING_TOOLS[*]}"; pkgcmd=(dnf install -y "${MISSING_TOOLS[@]}") ;;
      pacman) display="sudo pacman -S --needed --noconfirm ${MISSING_TOOLS[*]}"; pkgcmd=(pacman -S --needed --noconfirm "${MISSING_TOOLS[@]}") ;;
      apk) display="sudo apk add ${MISSING_TOOLS[*]}"; pkgcmd=(apk add "${MISSING_TOOLS[@]}") ;;
      brew) display="brew install ${MISSING_TOOLS[*]}"; pkgcmd=(brew install "${MISSING_TOOLS[@]}") ;;
    esac
    say "将安装系统组件：${MISSING_TOOLS[*]}"
    say "命令：${display}"
    if [[ "$DEPS_MODE" == "no" ]]; then
      warn "已指定 --no-install-deps，请手动安装后重试"
      return 1
    fi
    if [[ "$DEPS_MODE" != "yes" ]]; then
      [[ -t 0 ]] || { warn "非交互环境不自动安装，请加 --install-deps 或手动安装"; return 1; }
      ask_yes "是否继续安装？[Y/n]：" "y" || return 1
    fi
    if [[ "$PM" == "apt" ]]; then
      run_pkg apt-get update || return 1
    fi
    run_pkg "${pkgcmd[@]}" || return 1
  fi

  if [[ $NEED_NODE -eq 1 ]]; then
    if ! install_node; then
      warn "Node.js 未就绪，无法继续"
      return 1
    fi
  fi

  if [[ "$need_node" == "1" ]] && ! command -v corepack >/dev/null 2>&1; then
    warn "未找到 corepack。Node.js 22 LTS 自带 corepack；也可运行 npm install -g corepack"
    return 1
  fi

  collect_missing "$need_rsync" "$need_curl" "$need_tar" "$need_node"
  if [[ ${#MISSING_TOOLS[@]} -gt 0 || $NEED_NODE -eq 1 ]]; then
    warn "安装后复检仍未通过：${MISSING_TOOLS[*]:-Node.js}"
    return 1
  fi
  say "环境检测通过"
}

# ---------- 安装 ----------

resolve_release_tag() {
  local tag
  tag="$(curl -fsSIL -o /dev/null -w '%{url_effective}' "https://github.com/${REPO}/releases/latest" |
    sed -n 's#.*/tag/##p')"
  [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "无法解析最新 Release，请检查网络后重试"
  printf '%s' "$tag"
}

do_install() {
  local source="$SOURCE"
  if [[ -z "$source" ]]; then
    if [[ $YES -eq 1 ]]; then
      source="release"
    else
      say "安装来源："
      say "  1) 最新开发版 main"
      say "  2) 最新稳定版 Release"
      local c
      printf '输入 1 或 2 [2]：' >&2
      read -r c || c="2"
      case "${c:-2}" in
        1) source="main" ;;
        2) source="release" ;;
        *) die "无效选择：$c" ;;
      esac
    fi
  fi
  [[ "$source" == "main" || "$source" == "release" ]] || die "未知安装来源：$source"

  ensure_environment 0 1 0 1

  if [[ $DRY_RUN -eq 1 ]]; then
    say "[dry-run] 将克隆 ${source} 到 ${DIR}"
    say "[dry-run] 将安装依赖并构建"
    return 0
  fi

  if [[ -e "$DIR" && -n "$(ls -A "$DIR" 2>/dev/null || true)" ]]; then
    die "目录已存在且非空：$DIR，请换一个目录或先手动清空"
  fi

  local tag="" commit=""
  if [[ "$source" == "release" ]]; then
    tag="$(resolve_release_tag)"
    say "最新 Release：${tag}"
  fi

  say "正在获取源码到 ${DIR} ..."
  if [[ "$source" == "main" ]]; then
    run git clone --depth 1 "$REPO_URL" "$DIR"
  else
    run git clone --depth 1 --branch "$tag" "$REPO_URL" "$DIR"
    commit="$(git -C "$DIR" rev-parse HEAD)"
    local remote_commit
    remote_commit="$(git ls-remote "$REPO_URL" "refs/tags/${tag}" | awk '{print $1}')"
    [[ -n "$remote_commit" && "$commit" == "$remote_commit" ]] ||
      warn "本地提交与远端 tag 不一致，请检查：${commit} / ${remote_commit:-未取到}"
  fi

  say "正在安装依赖并构建 ..."
  if [[ $DO_CHECK -eq 1 ]]; then
    (cd "$DIR" && run corepack pnpm install --frozen-lockfile && run corepack pnpm check)
  else
    (cd "$DIR" && run corepack pnpm install --frozen-lockfile && run corepack pnpm build)
  fi

  local version
  version="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$DIR/package.json" | head -1)"
  [[ -f "$DIR/dist/index.html" ]] || die "构建产物缺少 dist/index.html"
  say ""
  say "安装完成"
  say "  来源：${source}$([[ -n "$tag" ]] && echo " ${tag}")"
  say "  版本：${version}"
  say "  目录：$(cd "$DIR" && pwd)"
  say "  产物：$(cd "$DIR" && pwd)/dist"
  if [[ "$source" == "main" ]]; then
    say "  开发预览：cd \"$(cd "$DIR" && pwd)\" && corepack pnpm dev"
  fi
  say "  本地预览：python3 -m http.server 8080 -d \"$(cd "$DIR" && pwd)/dist\""
}

# ---------- 部署 ----------

validate_url() {
  [[ "$1" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?$ ]]
}

do_deploy() {
  local src="$DIR/dist"
  [[ -f "$src/index.html" ]] || die "没有找到构建产物：$src/index.html"

  if [[ -z "$DEST" ]]; then
    if [[ -t 0 && $YES -eq 0 ]]; then
      DEST="$(ask "发布目标目录（必填）：" "")"
    fi
  fi
  [[ -n "$DEST" ]] || die "缺少发布目标，请用 --dest 指定"

  if [[ $DRY_RUN -eq 1 ]]; then
    ensure_environment 1 1 1 0
    say "[dry-run] 将同步 ${DIR}/dist/ 到 ${DEST}/"
    say "[dry-run] 将按需注入分享元数据、备份、修改属主与权限"
    return 0
  fi

  DEST="$(realpath -m "$DEST" 2>/dev/null || printf '%s' "$DEST")"
  [[ "$DEST" != "/" ]] || die "拒绝发布到根目录"
  [[ "$DEST" != "$(cd "$DIR" && pwd)" ]] || die "发布目标不能是安装目录本身"
  [[ "$DEST" != "$(cd "$DIR" && pwd)/dist" ]] || die "发布目标不能是 dist 目录本身"
  if [[ -n "$URL" ]] && ! validate_url "$URL"; then
    die "站点地址格式不支持，需要协议 + 域名 + 可选端口：$URL"
  fi

  ensure_environment 1 1 "$DO_BACKUP" 0

  if [[ $DO_CHECK -eq 1 ]]; then
    if [[ -f "$DIR/package.json" ]]; then
      say "运行完整检查 ..."
      (cd "$DIR" && run corepack pnpm check)
    else
      warn "发布目录没有源码，跳过完整检查"
    fi
  fi

  if [[ ! -d "$DEST" ]]; then
    say "创建发布目录：$DEST"
    run_admin mkdir -p "$DEST"
  fi

  if [[ ! -w "$DEST" ]]; then
    if [[ $USE_SUDO -eq 0 ]]; then
      if [[ -t 0 && $YES -eq 0 ]] && ask_yes "目标目录不可写，是否使用 sudo？[y/N]：" "n"; then
        USE_SUDO=1
      else
        die "目标目录不可写：$DEST，可加 --sudo 或换目录"
      fi
    fi
  fi

  if [[ $DO_BACKUP -eq 1 ]]; then
    local tgz="/tmp/starcore-deploy-$(date +%Y%m%d-%H%M%S).tgz"
    say "备份目标目录到 ${tgz} ..."
    run_admin tar -czf "$tgz" -C "$DEST" . || die "备份失败"
    say "备份完成：${tgz}"
  fi

  local rsync_cmd=(rsync -rc --exclude=.well-known/ --exclude='*.map')
  [[ $DO_DELETE -eq 1 ]] && rsync_cmd+=(--delete)
  rsync_cmd+=("$src/" "$DEST/")
  say "同步构建产物到 ${DEST} ..."
  if [[ $USE_SUDO -eq 1 && $EUID -ne 0 ]]; then
    [[ -n "$SUDO_CMD" ]] || die "需要 sudo，但当前环境没有 sudo"
    run "$SUDO_CMD" "${rsync_cmd[@]}"
  else
    run "${rsync_cmd[@]}"
  fi

  if [[ -n "$URL" ]]; then
    say "注入分享元数据：${URL}"
    if [[ $USE_SUDO -eq 1 && $EUID -ne 0 ]]; then
      run "$SUDO_CMD" sed -i \
        -e "s|<meta property=\"og:url\" content=\"/\" />|<meta property=\"og:url\" content=\"${URL}/\" />\n  <link rel=\"canonical\" href=\"${URL}/\" />|" \
        -e "s|content=\"/og.webp\"|content=\"${URL}/og.webp\"|g" \
        "$DEST/index.html"
    else
      run sed -i \
        -e "s|<meta property=\"og:url\" content=\"/\" />|<meta property=\"og:url\" content=\"${URL}/\" />\n  <link rel=\"canonical\" href=\"${URL}/\" />|" \
        -e "s|content=\"/og.webp\"|content=\"${URL}/og.webp\"|g" \
        "$DEST/index.html"
    fi
    local og canonical
    if [[ $USE_SUDO -eq 1 && $EUID -ne 0 ]]; then
      og="$(sudo grep -c "content=\"${URL}/og.webp\"" "$DEST/index.html" || true)"
      canonical="$(sudo grep -c "rel=\"canonical\" href=\"${URL}/\"" "$DEST/index.html" || true)"
    else
      og="$(grep -c "content=\"${URL}/og.webp\"" "$DEST/index.html" || true)"
      canonical="$(grep -c "rel=\"canonical\" href=\"${URL}/\"" "$DEST/index.html" || true)"
    fi
    if [[ "$og" != "2" || "$canonical" != "1" ]]; then
      warn "分享元数据命中异常：og ${og}/2，canonical ${canonical}/1，请人工检查"
    fi
  else
    warn "未提供站点地址，跳过分享元数据注入与线上核验"
  fi

  if [[ -n "$OWNER" ]]; then
    say "修改目录属主：${OWNER}"
    run_admin chown -R "$OWNER" "$DEST"
  fi
  if [[ -n "$CHMOD" ]]; then
    say "修改目录权限：${CHMOD}"
    run_admin chmod -R "$CHMOD" "$DEST"
  fi

  local version meta
  version="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$DIR/package.json" 2>/dev/null | head -1)"
  meta="$(sed -n 's/.*name="app-version" content="\([^"]*\)".*/\1/p' "$DEST/index.html" | head -1)"
  [[ -n "$version" ]] || version="$meta"
  if [[ -n "$meta" && -n "$version" && "$meta" != "$version" ]]; then
    die "产物版本 ${meta} 与 package.json ${version} 不一致"
  fi

  if [[ -n "$URL" ]]; then
    local code html bundle
    code="$(curl -s --max-time 15 -o /dev/null -w '%{http_code}' "${URL}/?t=$(date +%s)" || true)"
    html="$(curl -s --max-time 15 "${URL}/?t=$(date +%s)" || true)"
    bundle="$(grep -oE 'index-[A-Za-z0-9_-]+\.js' <<< "$html" | head -1 || true)"
    if [[ "$code" == "200" && -n "$bundle" ]] && grep -qF "name=\"app-version\" content=\"${meta}\"" <<< "$html"; then
      say "线上核验通过：HTTP 200，版本 ${meta}，入口 ${bundle}"
    else
      die "线上核验未通过：HTTP ${code:-无响应}，入口 ${bundle:-未命中}"
    fi
  else
    [[ -f "$DEST/index.html" ]] || die "发布后缺少 index.html"
    say "本机核验通过：$(cd "$DEST" && pwd)，版本 ${meta:-未知}"
  fi

  say ""
  say "发布完成：${DEST}"
}

# ---------- 主流程 ----------

if [[ "$COMMAND" == "check" ]]; then
  report_environment
  exit 0
fi

if [[ "$COMMAND" == "install" ]]; then
  do_install
  exit 0
fi

if [[ "$COMMAND" == "deploy" ]]; then
  do_deploy
  exit 0
fi

if [[ "$COMMAND" == "up" ]]; then
  do_install
  do_deploy
  exit 0
fi
