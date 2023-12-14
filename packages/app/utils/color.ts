// see https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB_alternative
export const hslToRgb = (
	hueAngle: number,
	saturation: number,
	lightness: number,
): string => {
	const lightSaturation = saturation * Math.min(lightness, 1 - lightness);
	const getColor = (rotationShift: number) => {
		const coef = (rotationShift + hueAngle / 30) % 12;
		const colorComponent =
			lightness -
			lightSaturation * Math.max(-1, Math.min(coef - 3, Math.min(9 - coef, 1)));
		return Math.round(255 * colorComponent)
			.toString(16)
			.padStart(2, "0");
	};
	return `${getColor(0)}${getColor(8)}${getColor(4)}`;
};
