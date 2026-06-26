# VocaPort GitHub Actions Android 报告

> English version: [2026-06-26-github-actions-android-report.en.md](/Users/jay/Code/VocaPort/docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md)

> 更新（2026-06-26，后续验证）：最新多架构 Android 调试包已经在至少一台真机上验证可正常启动。下面这份报告仍然主要回答“如何获得可复现的 Android 构建证据”和“是否值得把本机 Android 工具链迁到 CI”，所以历史判断保留不改。

## 1. 结论

当前最稳妥的 Android 路线是：

- 用 GitHub Actions 先做 `build-only` 验证，证明 Android 壳可以在干净环境里初始化并产出 APK / AAB。
- 本机只保留 Web / Desktop 开发环境；如果不打算继续本机调 Android，可以清理本机 Android SDK / NDK / JDK。
- `build` 成功只能证明“壳能编出来”，不能自动证明“壳能在设备上正常启动”。如果后面要把 `M3` 的 Android 证据做得更强，再补一层 emulator smoke test 或真机安装验证。
- 截至当前补记，最新多架构调试包已经拿到“至少一台真机可启动”的正向证据，但仍不等于“所有机型都已验证通过”。

推荐优先级：

1. 先补 GitHub Actions Android 构建。
2. 让 workflow 产出 APK / AAB artifact。
3. 视需要再决定是否保留本机 Android 工具链。

## 2. 当前本机状态快照

写报告时，本机正在通过 `sdkmanager` 安装 Android 工具链，已观察到：

- Android SDK 根目录：`/Users/jay/Library/Android/sdk`
- SDK 总占用：约 `3.3 GB`
- `ndk/29.0.14206865`：约 `3.1 GB`
- `build-tools/35.0.1`：约 `186 MB`
- `openjdk@21`：约 `332 MB`
- `android-commandlinetools`：约 `166 MB`

这说明磁盘主要消耗来自 NDK；如果你后续改走纯 CI 路线，本机最值得清理的也是这一部分。

## 3. 本机 Android 最小必装项

如果目标只是“本机把 Android 壳编出来”，最小必需项如下：

| 组件 | 是否必需 | 当前建议值 | 作用 |
| --- | --- | --- | --- |
| `JDK` | 必需 | `openjdk@21` | 给 `sdkmanager`、Gradle、Android 构建链提供 Java 运行时 |
| Rust Android targets | 必需 | `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android` | 给 Rust / Tauri 原生部分交叉编译 |
| `@tauri-apps/cli` | 必需 | 已在 `apps/desktop-mobile/package.json` 中加入 | 提供 `tauri android init/build` |
| `cmdline-tools;latest` | 必需 | `latest` | 提供 `sdkmanager` |
| `platforms;android-35` | 必需 | `android-35` | 提供 Android 平台 SDK |
| `build-tools;35.0.1` | 必需 | `35.0.1` | 提供 `aapt2` 等构建工具 |
| `ndk;29.0.14206865` | 必需 | `29.0.14206865` | 给 Rust / C/C++ 原生部分构建 Android 产物 |
| `platform-tools` | 可选 | `latest` | 提供 `adb`；只有连设备或模拟器时才必须 |

如果目标不是“本机调试”，而只是“拿到 Android 可构建证据”，这套最小依赖完全可以只放到 CI，不必常驻本机。

## 4. 切到 GitHub Actions 后，哪些可以删

如果你决定 Android 只走 GitHub Actions，本机可以删除的内容分三类：

### 4.1 可以整体删除的目录

- `~/Library/Android/sdk`

这会回收当前大约 `3.3 GB` 的空间，后续如果安装完成，实际回收量可能还会略增。

### 4.2 可以卸载的 Homebrew 组件

- `openjdk@21`
- `android-commandlinetools`

当前它们大约占用：

- `openjdk@21`：`332 MB`
- `android-commandlinetools`：`166 MB`

### 4.3 可以移除的 Rust 目标

- `aarch64-linux-android`
- `armv7-linux-androideabi`
- `i686-linux-android`
- `x86_64-linux-android`

### 4.4 清理前提

清理前先确认没有后台安装进程还在运行，例如：

- `sdkmanager`
- `tauri android init`
- `tauri android build`

如果这些进程仍在运行，先停掉，再删目录或卸载工具。

### 4.5 建议的清理顺序

如果决定完全切到 CI，可以按这个顺序清理：

1. 确认没有 `sdkmanager` 或 `tauri android` 进程。
2. 删除 `~/Library/Android/sdk`。
3. `brew uninstall --formula openjdk@21`
4. `brew uninstall --cask android-commandlinetools`
5. `rustup target remove aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`

如果你还想以后偶尔本机调 Android，只删 `sdk/.temp` 或只停掉当前安装，不要删整套 SDK。

## 5. 推荐的 GitHub Actions 方案

### 5.1 目标

这条 workflow 的目标不是发版，而是给 `M3` 补一个稳定证据：

- 在干净 CI 环境中安装 Android 工具链
- 初始化 Tauri Android 工程
- 构建 APK / AAB
- 上传 artifact 供下载和人工验证

### 5.2 为什么推荐 `macos-latest`

推荐先用 `macos-latest`，原因很简单：

- 当前本机验证链本来就是 macOS
- 仓库已经按 `Tauri 2 + Rust + pnpm` 组织好
- 先在和本机最接近的 runner 上拿到可复现构建，更符合 KISS

后面如果要优化 CI 成本，再评估是否迁到 Linux runner。

### 5.3 workflow 示例

建议新建：

- `.github/workflows/android-build.yml`

示例：

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

### 5.4 这份 workflow 能证明什么

如果这条 workflow 稳定通过，它能证明：

- Android 工具链可以在干净环境里装起来
- 当前仓库可以初始化 Android 壳
- 当前仓库可以产出 Android 构建物

### 5.5 这份 workflow 不能证明什么

它不能自动证明：

- APK 一定能在真机正常启动
- 首屏一定无崩溃
- 权限、文件选择、缓存目录在移动端都符合预期

所以更准确的说法是：

- 它能证明 `Android shell buildable`
- 它不能单独证明 `Android shell runtime validated`

如果你要把 `M3` 的 Android 证据做得更强，后面再补：

- emulator cold-start smoke test
- 或真机手动安装验证

## 6. 对当前仓库的具体建议

对 VocaPort 当前阶段，我建议这样取舍：

1. 先把 GitHub Actions Android build workflow 落地。
2. 用 CI 成功产出的 APK / AAB 作为 Android 壳的第一阶段证据。
3. 如果你不打算长期本机调 Android，就把本机 SDK / NDK / JDK 清掉，回收空间。
4. 等 Web / Desktop 主流程更稳定后，再决定要不要补 emulator 或真机验证。

这是最符合当前阶段的 KISS 方案：先拿到可复现的构建证据，不把大量时间继续砸在本机 Android 环境维护上。

## 7. 参考资料

- [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri v2 GitHub Pipelines](https://v2.tauri.app/distribute/pipelines/github/)
- [GitHub Actions: Store and share data with workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)
- [GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/github-hosted-runners-reference)
