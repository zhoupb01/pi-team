#!/usr/bin/env bash
set -euo pipefail
command -v node >/dev/null 2>&1 || { echo '请先安装 Node.js 22.19+ 和 Pi。' >&2; exit 1; }
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec node "$script_dir/scripts/install.mjs" "$@"
