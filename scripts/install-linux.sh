#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
prefix="${KWEB_INSTALL_PREFIX:-${HOME}/.local}"
binary="${KWEB_BINARY_PATH:-${project_root}/src-tauri/target/release/kweb}"

usage() {
    echo "Usage: $0 [--prefix PATH] [--binary PATH]"
    echo
    echo "Installs KWeb for the current user."
    echo "Defaults:"
    echo "  --prefix  \$KWEB_INSTALL_PREFIX or ~/.local"
    echo "  --binary  \$KWEB_BINARY_PATH or src-tauri/target/release/kweb"
}

while (($# > 0)); do
    case "$1" in
        --prefix)
            [[ $# -ge 2 ]] || { echo "Missing value for --prefix" >&2; exit 2; }
            prefix="$2"
            shift 2
            ;;
        --binary)
            [[ $# -ge 2 ]] || { echo "Missing value for --binary" >&2; exit 2; }
            binary="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown argument: $1" >&2
            usage >&2
            exit 2
            ;;
    esac
done

case "$prefix" in
    /*) ;;
    *)
        echo "Install prefix must be an absolute path: $prefix" >&2
        exit 2
        ;;
esac

if [[ ! -x "$binary" ]]; then
    echo "KWeb binary not found or not executable: $binary" >&2
    echo "Build it first with: npm run desktop:build -- --no-bundle" >&2
    exit 1
fi

bindir="$prefix/bin"
applications_dir="$prefix/share/applications"
icons_dir="$prefix/share/icons/hicolor"

install -d "$bindir" "$applications_dir"
install -m 0755 "$binary" "$bindir/kweb"

for icon in 32x32 128x128; do
    install -d "$icons_dir/$icon/apps"
    install -m 0644 "$project_root/src-tauri/icons/$icon.png" "$icons_dir/$icon/apps/kweb.png"
done

install -d "$icons_dir/256x256@2/apps"
install -m 0644 "$project_root/src-tauri/icons/128x128@2x.png" \
    "$icons_dir/256x256@2/apps/kweb.png"

desktop_file="$applications_dir/kweb.desktop"
desktop_tmp="$(mktemp --suffix=.desktop "$prefix/share/.kweb.XXXXXX")"
trap 'rm -f "$desktop_tmp"' EXIT
cat >"$desktop_tmp" <<EOF
[Desktop Entry]
Type=Application
Name=KWeb
Comment=KWeb knowledge workspace
Exec=$bindir/kweb
Icon=kweb
Terminal=false
Categories=Office;
StartupWMClass=kweb
EOF

chmod 0644 "$desktop_tmp"

if command -v desktop-file-validate >/dev/null 2>&1; then
    desktop-file-validate "$desktop_tmp"
fi
mv -f "$desktop_tmp" "$desktop_file"
trap - EXIT
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$applications_dir" >/dev/null 2>&1 || true
fi

echo "Installed KWeb to $bindir/kweb"
echo "Installed launcher to $desktop_file"
