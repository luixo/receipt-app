import type { Config } from "prettier";
// @ts-expect-error This package doesn't have types
import packageJsonPlugin from "prettier-plugin-packagejson";
import * as tailwindPlugin from "prettier-plugin-tailwindcss";

export const config: Config = {
	semi: true,
	useTabs: true,
	tabWidth: 2,
	singleQuote: false,
	plugins: [tailwindPlugin, packageJsonPlugin],
	tailwindStylesheet: "./packages/app/global.css",
	tailwindFunctions: ["tv", "cn"],
};
