import { nextui } from "@nextui-org/react";
// @ts-expect-error Preset has incorrent exports
import preset from "nativewind/preset";
import { withTV } from "tailwind-variants/transformer";
import type { Config } from "tailwindcss";

export const getConfig: (config: Config) => Config = (config) =>
	withTV({
		darkMode: "class",
		presets: [preset, ...(config.presets || [])],
		plugins: [nextui({ prefix: "nextui-modern" }), ...(config.plugins || [])],
		theme: {
			screens: {
				xs: "320px",
				sm: "480px",
				md: "768px",
				lg: "1024px",
				xl: "1240px",
			},
			fontFamily: {
				sans: "var(--font-sans)",
			},
			...(config.theme || {}),
		},
		...config,
	});
