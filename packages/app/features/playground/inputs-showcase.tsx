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
				isClearable
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
				{(["primary", "secondary"] as const).map((variant) => (
					<Checkbox
						key={variant}
						variant={variant}
						isSelected={Boolean(selected[variant])}
						onValueChange={(value) =>
							setSelected((previous) => ({ ...previous, [variant]: value }))
						}
					>
						{variant}
					</Checkbox>
				))}
				<Checkbox isIndeterminate>Indeterminate</Checkbox>
				<Checkbox isDisabled>Disabled</Checkbox>
				<Checkbox
					// oxlint-disable-next-line react/no-unstable-nested-components
					icon={({ isSelected }) => (
						<Icon name={isSelected ? "moon" : "sun"} className="size-3" />
					)}
				>
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
			<DateInput value={date} onValueChange={setDate} variant="primary" />
			<DateInput value={date} onValueChange={setDate} variant="secondary" />
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
			{(["primary", "secondary"] as const).map((variant) => (
				<Input
					key={variant}
					label={variant}
					variant={variant}
					placeholder="Type here"
					value={values[variant] ?? ""}
					isClearable
					onValueChange={(value) =>
						setValues((previous) => ({ ...previous, [variant]: value }))
					}
				/>
			))}
			<Input label="Disabled" isDisabled />
			<Input label="With description" description="Example description" />
			<Input label="Password type" type="password" />
			<Input
				label="With start and end content"
				startContent={<Icon name="admin" className="size-6" />}
				endContent={<Icon name="login" className="size-6" />}
			/>
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
