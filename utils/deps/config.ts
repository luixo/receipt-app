import { getKnipConfig } from "@oxiul/configs";

const playwrightTestEntry = "**/*.spec.ts";
const configEntry = "**/*.config.ts";
// Metro resolves these by platform; Knip cannot trace each target from one import.
// Like Expo routes, this intentionally won't catch orphaned platform files.
const platformEntries = ["**/*.{native,web}.{ts,tsx}"];

export const config = getKnipConfig({
	options: {
		opencode: true,
		vitest: true,
		reactNative: true,
		eslint: true,
		workspaces: true,
	},
	ignore: [
		// Used by the weekly Bun package-update workflow while Renovate's Bun support evolves: https://github.com/renovatebot/renovate/issues/20065
		".ncurc.mjs",
		// Typecheck files are needed for typecheck only
		"**/*.typecheck.ts",
	],
	// Cross-workspace imports use ~app/*, ~utils/*, etc. instead of @ra/*.
	ignoreDependencies: ["@ra/.+"],
	workspaces: {
		".": {
			// Used only inside ignored .opencode/.
			ignoreDependencies: ["@opencode/plugin"],
		},
		"apps/mobile": {
			entry: ["app/**/*.{ts,tsx}", "src/app.css"],
			ignoreDependencies: [
				// Font files referenced through a template string in app.config.ts.
				"@expo-google-fonts/inter",
			],
			ignoreIssues: {
				// Imports from app.css are not resolved for some reason
				"src/heroui.ts": ["exports"],
				"src/heroui-override.ts": ["exports"],
			},
		},
		"apps/web": {
			entry: [
				"src/pages/**/*.{ts,tsx}",
				"src/entry/client.tsx",
				"src/entry/server.tsx",
				"src/entry/routeTree.gen.ts",
				"**/*.test.ts",
				playwrightTestEntry,
			],
		},
		"packages/app": {
			entry: playwrightTestEntry,
			metro: { entry: platformEntries },
			ignoreIssues: {
				// We want to export even unused types, for consistency
				"trpc.ts": ["types"],
			},
		},
		"packages/components": {
			metro: { entry: platformEntries },
		},
		"packages/coverage": {
			// Fixtures are used in tests
			ignoreFiles: ["src/fixtures/**"],
		},
		"packages/db": {
			// Migration files are used in the migration
			entry: [configEntry, "migration/migrations/[0-9][0-9][0-9][0-9]-*.ts"],
		},
		"packages/mutations": {
			ignoreIssues: {
				// We use NS exports in cache
				"src/cache/**/get*.ts": ["nsExports"],
			},
		},
		"utils/lint": {
			// Loaded by specifier in config.ts
			ignoreDependencies: [
				"@tanstack/eslint-plugin-router",
				"eslint-plugin-better-tailwindcss",
				"eslint-plugin-package-json",
				"eslint-plugin-playwright",
			],
		},
	},
});
