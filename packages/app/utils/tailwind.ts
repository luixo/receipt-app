import { nextui } from "@nextui-org/react";
// @ts-expect-error Preset has incorrent exports
import preset from "nativewind/preset";
import * as path from "node:path";
// eslint-disable-next-line import/no-extraneous-dependencies
import { withTV } from "tailwind-variants/transformer";
import type { Config } from "tailwindcss";

export const getConfig: (content: string[]) => Config = (content) =>
	withTV({
		darkMode: "class",
		presets: [preset],
		plugins: [nextui({ prefix: "nextui-modern" })],
		content: [
			path.join(
				__dirname,
				"../../../",
				"node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
			),
			...content,
		],
		theme: {
			screens: {
				xs: "320px",
				sm: "480px",
				md: "768px",
				lg: "1024px",
				xl: "1240px",
			},
		},
	});
