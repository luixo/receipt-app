import React from "react";

import { Card, Link, Text } from "@nextui-org/react";

import { Theme } from "app/utils/styles";

type GradientColor = keyof Theme["colors"];
type GradientColorStop = [number, GradientColor];
export type Gradient = {
	colorStops: GradientColorStop[];
	degree: number;
};

const DEFAULT_GRADIENT: Gradient = {
	colorStops: [
		[-20, "blue100"],
		[50, "pink800"],
	],
	degree: 45,
};

type Props = {
	href: string;
	children: React.ReactNode;
	gradient?: Gradient;
};

export const CardButton: React.FC<Props> = ({
	href,
	children,
	gradient: { colorStops, degree } = DEFAULT_GRADIENT,
}) => (
	<Card>
		<Card.Body>
			<Link href={href} css={{ display: "block", textAlign: "center" }}>
				<Text
					h1
					css={{
						textGradient: `${degree}deg, ${colorStops
							.map(([position, color]) => `$${color} ${position}%`)
							.join(", ")}`,
					}}
				>
					{children}
				</Text>
			</Link>
		</Card.Body>
	</Card>
);
