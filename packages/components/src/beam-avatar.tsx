import React from "react";

import type * as svg from "react-native-svg";

import { hslToRgb } from "~utils/color";

const DEGREES = 360;
// We use a color from a color circle divided in given sectors
// effectively having a spread variety of colors around the circle
const SECTORS = 36;
const COLORS = new Array(SECTORS)
	.fill(null)
	.map((_, index) => `#${hslToRgb(index * (DEGREES / SECTORS), 0.7, 0.5)}`);

/*
	This is a universal more-or-less copy from
	https://github.com/boringdesigners/boring-avatars/blob/master/src/lib/components/avatar-beam.tsx
*/

const BASE_SIZE = 36;

const hashCode = (name: string) =>
	Math.abs(
		name.split("").reduce((hash, char) => {
			// Bitwise calculations
			/* eslint-disable no-bitwise */
			const codePoint = char.codePointAt(0) ?? 0;
			const tempHash = (hash << 5) - hash + codePoint;
			return tempHash & tempHash;
			/* eslint-enable no-bitwise */
		}, 0),
	);

const getBoolean = (number: number, ntn: number): boolean =>
	Math.floor((number / 10 ** ntn) % 10) % 2 === 0;

const getUnit = (number: number, range: number, index?: number): number => {
	const value = number % range;
	return index ? (getBoolean(number, index) ? -value : value) : value;
};

const getContrast = (hexcolor: string): string => {
	// Convert to RGB value
	const r = parseInt(hexcolor.slice(1, 3), 16);
	const g = parseInt(hexcolor.slice(3, 5), 16);
	const b = parseInt(hexcolor.slice(5, 7), 16);
	// Get YIQ ratio
	const yiq = (r * 299 + g * 587 + b * 114) / 1000;
	// Check contrast
	return yiq >= 128 ? "#000000" : "#FFFFFF";
};

type SvgComponents = {
	Svg: React.ComponentType<
		Pick<
			React.ComponentProps<typeof svg.Svg>,
			"viewBox" | "role" | "width" | "height" | "children"
		> & { fill?: string }
	>;
	Mask: React.ComponentType<
		Pick<
			React.ComponentProps<typeof svg.Mask>,
			"id" | "maskUnits" | "x" | "y" | "width" | "height" | "children"
		>
	>;
	Rect: React.ComponentType<
		Pick<
			React.ComponentProps<typeof svg.Rect>,
			"x" | "y" | "width" | "height" | "rx"
		> & { fill?: string; transform?: string; stroke?: string }
	>;
	G: React.ComponentType<
		Pick<React.ComponentProps<typeof svg.G>, "mask" | "filter" | "children"> & {
			transform?: string;
		}
	>;
	Path: React.ComponentType<
		Pick<React.ComponentProps<typeof svg.Path>, "d" | "strokeLinecap"> & {
			fill?: string;
			stroke?: string;
		}
	>;
	Filter: React.ComponentType<
		Pick<
			React.ComponentProps<typeof svg.Filter>,
			"id" | "filterUnits" | "x" | "y" | "width" | "height" | "children"
		>
	>;
	FeColorMatrix: React.ComponentType<
		Pick<React.ComponentProps<typeof svg.FeColorMatrix>, "in" | "type"> & {
			values?: string;
		}
	>;
};

export const BeamAvatar = ({
	components,
	size,
	name,
	dimmed,
}: {
	components: SvgComponents;
	size: number;
	name: string;
	dimmed?: boolean;
}) => {
	const maskId = React.useId();
	const filterId = React.useId();
	const nameHash = hashCode(name);
	const preTranslateX = getUnit(nameHash, 10, 1);
	const preTranslateY = getUnit(nameHash, 10, 2);
	const wrapperTranslateX =
		preTranslateX < 5 ? preTranslateX + BASE_SIZE / 9 : preTranslateX;
	const wrapperTranslateY =
		preTranslateY < 5 ? preTranslateY + BASE_SIZE / 9 : preTranslateY;

	const faceTranslateX =
		wrapperTranslateX > BASE_SIZE / 6
			? wrapperTranslateX / 2
			: getUnit(nameHash, 8, 1);
	const faceTranslateY =
		wrapperTranslateY > BASE_SIZE / 6
			? wrapperTranslateY / 2
			: getUnit(nameHash, 7, 2);
	const wrapperRotate = getUnit(nameHash, 360);
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const wrapperColor = COLORS[nameHash % COLORS.length]!;
	const backgroundColor = COLORS[(nameHash + 13) % COLORS.length];
	const wrapperScale = 1 + getUnit(nameHash, BASE_SIZE / 12) / 10;
	const isMouthOpen = getBoolean(nameHash, 2);
	const isCircle = getBoolean(nameHash, 1);
	const faceColor = getContrast(wrapperColor);
	const eyeSpread = getUnit(nameHash, 5);
	const mouthSpread = getUnit(nameHash, 3);
	const faceRotate = getUnit(nameHash, 10, 3);
	return (
		// There are a lot of false positives for `x` and `y`
		/* eslint-disable @typescript-eslint/no-deprecated */
		<components.Svg
			viewBox={`0 0 ${BASE_SIZE} ${BASE_SIZE}`}
			fill="none"
			role="img"
			width={size}
			height={size}
		>
			{dimmed ? (
				<components.Filter
					id={filterId}
					filterUnits="objectBoundingBox"
					x={0}
					y={0}
					width="100%"
					height="100%"
				>
					<components.FeColorMatrix
						in="SourceGraphic"
						type="saturate"
						values="0"
					/>
				</components.Filter>
			) : undefined}
			<components.Mask
				id={maskId}
				maskUnits="userSpaceOnUse"
				x={0}
				y={0}
				width="100%"
				height="100%"
			>
				<components.Rect
					width={BASE_SIZE}
					height={BASE_SIZE}
					rx={BASE_SIZE * 2}
					fill="#FFFFFF"
				/>
			</components.Mask>
			<components.G
				mask={`url(#${maskId})`}
				filter={dimmed ? `url(#${filterId})` : undefined}
			>
				<components.Rect
					width={BASE_SIZE}
					height={BASE_SIZE}
					fill={backgroundColor}
				/>
				<components.Rect
					x={0}
					y={0}
					width={BASE_SIZE}
					height={BASE_SIZE}
					transform={`translate(${wrapperTranslateX} ${
						wrapperTranslateY
					}) rotate(${wrapperRotate} ${BASE_SIZE / 2} ${
						BASE_SIZE / 2
					}) scale(${wrapperScale})`}
					fill={wrapperColor}
					rx={isCircle ? BASE_SIZE : BASE_SIZE / 6}
				/>
				<components.G
					transform={`translate(${faceTranslateX} ${
						faceTranslateY
					}) rotate(${faceRotate} ${BASE_SIZE / 2} ${BASE_SIZE / 2})`}
				>
					{isMouthOpen ? (
						<components.Path
							d={`M15 ${19 + mouthSpread}c2 1 4 1 6 0`}
							stroke={faceColor}
							fill="none"
							strokeLinecap="round"
						/>
					) : (
						<components.Path
							d={`M13,${19 + mouthSpread} a1,0.75 0 0,0 10,0`}
							fill={faceColor}
						/>
					)}
					<components.Rect
						x={14 - eyeSpread}
						y={14}
						width={1.5}
						height={2}
						rx={1}
						stroke="none"
						fill={faceColor}
					/>
					<components.Rect
						x={20 + eyeSpread}
						y={14}
						width={1.5}
						height={2}
						rx={1}
						stroke="none"
						fill={faceColor}
					/>
				</components.G>
			</components.G>
		</components.Svg>
		/* eslint-enable @typescript-eslint/no-deprecated */
	);
};
