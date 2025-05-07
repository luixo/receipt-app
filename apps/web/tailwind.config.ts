import path from "node:path";

// see https://github.com/tailwindlabs/tailwindcss/issues/11097
// eslint-disable-next-line import-x/no-relative-packages
import { getConfig } from "../../packages/app/utils/tailwind";

const rootPath = path.join(__dirname, "../..");

const config = getConfig({
	content: [
		path.join(rootPath, "packages/**/*.{ts,tsx}"),
		path.join(rootPath, "node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"),
		path.join(rootPath, "apps/web/src/pages/**/*.{ts,tsx}"),
	],
});

export default config;
