import React from "react";
import { ScrollView, View } from "react-native";

import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { NavigationContext } from "~app/contexts/navigation-context";
import { useFormat } from "~app/hooks/use-format";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Form } from "~components/form";
import { HighlightedText } from "~components/highlighted-text";
import { Icon } from "~components/icons";
import { Text } from "~components/text";
import { cn } from "~components/utils";
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
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();
	const [formSwitch, setFormSwitch] = React.useState(false);
	const formId = React.useId();
	const [formSwitchById, setFormSwitchById] = React.useState(false);
	const [iconName, setIconName] = React.useState("none");
	return (
		<ScrollView className="bg-blue-300">
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
				<Button onClick={() => navigate({ to: "/debts" })}>
					Go to another page
				</Button>
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
