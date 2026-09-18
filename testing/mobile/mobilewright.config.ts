import { defineConfig } from "mobilewright";

export default defineConfig({
	platform: "android",
	bundleId: "me.luixo.receipt",
	// Single-core emulator is slow: UiAutomator dumps and foreground checks
	// routinely take longer than the default 10 s.
	timeout: 60_000,
	// UiAutomator dumps flake under load; a retry is cheaper than a red CI.
	retries: 2,
});
