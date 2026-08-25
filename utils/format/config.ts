import { defineConfig } from "oxfmt";

export const config = defineConfig({
	semi: true,
	useTabs: true,
	tabWidth: 2,
	singleQuote: false,
	printWidth: 80,
	sortPackageJson: true,
	sortTailwindcss: {
		stylesheet: "./packages/app/global.css",
		functions: ["tv", "cn"],
	},
	ignorePatterns: [
		".history",
		"**/*-snapshots/**/*.json",
		"**/*.gen.ts",
		"**/uniwind-types.d.ts",
	],
});
