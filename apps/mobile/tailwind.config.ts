import { platformSelect } from "nativewind/theme";
import path from "node:path";

// see https://github.com/tailwindlabs/tailwindcss/issues/11097
// eslint-disable-next-line import/no-relative-packages
import { getConfig } from "../../packages/app/utils/tailwind";

const rootPath = path.join(__dirname, "../..");

// Remove `as` when `nativewind/theme` is typed
const safePlatformSelect = platformSelect as <
	T extends Record<string, unknown>,
>(
	input: T,
) => T[keyof T];

const config = getConfig({
	content: [path.join(rootPath, "packages/**/*.{ts,tsx}")],
	theme: {
		extend: {
			fontFamily: {
				example: ["ExampleFontFamily"],
				system: safePlatformSelect({
					ios: "Georgia",
					android: "sans-serif",
					default: "ui-sans-serif",
				}),
			},
		},
	},
});

export default config;
