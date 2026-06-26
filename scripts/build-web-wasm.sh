#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRATE_NAME="vocaport_web_runtime"
OUT_DIR="$REPO_ROOT/apps/web/src/wasm/pkg"
TARGET="wasm32-unknown-unknown"
PROFILE="${VOCAPORT_WASM_PROFILE:-dev}"

if ! rustup target list --installed | grep -q "^${TARGET}\$"; then
  rustup target add "$TARGET"
fi

if command -v brew >/dev/null 2>&1; then
  LLVM_PREFIX="$(brew --prefix llvm 2>/dev/null || true)"
  if [[ -n "${LLVM_PREFIX}" && -x "${LLVM_PREFIX}/bin/clang" ]]; then
    export CC_wasm32_unknown_unknown="${LLVM_PREFIX}/bin/clang"
    export AR_wasm32_unknown_unknown="${LLVM_PREFIX}/bin/llvm-ar"
  fi
fi

if ! command -v wasm-bindgen >/dev/null 2>&1; then
  echo "Missing wasm-bindgen CLI." >&2
  echo "Install it with: cargo install wasm-bindgen-cli --version 0.2.126 --locked" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

pushd "$REPO_ROOT" >/dev/null

if [[ "$PROFILE" == "release" ]]; then
  cargo build -p "$CRATE_NAME" --target "$TARGET" --release
  WASM_ARTIFACT="$REPO_ROOT/target/$TARGET/release/${CRATE_NAME}.wasm"
else
  cargo build -p "$CRATE_NAME" --target "$TARGET"
  WASM_ARTIFACT="$REPO_ROOT/target/$TARGET/debug/${CRATE_NAME}.wasm"
fi

wasm-bindgen \
  "$WASM_ARTIFACT" \
  --target bundler \
  --out-dir "$OUT_DIR" \
  --out-name vocaport_web_runtime

popd >/dev/null
