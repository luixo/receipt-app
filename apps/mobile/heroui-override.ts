import {
	type ColorScale,
	type ThemeColors,
	semanticColors,
} from "@heroui/theme";
import { entries, fromEntries, mapKeys, mapValues, omitBy } from "remeda";
// This is a temporarily solution, will be removed soon
// eslint-disable-next-line import-x/no-extraneous-dependencies
import createPlugin from "tailwindcss/plugin";

type ColorKey =
	| keyof ThemeColors
	| `${keyof ThemeColors}-${Exclude<keyof NonNullable<Exclude<ColorScale, string>>, "DEFAULT">}`;
const flattenColors = (themeColors: ThemeColors) =>
	fromEntries(
		entries(themeColors).reduce<[ColorKey, string][]>(
			(acc, [key, values]) => [
				...acc,
				...entries(values).map<[ColorKey, string]>(([subkey, value]) => [
					(subkey === "DEFAULT" ? key : `${key}-${subkey}`) as ColorKey,
					// Let's just assume it exists
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					value!,
				]),
			],
			[],
		),
	) as Record<ColorKey, string>;

const { light, dark } = mapValues(semanticColors, flattenColors);

export default createPlugin(
	async ({ addBase, addUtilities, config }) => {
		const colors = config().theme.colors as Record<keyof ThemeColors, string>;
		const themedColors = omitBy(
			colors,
			(value) => typeof value !== "string" || !value.includes("var(--heroui"),
		);
		const getMappedValues = (record: typeof light) =>
			mapKeys(
				mapValues(themedColors, (_value, key) => record[key]),
				(key) => `--heroui-${key}`,
			);
		addBase({
			":root, [data-theme]": {
				color: light.foreground,
				backgroundColor: light.background,
			},
			":root, [data-theme=light]": getMappedValues(light),
		});
		addUtilities({
			".light": getMappedValues(light),
			".dark": getMappedValues(dark),
		});
	},
	{
		theme: {
			extend: {
				colors: mapValues(light, (_value, key) => `var(--heroui-${key})`),
			},
		},
	},
);
