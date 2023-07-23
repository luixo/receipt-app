import { useMatchMedia } from "app/hooks/use-match-media";
import { breakpoints } from "app/utils/styles";
import { capitalize } from "app/utils/utils";

type BreakpointKey = keyof typeof breakpoints;
export const breakpointKeys = Object.keys(breakpoints) as BreakpointKey[];

type BreakpointType = keyof ({
	[Type in BreakpointKey as `less${Capitalize<string & Type>}`]: true;
} & {
	[Type in BreakpointKey as `more${Capitalize<string & Type>}`]: true;
});

export type BreakpointValues<T> = Partial<Record<BreakpointType, T>>;

export const useMatchMediaValue = <T>(
	defaultValue: T,
	values: BreakpointValues<T>,
) => {
	const matchMedia = useMatchMedia();

	for (let i = 0; i < breakpointKeys.length; i += 1) {
		const key = breakpointKeys[i]!;
		const prop = values[`less${capitalize(key)}`];
		if (prop !== undefined && !matchMedia[key]) {
			return prop;
		}
	}
	for (let i = 0; i < breakpointKeys.length; i += 1) {
		const key = breakpointKeys[breakpointKeys.length - i - 1]!;
		const prop = values[`more${capitalize(key)}`];
		if (prop !== undefined && !matchMedia[key]) {
			return prop;
		}
	}
	return defaultValue;
};
