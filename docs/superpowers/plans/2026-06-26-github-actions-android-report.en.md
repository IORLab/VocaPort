# VocaPort GitHub Actions Android Report

> Chinese companion (中文伴读版): [2026-06-26-github-actions-android-report.zh.md](/Users/jay/Code/VocaPort/docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md)

> Reading note: advanced terms and CI / Android build phrases are glossed in Chinese where they most affect reading speed.

## 1. Executive Summary (结论)

The safest Android path for the current `M3` target is:

- move Android shell evidence to GitHub Actions first,
- keep the workflow `build-only` at first,
- treat local Android tooling as optional, not required.

This gives us a reproducible (可复现的) proof that the Android shell can be initialized and built in a clean environment, while avoiding long-term local SDK / NDK maintenance.

Priority order:

1. Add an Android GitHub Actions build workflow.
2. Upload APK / AAB artifacts for manual inspection.
3. Remove the local Android toolchain if local Android debugging is not a goal.

Important boundary:

- a successful CI build proves `Android shell buildable` (可构建),
- it does **not** by itself prove `Android shell runtime validated` (运行验证通过).

If stronger evidence is needed later, add an emulator smoke test or a manual device install check.

## 2. Current Local Snapshot (当前本机快照)

At the time of writing, the local Android toolchain installation is still in progress under:

- `~/Library/Android/sdk`

Observed sizes:

- SDK root: about `3.3 GB`
- `ndk/29.0.14206865`: about `3.1 GB`
- `build-tools/35.0.1`: about `186 MB`
- Homebrew `openjdk@21`: about `332 MB`
- Homebrew `android-commandlinetools`: about `166 MB`

This confirms that the main disk cost comes from the NDK, not the smaller helper tools.

## 3. Minimum Local Android Toolchain (本机最小 Android 工具链)

If the only goal is to build the Android shell locally, the minimum stack is:

| Component | Required | Recommended value | Why it exists |
| --- | --- | --- | --- |
| `JDK` | Yes | `openjdk@21` | Required by `sdkmanager`, Gradle, and Android build tools |
| Rust Android targets | Yes | `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android` | Required for Rust / Tauri cross-compilation |
| `@tauri-apps/cli` | Yes | already added in `apps/desktop-mobile/package.json` | Provides `tauri android init/build` |
| `cmdline-tools;latest` | Yes | `latest` | Provides `sdkmanager` |
| `platforms;android-35` | Yes | `android-35` | Provides the Android platform SDK |
| `build-tools;35.0.1` | Yes | `35.0.1` | Provides tools such as `aapt2` |
| `ndk;29.0.14206865` | Yes | `29.0.14206865` | Required for Rust / C / C++ native Android builds |
| `platform-tools` | Optional | `latest` | Needed for `adb`, device, or emulator interaction |

If the goal is not local debugging but only build evidence, this entire stack can live in CI instead of on the local machine.

## 4. What Can Be Deleted If CI Becomes The Only Android Path (切到 CI 后可删除项)

If Android moves entirely to GitHub Actions, local cleanup is straightforward.

### 4.1 Remove The SDK Root

- `~/Library/Android/sdk`

That currently recovers about `3.3 GB`, and likely a bit more once the installation finishes.

### 4.2 Uninstall Homebrew Packages

- `openjdk@21`
- `android-commandlinetools`

Current observed sizes:

- `openjdk@21`: about `332 MB`
- `android-commandlinetools`: about `166 MB`

### 4.3 Remove Rust Android Targets

- `aarch64-linux-android`
- `armv7-linux-androideabi`
- `i686-linux-android`
- `x86_64-linux-android`

### 4.4 Cleanup Precondition (前提)

Before deleting anything, make sure no background process is still using the toolchain:

- `sdkmanager`
- `tauri android init`
- `tauri android build`

If those are still running, stop them first. Deleting a live SDK directory is an unnecessary risk.

### 4.5 Suggested Cleanup Order (建议顺序)

If the decision is to go CI-only:

1. Confirm no `sdkmanager` or `tauri android` process is running.
2. Delete `~/Library/Android/sdk`.
3. Run `brew uninstall --formula openjdk@21`.
4. Run `brew uninstall --cask android-commandlinetools`.
5. Run `rustup target remove aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`.

If occasional local Android debugging is still desirable, keep the SDK and only clean temporary leftovers after installation is stable.

## 5. Recommended GitHub Actions Implementation (推荐的 GitHub Actions 方案)

### 5.1 Goal (目标)

The workflow should provide the first stable Android shell proof for `M3`:

- install Android tooling in a clean runner,
- initialize the Tauri Android project,
- build APK / AAB outputs,
- upload artifacts for download and manual review.

This workflow is about build evidence, not release automation.

### 5.2 Why `macos-latest` Is The Recommended Starting Point (为什么先选 macOS runner)

`macos-latest` is the lowest-risk starting point because:

- local investigation has already been happening on macOS,
- the repo already follows `Tauri 2 + Rust + pnpm`,
- using the closest environment first is the simplest KISS path.

This is an engineering recommendation (工程判断), not a hard platform rule. Linux can be evaluated later if CI cost or speed becomes more important.

### 5.3 Suggested Workflow File

Create:

- `.github/workflows/android-build.yml`

Suggested starting workflow:

```yaml
name: android-build

on:
  workflow_dispatch:
  pull_request:
    paths:
      - "apps/desktop-mobile/**"
      - "packages/**"
      - "crates/**"
      - "Cargo.toml"
      - "Cargo.lock"
      - "package.json"
      - "pnpm-lock.yaml"
      - ".github/workflows/android-build.yml"

jobs:
  android-build:
    runs-on: macos-latest
    env:
      JAVA_HOME: /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
      ANDROID_HOME: ${{ github.workspace }}/.android-sdk
      ANDROID_SDK_ROOT: ${{ github.workspace }}/.android-sdk

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11.7.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-linux-android,armv7-linux-androideabi,i686-linux-android,x86_64-linux-android

      - name: Install Java and Android command-line tools
        run: |
          brew install openjdk@21
          brew install --cask android-commandlinetools
          echo "/opt/homebrew/opt/openjdk@21/bin" >> "$GITHUB_PATH"

      - name: Install Android SDK packages
        run: |
          export PATH="/opt/homebrew/opt/openjdk@21/bin:/opt/homebrew/bin:$PATH"
          mkdir -p "$ANDROID_HOME"
          yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses
          sdkmanager --sdk_root="$ANDROID_HOME" \
            "cmdline-tools;latest" \
            "platform-tools" \
            "platforms;android-35" \
            "build-tools;35.0.1" \
            "ndk;29.0.14206865"
          echo "NDK_HOME=$ANDROID_HOME/ndk/29.0.14206865" >> "$GITHUB_ENV"

      - name: Install workspace dependencies
        run: pnpm install --frozen-lockfile

      - name: Initialize Android project
        run: pnpm --filter @vocaport/desktop-mobile run android:init

      - name: Build Android artifacts
        run: pnpm --filter @vocaport/desktop-mobile run android:build

      - name: Upload APK and AAB
        uses: actions/upload-artifact@v4
        with:
          name: vocaport-android-build
          path: |
            apps/desktop-mobile/src-tauri/gen/android/app/build/outputs/**/*.apk
            apps/desktop-mobile/src-tauri/gen/android/app/build/outputs/**/*.aab
          if-no-files-found: error
          retention-days: 7
```

### 5.4 Why This Workflow Fits The Current Repo (为什么这份 workflow 贴合当前仓库)

It directly uses the scripts already added to the repo:

- `pnpm --filter @vocaport/desktop-mobile run android:init`
- `pnpm --filter @vocaport/desktop-mobile run android:build`

It also keeps the Android setup explicit instead of hiding it inside a more abstract release action. For this repo, that makes failures easier to diagnose.

### 5.5 What This Workflow Proves (它能证明什么)

If it passes consistently, it proves:

- Android tooling can be provisioned (配置完成) in a clean environment,
- the repo can initialize the Android shell,
- the repo can produce Android build artifacts.

### 5.6 What This Workflow Does Not Prove (它不能证明什么)

It does **not** prove:

- the APK always boots successfully on a real device,
- the first screen is crash-free,
- permissions, file picking, and cache directory behavior are correct on Android runtime.

More precise wording:

- it proves `Android shell buildable`,
- it does not alone prove `Android shell runtime validated`.

If stronger `M3` evidence is needed later, add:

- an emulator cold-start smoke test,
- or a manual device install verification step.

## 6. Recommended Decision For VocaPort Right Now (当前建议)

For the current project phase, the highest-signal path is:

1. Add the GitHub Actions Android build workflow.
2. Use CI-built APK / AAB artifacts as the first Android shell evidence.
3. Remove the local Android SDK / NDK / JDK if local Android debugging is not part of the near-term plan.
4. Revisit emulator or device validation only after Web / Desktop flow is more stable.

This keeps the project aligned with KISS and avoids spending more time than necessary on local Android environment maintenance.

## 7. References (参考资料)

- [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri v2 GitHub Pipelines](https://v2.tauri.app/distribute/pipelines/github/)
- [GitHub Actions: Store and share data with workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)
- [GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/github-hosted-runners-reference)
