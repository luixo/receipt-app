import { Stack as StackRaw } from "expo-router";
import { useCSSVariable } from "uniwind";

export const Stack = () => {
	const backgroundColor = useCSSVariable(`--heroui-background`) as string;
	return (
		<StackRaw
			screenOptions={{ headerShown: false, contentStyle: { backgroundColor } }}
		/>
	);
};
