import { defineConfig } from "mobilewright";
import path from "node:path";

const rootDir = path.join(import.meta.dirname, "../..");

export default defineConfig({
	platform: "android",
	bundleId: "me.luixo.receipt",
	// CI installs the release APK on its own emulator; keep the local debug
	// profile for developers running on the Resizable Experimental AVD.
	...(process.env.CI
		? {}
		: {
				deviceName: /Resizable Experimental/,
				installApps: path.join(
					rootDir,
					"apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk",
				),
			}),
	// Single-core emulator is slow: UiAutomator dumps and foreground checks
	// routinely take longer than the default 10 s.
	timeout: 60_000,
	// UiAutomator dumps flake under load; a retry is cheaper than a red CI.
	retries: 2,
});
