// eslint-disable-next-line import/no-relative-packages
import { getConfig } from "../../packages/app/utils/tailwind";

const config = getConfig([
	"./src/pages/**/*.{ts,tsx}",
	"../../packages/**/*.{ts,tsx}",
]);

export default config;
