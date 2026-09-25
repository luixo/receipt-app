# Mobile tests (Mobilewright)

Guest smoke tests for the Android app live in `testing/mobile/`. They drive a
real emulator through Mobilewright (`mobile-next/mobilewright`), a
Playwright-style API over `mobilecli` + adb. No YAML, no backend needed: the
guest flow only touches screens that render without auth or network.

## Files

- `testing/mobile/mobilewright.config.ts` — `platform: android`,
  `bundleId: me.luixo.receipt`. `timeout: 60_000` and `retries: 2` absorb slow
  UiAutomator round-trips on weak hardware; on proper CI hardware the suite
  finishes in seconds.
- `testing/mobile/smoke.test.ts` — launch → login asserts → fill email →
  open reset-password modal → screenshots. Run with `bun run mobile:test`.

## Local run

Prerequisites: JDK 17, Android SDK (`platform-tools`, an `android-30` AOSP
system image), KVM access for acceleration, and a built APK:

```sh
# One-time: create and boot an emulator (AOSP image, not Google APIs)
avdmanager create avd -n smoke -k "system-images;android-30;default;x86_64" -d "pixel_7"
emulator @smoke -gpu swiftshader_indirect -accel on -no-window -no-audio -no-boot-anim -memory 4096
```

```sh
# Build and install (release keeps parity with CI; debug also works)
bun run native:run:android
# Or: install an existing APK
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

Mobilewright talks to the device through a `mobilecli` WebSocket server, not
adb directly. Start it explicitly before running — the test runner's
auto-start is unreliable and fixtures time out without it:

```sh
./node_modules/.bin/mobilecli server start
MOBILEWRIGHT_DISABLE_TELEMETRY=1 bun run mobile:test
```

Useful debugging: `mobilecli devices` (discovery), `mobilecli dump ui` (view
tree — flaky under load, retry), `adb exec-out screencap -p` (screenshots),
`adb logcat` (JS errors surface as `ReactNativeJS`, native crashes as
`AndroidRuntime: FATAL EXCEPTION`).

## CI

The `mobile-test` job in `continuous-integration-workflow.yml` reproduces the
local flow on `ubuntu-latest`: JDK 17 + Android SDK setup, `expo prebuild`,
release APK build (x86_64 only), then the smoke suite on a software-rendered
API 30 AOSP emulator via `reactivecircus/android-emulator-runner`. The APK
and failure context (`testing/mobile/test-results`) are uploaded as
artifacts. `EXPO_PUBLIC_API_BASE_URL` points at the emulator host loopback;
queries fail without a backend, which the guest flow tolerates by design.
