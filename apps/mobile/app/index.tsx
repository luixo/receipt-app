import React from "react";
import { Button, Text, View } from "react-native";

import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { NavigationContext } from "~app/contexts/navigation-context";
import { useFormat } from "~app/hooks/use-format";
import { useTRPC } from "~app/utils/trpc";
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
	return (
		<View className="flex gap-2 rounded-md bg-blue-300 p-2">
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
				Current time in tz: {format.formatZonedDateTime(getNow.zonedDateTime())}
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
			<Button
				onPress={() => navigate({ to: "/debts" })}
				title="Go to another page"
			/>
		</View>
	);
};

export default Wrapper;
