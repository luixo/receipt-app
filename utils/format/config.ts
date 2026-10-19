import { getFormatConfig } from "@oxiul/configs";

export const config = getFormatConfig({
	tailwind: {
		stylesheet: "./packages/app/global.css",
		functions: ["tv", "cn"],
	},
	imports: {
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
		"**/*-snapshots/**/*.json",
		"**/*.gen.ts",
		"**/uniwind-types.d.ts",
	],
});
