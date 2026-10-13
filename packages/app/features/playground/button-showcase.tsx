import React from "react";

import { Button, ButtonGroup } from "~components/button";
import { SaveButton } from "~components/save-button";
import { Text } from "~components/text";
import { View } from "~components/view";

import { Group, Section } from "./showcase-section";

const variants = [
	"danger",
	"danger-soft",
	"ghost",
	"outline",
	"primary",
	"secondary",
	"tertiary",
] as const;

const ButtonExample = () => {
	const [presses, setPresses] = React.useState(0);
	return (
		<Section title="Button">
			<View className="flex flex-row flex-wrap gap-2">
				{variants.map((variant) => (
					<Button
						key={variant}
						variant={variant}
						onPress={() => setPresses((count) => count + 1)}
					>
						{variant}
					</Button>
				))}
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
	<Section title="ButtonGroup" className="items-center">
		<Text>Primary</Text>
		<ButtonGroup variant="primary">
			<Button>First</Button>
			<Button>Second</Button>
			<Button>Third</Button>
			<Button>Fourth</Button>
		</ButtonGroup>
		<Text>Outline</Text>
		<ButtonGroup variant="outline">
			<Button>First</Button>
			<Button>Second</Button>
			<Button>Third</Button>
			<Button>Fourth</Button>
		</ButtonGroup>
		<Text>Secondary</Text>
		<ButtonGroup variant="secondary">
			<Button>First</Button>
			<Button>Second</Button>
			<Button>Third</Button>
			<Button>Fourth</Button>
		</ButtonGroup>
		<Text>Ghost</Text>
		<ButtonGroup variant="ghost">
			<Button>First</Button>
			<Button>Second</Button>
			<Button>Third</Button>
			<Button>Fourth</Button>
		</ButtonGroup>
		<Text>Danger / disabled</Text>
		<ButtonGroup variant="danger" isDisabled>
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
