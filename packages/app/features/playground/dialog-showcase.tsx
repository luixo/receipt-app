import React from "react";

import { Avatar } from "~components/avatar";
import { Button } from "~components/button";
import { Card } from "~components/card";
import { Dropdown } from "~components/dropdown";
import { Modal } from "~components/modal";
import { Overlay } from "~components/overlay";
import { Select } from "~components/select";
import { Spinner } from "~components/spinner";
import { Switch } from "~components/switch";
import { Text } from "~components/text";
import { addToast, closeToastById } from "~components/toast";
import { Tooltip } from "~components/tooltip";
import { View } from "~components/view";

import { Group, Section } from "./showcase-section";

const ITEMS = ["Apple", "Banana", "Cherry"];

const DropdownShowcase = () => (
	<Section title="Dropdown">
		<Dropdown
			items={[
				{ key: "edit", children: "Edit" },
				{ key: "share", children: "Share" },
			]}
		>
			<Button>Open menu</Button>
		</Dropdown>
	</Section>
);

const SelectShowcase = () => {
	const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
	return (
		<Section title="Select">
			<Select
				label="Fruit"
				placeholder="Choose fruit"
				items={ITEMS.map((item) => ({ item }))}
				selectedKeys={selectedKeys}
				onSelectionChange={setSelectedKeys}
				selectionMode="multiple"
				getKey={({ item }) => item}
				getTextValue={({ item }) => item}
				renderValue={(items) => (
					<Text>{items.map(({ item }) => item).join(", ")}</Text>
				)}
			>
				{({ item }) => (
					<View key={item} className="flex flex-row items-center gap-2">
						<Avatar hashId={item} size="sm" />
						<Text>{item}</Text>
					</View>
				)}
			</Select>
			<Text>Selected: {selectedKeys.join(", ") || "none"}</Text>
		</Section>
	);
};

const ModalShowcase = () => {
	const [open, setOpen] = React.useState(false);
	return (
		<Section title="Modal">
			<Button onPress={() => setOpen(true)}>Open modal</Button>
			<Modal
				label="Example modal"
				closeButton
				isOpen={open}
				onOpenChange={setOpen}
				header={<Text variant="h3">Modal heading</Text>}
			>
				<Text>Modal body</Text>
				<Button onPress={() => setOpen(false)}>Close</Button>
			</Modal>
		</Section>
	);
};

const OverlayShowcase = () => {
	const [loading, setLoading] = React.useState(false);
	return (
		<Section title="Overlay">
			<Overlay overlay={loading ? <Spinner size="lg" /> : null}>
				<Card header={<Text>Overlay target</Text>}>
					<Text>Toggle the loading layer</Text>
				</Card>
			</Overlay>
			<Switch isSelected={loading} onValueChange={setLoading} />
		</Section>
	);
};

const ToastShowcase = () => {
	const [ids, setIds] = React.useState<string[]>([]);
	const show = () => {
		const id = addToast({
			title: "Playground toast",
			description: "Try closing this toast",
			color: "success",
		});
		if (id) {
			setIds((previous) => [...previous, id]);
		}
	};
	const closeLast = () => {
		const id = ids.at(-1);
		if (id) {
			closeToastById(id);
			setIds((previous) => previous.filter((item) => item !== id));
		}
	};
	return (
		<Section title="Toast">
			<View className="flex flex-row gap-2">
				<Button onPress={show}>Show toast</Button>
				<Button onPress={closeLast} isDisabled={ids.length === 0}>
					Close last
				</Button>
			</View>
		</Section>
	);
};

const TooltipShowcase = () => {
	const [enabled, setEnabled] = React.useState(true);
	return (
		<Section title="Tooltip">
			<Tooltip content="Tooltip content" isDisabled={!enabled}>
				<View>
					<Text>Hover or press for tooltip</Text>
				</View>
			</Tooltip>
			<Switch isSelected={enabled} onValueChange={setEnabled} />
		</Section>
	);
};

export const DialogShowcase = () => (
	<Group title="Dialog">
		<DropdownShowcase />
		<SelectShowcase />
		<ModalShowcase />
		<OverlayShowcase />
		<ToastShowcase />
		<TooltipShowcase />
	</Group>
);
