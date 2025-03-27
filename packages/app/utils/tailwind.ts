import { heroui } from "@heroui/react";
// @ts-expect-error Preset has incorrent exports
import preset from "nativewind/preset";
import { mapValues } from "remeda";
import { withTV } from "tailwind-variants/transformer";
import type { Config } from "tailwindcss";

import { screens } from "./styles";

export const getConfig: (config: Config) => Config = (config) =>
	withTV({
		darkMode: "class",
		presets: [preset, ...(config.presets || [])],
		plugins: [heroui(), ...(config.plugins || [])],
		theme: {
			screens: mapValues(screens, (size) => `${size}px`),
			fontFamily: {
				sans: "var(--font-sans)",
			},
			...(config.theme || {}),
		},
		...config,
	});
