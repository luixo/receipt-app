import type { Config } from "prettier";

export const config: Config = {
	semi: true,
	useTabs: true,
	tabWidth: 2,
	singleQuote: false,
	plugins: ["prettier-plugin-packagejson", "prettier-plugin-tailwindcss"],
	tailwindStylesheet: "./packages/app/global.css",
	tailwindFunctions: ["tv", "cn"],
};
