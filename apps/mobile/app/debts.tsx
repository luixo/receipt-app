import React from "react";
import { Button } from "react-native";

import { useSuspenseQuery } from "@tanstack/react-query";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { NavigationContext } from "~app/contexts/navigation-context";
import { useTRPC } from "~app/utils/trpc";
import { Text } from "~components/text";
import { View } from "~components/view";

const SuspendedComponent = suspendedFallback(
	() => {
		const trpc = useTRPC();
		const { data } = useSuspenseQuery(
			trpc.utils.ping.queryOptions({ timeout: 3000, error: true }),
		);
		return <Text>Done: {data}</Text>;
	},
	() => <Text>Loading...</Text>,
);

const Wrapper = () => {
	const { useBack } = React.use(NavigationContext);
	const goBack = useBack();
	return (
		<View className="flex gap-2 rounded-md bg-blue-300 p-2">
			<Text className="text-red-500">This is another page</Text>
			<SuspendedComponent />
			<Button onPress={goBack} title="Go back" />
		</View>
	);
};

export default Wrapper;
