import { platformSelect } from "nativewind/theme";
import path from "node:path";

// see https://github.com/tailwindlabs/tailwindcss/issues/11097
// eslint-disable-next-line import/no-relative-packages
import { getConfig } from "../../packages/app/utils/tailwind";

const rootPath = path.join(__dirname, "../..");

const config = getConfig({
	content: [path.join(rootPath, "packages/**/*.{ts,tsx}")],
	theme: {
		extend: {
			fontFamily: {
				example: ["ExampleFontFamily"],
				system: platformSelect({
					ios: "Georgia",
					android: "sans-serif",
					default: "ui-sans-serif",
				}),
			},
		},
	},
});

export default config;
