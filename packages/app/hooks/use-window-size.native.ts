import { useWindowDimensions } from "react-native";

export const useWindowSize = () => {
	const { width, height } = useWindowDimensions();
	return { width, height };
};
