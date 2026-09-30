import { defineConfig } from "knip/config";
import { isNonNullish } from "remeda";

const playwrightTestEntry = "**/*.spec.ts";
const configEntry = "**/*.config.ts";
// Metro resolves these by platform; Knip cannot trace each target from one import.
// Like Expo routes, this intentionally won't catch orphaned platform files.
const platformEntries = ["**/*.{native,web}.{ts,tsx}"];

export const config = defineConfig({
	include: [
		"files",
		"dependencies",
		"unlisted",
		"unresolved",
		"exports",
		"nsExports",
		"types",
		"nsTypes",
		"enumMembers",
		"namespaceMembers",
		"duplicates",
		"catalog",
		"catalogReferences",
		"cycles",
	],
	ignore: [
		".opencode/**/*",
		// Used by the weekly Bun package-update workflow while Renovate's Bun support evolves: https://github.com/renovatebot/renovate/issues/20065
		".ncurc.mjs",
		process.env.CI ? undefined : ".history/**/*",
	].filter(isNonNullish),
	treatConfigHintsAsErrors: true,
	treatTagHintsAsErrors: true,
	// Cross-workspace imports use ~app/*, ~utils/*, etc. instead of @ra/*.
	ignoreDependencies: ["@ra/.+"],
	workspaces: {
		".": {
			entry: configEntry,
			// Used only inside ignored .opencode/.
			ignoreDependencies: ["@opencode-ai/plugin"],
		},
		"apps/mobile": {
			entry: ["app/**/*.{ts,tsx}", "app.css", configEntry],
			ignoreDependencies: [
				// Font files referenced through a template string in app.config.ts.
				"@expo-google-fonts/inter",
				// Root native:doctor script.
				"expo-doctor",
			],
			ignoreIssues: {
				// Imports from app.css are not resolved for some reason
				"heroui.ts": ["exports"],
				"heroui-override.ts": ["exports"],
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
				configEntry,
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
			// Some generated types may not be used in the project and that's ok
			ignoreIssues: { "src/types.gen.ts": ["types"] },
		},
		"packages/mutations": {
			ignoreIssues: {
				// We use NS exports in cache
				"src/cache/**/get*.ts": ["nsExports"],
			},
		},
		"testing/vitest": {
			entry: [],
			// Loaded by Vitest coverage
			ignoreDependencies: ["@vitest/coverage-v8"],
		},
		"utils/lint": {
			// Loaded by specifier in config.ts
			ignoreDependencies: ["oxlint-plugin-eslint"],
		},
	},
});
