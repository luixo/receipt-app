import React from "react";

import { Icon } from "~components/icons";
import { Switch } from "~components/switch";
import { Text } from "~components/text";
import { View } from "~components/view";

import { Group, Section } from "./showcase-section";

const SwitchShowcase = () => {
	const [selected, setSelected] = React.useState<Record<string, boolean>>({
		md: true,
	});
	return (
		<Section title="Switch">
			<View className="flex flex-row flex-wrap items-center gap-3">
				{(["sm", "md", "lg"] as const).map((size) => (
					<View key={size} className="flex items-center gap-1">
						<Switch
							aria-label={`${size} switch`}
							size={size}
							isSelected={Boolean(selected[size])}
							onValueChange={(value) =>
								setSelected((previous) => ({ ...previous, [size]: value }))
							}
						/>
						<Text>{size} size</Text>
					</View>
				))}
				<View className="flex items-center gap-1">
					<Switch
						aria-label="Switch with icon"
						isSelected={Boolean(selected.icon)}
						thumbIcon={<Icon name="sun" className="size-4" />}
						onValueChange={(value) =>
							setSelected((previous) => ({ ...previous, icon: value }))
						}
					/>
					<Text>With thumb icon</Text>
				</View>
				<View className="flex items-center gap-1">
					<Switch aria-label="Disabled switch" isSelected isDisabled />
					<Text>Disabled</Text>
				</View>
				<View className="flex items-center gap-1">
					<Switch aria-label="Read-only switch" isSelected isReadOnly />
					<Text>Read-only</Text>
				</View>
			</View>
		</Section>
	);
};

export const SwitchesShowcase = () => (
	<Group title="Switches">
		<SwitchShowcase />
	</Group>
);
