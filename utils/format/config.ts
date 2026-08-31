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
	sortImports: {
		newlinesBetween: false,
		order: "asc",
		customGroups: [
			{ groupName: "react", elementNamePattern: ["react", "react-native"] },
			{ groupName: "tilde", elementNamePattern: ["~*", "~*/**"] },
		],
		groups: [
			"react",
			{ newlinesBetween: true },
			["type-builtin", "value-builtin", "type-external", "value-external"],
			{ newlinesBetween: true },
			"tilde",
			["type-internal", "value-internal"],
			{ newlinesBetween: true },
			["type-parent", "value-parent"],
			{ newlinesBetween: true },
			["type-sibling", "value-sibling", "type-index", "value-index"],
			"unknown",
		],
	},
	ignorePatterns: [
		".history",
		"**/*-snapshots/**/*.json",
		"**/*.gen.ts",
		"**/uniwind-types.d.ts",
	],
});
