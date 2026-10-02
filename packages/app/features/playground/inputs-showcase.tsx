import React from "react";

import { Autocomplete } from "~components/autocomplete";
import { Button } from "~components/button";
import { Checkbox } from "~components/checkbox";
import { DateInput } from "~components/date-input";
import { FileInput } from "~components/file-input";
import { Form } from "~components/form";
import { Icon } from "~components/icons";
import { Input } from "~components/input";
import { NumberInput } from "~components/number-input";
import { Slider } from "~components/slider";
import { Text } from "~components/text";
import { View } from "~components/view";

import { Group, Section } from "./showcase-section";

const ITEMS = ["Apple", "Banana", "Cherry"];

const AutocompleteShowcase = () => {
	const [inputValue, setInputValue] = React.useState("");
	const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
	return (
		<Section title="Autocomplete">
			<Autocomplete
				label="Fruit"
				placeholder="Search fruit"
				emptyContent="No fruit found"
				inputValue={inputValue}
				onInputChange={setInputValue}
				selectedKey={selectedKey}
				onSelectionChange={setSelectedKey}
				onClear={() => {
					setInputValue("");
					setSelectedKey(null);
				}}
			>
				{[
					{
						key: "fruit",
						title: "Fruit",
						items: ITEMS.map((item) => ({
							key: item,
							textValue: item,
							children: <Text>{item}</Text>,
						})),
					},
				]}
			</Autocomplete>
			<Text>Selected: {selectedKey ?? "none"}</Text>
		</Section>
	);
};

const CheckboxShowcase = () => {
	const [selected, setSelected] = React.useState<Record<string, boolean>>({
		primary: true,
	});
	return (
		<Section title="Checkbox">
			<View className="flex flex-row flex-wrap gap-3">
				{(["default", "primary", "success", "warning", "danger"] as const).map(
					(color) => (
						<Checkbox
							key={color}
							color={color}
							isSelected={Boolean(selected[color])}
							onValueChange={(value) =>
								setSelected((previous) => ({ ...previous, [color]: value }))
							}
						>
							{color}
						</Checkbox>
					),
				)}
				<Checkbox isIndeterminate>Indeterminate</Checkbox>
				<Checkbox isDisabled>Disabled</Checkbox>
				<Checkbox icon={<Icon name="check" className="size-4" />}>
					Custom icon
				</Checkbox>
			</View>
		</Section>
	);
};

const DateInputShowcase = () => {
	const [date, setDate] = React.useState<Temporal.PlainDate | undefined>();
	return (
		<Section title="DateInput">
			<DateInput value={date} onValueChange={setDate} />
			<Text>Selected: {date?.toString() ?? "none"}</Text>
		</Section>
	);
};

const FileInputShowcase = () => {
	const clickRef = React.useRef<() => void>(() => undefined);
	const [image, setImage] = React.useState("");
	return (
		<Section title="FileInput">
			<FileInput onClickRef={clickRef} onFileUpdate={setImage} />
			<Button onPress={() => clickRef.current()}>Choose an image</Button>
			<Text>{image ? "File loaded" : "No file selected"}</Text>
		</Section>
	);
};

const FormShowcase = () => {
	const [submits, setSubmits] = React.useState(0);
	const formId = React.useId();
	return (
		<Section title="Form">
			<Form id={formId} onSubmit={() => setSubmits((count) => count + 1)}>
				<Button type="submit">Submit inside form</Button>
			</Form>
			<Button type="submit" form={formId}>
				Submit outside form
			</Button>
			<Text>Submissions: {submits}</Text>
		</Section>
	);
};

const InputShowcase = () => {
	const [values, setValues] = React.useState<Record<string, string>>({});
	return (
		<Section title="Input">
			{(["bordered", "flat"] as const).map((variant) =>
				(
					[
						"default",
						"primary",
						"secondary",
						"success",
						"warning",
						"danger",
					] as const
				).map((color) => {
					const key = `${variant}-${color}`;
					return (
						<Input
							key={key}
							label={`${color} / ${variant}`}
							variant={variant}
							color={color}
							placeholder="Type here"
							value={values[key] ?? ""}
							isClearable
							onValueChange={(value) =>
								setValues((previous) => ({ ...previous, [key]: value }))
							}
						/>
					);
				}),
			)}
			<Input label="Disabled" isDisabled />
			<Input label="With description" description="Example description" />
		</Section>
	);
};

const NumberInputShowcase = () => {
	const [value, setValue] = React.useState(0);
	return (
		<Section title="NumberInput">
			<NumberInput
				value={value}
				onValueChange={setValue}
				fractionDigits={2}
				minValue={0}
			/>
			<Text>Value: {value}</Text>
		</Section>
	);
};

const SliderShowcase = () => {
	const [value, setValue] = React.useState(5);
	return (
		<Section title="Slider">
			<Slider
				label="Amount"
				minValue={0}
				maxValue={10}
				step={1}
				value={value}
				onChange={setValue}
			/>
			<Text>Value: {value}</Text>
		</Section>
	);
};

export const InputsShowcase = () => (
	<Group title="Inputs">
		<AutocompleteShowcase />
		<CheckboxShowcase />
		<DateInputShowcase />
		<FileInputShowcase />
		<FormShowcase />
		<InputShowcase />
		<NumberInputShowcase />
		<SliderShowcase />
	</Group>
);
