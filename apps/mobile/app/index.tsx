import React from "react";
import { ScrollView } from "react-native";

import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useColorModes } from "~app/hooks/use-color-modes";
import { useFormat } from "~app/hooks/use-format";
import { useTRPC } from "~app/utils/trpc";
import { Button, ButtonGroup } from "~components/button";
import { Form } from "~components/form";
import { HighlightedText } from "~components/highlighted-text";
import { Icon } from "~components/icons";
import { Input } from "~components/input";
import { Spinner } from "~components/spinner";
import { Switch } from "~components/switch";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import { View } from "~components/view";
import { getNow } from "~utils/date";

const Wrapper = () => {
	const { t } = useTranslation();
	const trpc = useTRPC();
	const elements = useQueries({
		queries: [
			trpc.utils.ping.queryOptions({ timeout: 1000 }),
			trpc.utils.ping.queryOptions({ timeout: 3000 }),
			trpc.utils.ping.queryOptions({ timeout: 5000 }),
		],
	});
	const format = useFormat();
	const [formSwitch, setFormSwitch] = React.useState(false);
	const formId = React.useId();
	const [formSwitchById, setFormSwitchById] = React.useState(false);
	const [iconName, setIconName] = React.useState("none");
	const [value, setValue] = React.useState("?");
	const [switchValue, setSwitchValue] = React.useState(true);
	const {
		selected: [selectedColorMode, setSelectedColorMode],
	} = useColorModes();
	return (
		<ScrollView className="bg-background">
			<View className="flex gap-2 rounded-md p-2">
				<Text className="text-red-500">{t("titles.index")}</Text>
				<View className="flex rounded-md bg-blue-500 p-2">
					{elements.map(({ data, status }, index) => (
						// eslint-disable-next-line react/no-array-index-key
						<Text key={index} className="whitespace-pre text-red-500">
							{status}: {data}
						</Text>
					))}
				</View>
				<View className="flex flex-row flex-wrap items-center gap-2">
					<Switch isSelected={switchValue} onValueChange={setSwitchValue} />
					<Switch
						isSelected={switchValue}
						onValueChange={setSwitchValue}
						className="bg-red-500"
						thumbClassName="bg-amber-500"
					/>
					<Switch
						isSelected={switchValue}
						onValueChange={setSwitchValue}
						thumbIcon={<Icon name="sun" className="size-4" />}
					/>
					<Switch isSelected isDisabled />
					<Switch isSelected isReadOnly />
					{(["sm", "md", "lg"] as const).map((size) => (
						<Switch
							key={size}
							size={size}
							isSelected={switchValue}
							onValueChange={setSwitchValue}
						/>
					))}
				</View>
				<View className="flex flex-row items-center gap-2">
					{(["xs", "sm", "md", "lg"] as const).map((size) => (
						<Spinner key={size} size={size} />
					))}
				</View>
				<Button
					onPress={() =>
						setSelectedColorMode((nextColorMode) =>
							nextColorMode === "dark" ? "light" : "dark",
						)
					}
				>
					Set color mode to {selectedColorMode === "dark" ? "light" : "dark"}
				</Button>
				{(["inside", "outside", "outside-left"] as const).map((placement) =>
					(["sm", "md", "lg"] as const).map((size) => (
						<Input
							key={placement + size}
							startContent={<Icon name="search" className="size-5" />}
							endContent={<Icon name="search" className="size-5" />}
							value={value}
							isRequired
							labelPlacement={placement}
							label={`${placement}/${size} label`}
							size={size}
							onValueChange={setValue}
							placeholder="This is placeholder"
							isClearable
							description={`This is a ${placement}/${size}`}
							// errorMessage={`Error in ${placement}/${size}`}
						/>
					)),
				)}
				<View className="flex flex-row flex-wrap gap-2">
					<ButtonGroup variant="solid" color="primary">
						<Button>First</Button>
						<Button>Second</Button>
						<Button>Third</Button>
					</ButtonGroup>
					{(
						[
							"flat",
							"solid",
							"bordered",
							"light",
							"faded",
							"shadow",
							"ghost",
						] as const
					).map((variant) =>
						(
							[
								"default",
								"success",
								"primary",
								"secondary",
								"warning",
								"danger",
							] as const
						).map((color) => (
							<Button key={variant + color} variant={variant} color={color}>
								{variant}/{color}
							</Button>
						)),
					)}
				</View>
				<Text className="whitespace-pre text-red-500">
					Current time in tz:{" "}
					{format.formatZonedDateTime(getNow.zonedDateTime())}
				</Text>
				{[
					"font-thin",
					"font-extralight",
					"font-light",
					"font-normal",
					"font-medium",
					"font-semibold",
					"font-bold",
					"font-extrabold",
					"font-black",
				].map((className) => (
					<Text key={className} className={cn("text-xl", className)}>
						Hello {className}
					</Text>
				))}
				{(
					["span", "h1", "h2", "h3", "h4", "p", "blockquote", "code"] as const
				).map((variant) => (
					<Text key={variant} variant={variant}>
						Variant {variant}
					</Text>
				))}
				<View className="text-2xl text-amber-500">
					<Text>This should be amber and big from ancestor</Text>
				</View>
				<View className="flex flex-row gap-2">
					{(["eye", "plus", "login"] as const).map((name) => (
						<Icon
							key={name}
							name={name}
							className="size-8 text-sky-700"
							onClick={() => setIconName(name)}
						/>
					))}
					<Text>Selected icon: {iconName}</Text>
				</View>
				<HighlightedText>Hightlighted</HighlightedText>
				<Form onSubmit={() => setFormSwitch((prev) => !prev)}>
					<Button type="submit">Submit inline</Button>
					<View>
						<Text>Form switch: {formSwitch.toString()}</Text>
					</View>
				</Form>
				<Form onSubmit={() => setFormSwitchById((prev) => !prev)} id={formId}>
					<View>
						<Text>Form switch 2: {formSwitchById.toString()}</Text>
					</View>
				</Form>
				<Button type="submit" form={formId}>
					Submit by id
				</Button>
			</View>
		</ScrollView>
	);
};

export default Wrapper;
