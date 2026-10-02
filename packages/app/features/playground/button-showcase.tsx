import React from "react";

import { Button, ButtonGroup } from "~components/button";
import { SaveButton } from "~components/save-button";
import { Text } from "~components/text";
import { View } from "~components/view";

import { Group, Section } from "./showcase-section";

const variants = [
	"flat",
	"solid",
	"bordered",
	"light",
	"faded",
	"shadow",
	"ghost",
] as const;
const colors = [
	"default",
	"primary",
	"secondary",
	"success",
	"warning",
	"danger",
] as const;

const ButtonExample = () => {
	const [presses, setPresses] = React.useState(0);
	return (
		<Section title="Button">
			<View className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
				{colors.flatMap((color) =>
					variants.map((variant) => (
						<Button
							key={`${color}-${variant}`}
							color={color}
							variant={variant}
							onPress={() => setPresses((count) => count + 1)}
						>
							{`${color} / ${variant}`}
						</Button>
					)),
				)}
			</View>
			<View className="flex flex-row flex-wrap gap-2">
				<Button isDisabled>Disabled</Button>
				<Button isLoading>Loading</Button>
			</View>
			<Text>Presses: {presses}</Text>
		</Section>
	);
};

const ButtonGroupShowcase = () => (
	<Section title="ButtonGroup">
		<Text>Primary / solid</Text>
		<ButtonGroup color="primary">
			<Button>First</Button>
			<Button>Second</Button>
			<Button>Third</Button>
			<Button>Fourth</Button>
		</ButtonGroup>
		<Text>Secondary / bordered</Text>
		<ButtonGroup variant="bordered" color="secondary">
			<Button>First</Button>
			<Button>Second</Button>
			<Button>Third</Button>
			<Button>Fourth</Button>
		</ButtonGroup>
		<Text>Danger / flat / disabled</Text>
		<ButtonGroup variant="flat" color="danger" isDisabled>
			<Button>First</Button>
			<Button>Second</Button>
			<Button>Third</Button>
			<Button>Fourth</Button>
		</ButtonGroup>
	</Section>
);

const SaveButtonShowcase = () => {
	const [saves, setSaves] = React.useState(0);
	return (
		<Section title="SaveButton">
			<SaveButton title="Save" onPress={() => setSaves((count) => count + 1)} />
			<Text>Saves: {saves}</Text>
		</Section>
	);
};

export const ButtonShowcase = () => (
	<Group title="Button">
		<ButtonExample />
		<ButtonGroupShowcase />
		<SaveButtonShowcase />
	</Group>
);
