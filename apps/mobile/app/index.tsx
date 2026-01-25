import React from "react";
import { ScrollView } from "react-native";

import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { SkeletonUser } from "~app/components/app/user";
import { useColorModes } from "~app/hooks/use-color-modes";
import { useFormat } from "~app/hooks/use-format";
import { useTRPC } from "~app/utils/trpc";
import { Avatar, AvatarGroup } from "~components/avatar";
import { Button, ButtonGroup } from "~components/button";
import { Checkbox } from "~components/checkbox";
import { Chip } from "~components/chip";
import { DateInput } from "~components/date-input";
import { Divider } from "~components/divider";
import { Form } from "~components/form";
import { HighlightedText } from "~components/highlighted-text";
import { Icon } from "~components/icons";
import { Input } from "~components/input";
import { NumberInput } from "~components/number-input";
import { Skeleton } from "~components/skeleton";
import { SkeletonAvatar } from "~components/skeleton-avatar";
import { Spinner } from "~components/spinner";
import { Switch } from "~components/switch";
import { Text } from "~components/text";
import { addToast, closeToastById } from "~components/toast";
import { User } from "~components/user";
import { cn } from "~components/utils";
import { View } from "~components/view";
import { type Temporal, getNow } from "~utils/date";

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
	// This is false positive
	// eslint-disable-next-line react/hook-use-state
	const [date, changeDate] = React.useState<Temporal.PlainDate | undefined>(
		undefined,
	);
	const [numberValue, setNumberValue] = React.useState(0);
	const [toastIds, setToastIds] = React.useState<string[]>([]);
	const runToast = () => {
		const nextId = addToast({
			title: "Hello test toast",
			description: "Test toast description",
			color:
				toastIds.length === 0
					? "default"
					: toastIds.length === 1
						? "success"
						: "danger",
		});
		setTimeout(() => {
			if (nextId) {
				setToastIds((prevIds) => prevIds.filter((id) => id !== nextId));
			}
		}, 3000);
		setToastIds((prevIds) => (nextId ? [...prevIds, nextId] : prevIds));
	};
	const closeLast = () => {
		if (toastIds.length === 0) {
			return;
		}
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const lastId = toastIds.at(-1)!;
		closeToastById(lastId);
		setToastIds((prevIds) => prevIds.filter((id) => id !== lastId));
	};
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
				<View className="flex flex-row flex-wrap gap-2">
					<Button onPress={runToast}>Run toast</Button>
					{toastIds.length !== 0 ? (
						<Button onPress={closeLast}>Close last</Button>
					) : null}
				</View>
				<View className="flex flex-row flex-wrap gap-2">
					<DateInput value={date} onValueChange={changeDate} />
				</View>
				<View className="flex flex-row flex-wrap gap-2">
					{(
						["default", "primary", "success", "warning", "danger"] as const
					).map((color) => (
						<Checkbox
							key={color}
							color={color}
							size={
								color === "primary" ? "lg" : color === "success" ? "sm" : "md"
							}
							isSelected={color === "primary" ? !switchValue : switchValue}
							isIndeterminate={color === "success"}
							isDisabled={color === "warning"}
							onValueChange={setSwitchValue}
						>
							{color}
						</Checkbox>
					))}
					<Checkbox isSelected />
					<Checkbox
						icon={<Icon name="arrow-down" className="size-4" />}
						isSelected={switchValue}
						onValueChange={setSwitchValue}
					/>
					<Checkbox />
				</View>
				<View className="flex flex-row flex-wrap gap-2">
					{(
						["default", "primary", "success", "warning", "danger"] as const
					).map((color) => (
						<Chip key={color} color={color}>
							{color}
						</Chip>
					))}
				</View>
				<View className="flex flex-row flex-wrap gap-2">
					<User name="Ivan" description="Serious man" />
					<SkeletonUser />
				</View>
				<View className="flex flex-row flex-wrap gap-2">
					<AvatarGroup size="sm">
						<Avatar hashId="a" />
						<Avatar hashId="b" />
						<Avatar hashId="c" />
						<Avatar hashId="b" />
						<Avatar hashId="c" />
						<Avatar hashId="b" />
						<Avatar hashId="c" />
					</AvatarGroup>
					<Avatar
						hashId="b"
						dimmed
						image={{
							url: "https://storage.yandexcloud.net/receipts-production/avatars/9652419b-b5f3-46c9-9a44-40c197cba11d.png",
							alt: "Avatar",
						}}
					/>
					<Avatar hashId="c" size="sm" />
					<Avatar hashId="d" size="lg" />
					<SkeletonAvatar />
				</View>
				<Divider className="my-2" />
				<NumberInput
					value={numberValue}
					onValueChange={setNumberValue}
					fractionDigits={2}
					isRequired
					minValue={0}
				/>
				<Skeleton className="h-6 w-20 rounded-md" />
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
				{(["bordered", "flat"] as const).map((variant) =>
					(
						[
							"default",
							"primary",
							"secondary",
							"danger",
							"warning",
							"success",
						] as const
					).map((color) => (
						<Input
							key={variant + color}
							startContent={<Icon name="search" className="size-5" />}
							endContent={<Icon name="search" className="size-5" />}
							value={value}
							isRequired
							color={color}
							label={`${color} / ${variant} label`}
							variant={variant}
							onValueChange={setValue}
							labelPlacement={
								color === "primary"
									? "outside"
									: color === "secondary"
										? "outside-left"
										: undefined
							}
							placeholder="This is placeholder"
							isClearable
							description={`This is a ${variant}/${
								color === "primary"
									? "outside"
									: color === "secondary"
										? "outside-left"
										: "inside"
							}`}
							// errorMessage={`Error in ${placement}/${variant}`}
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
