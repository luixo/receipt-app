import { useMountEffect } from "~app/hooks/use-mount-effect";

export const NATIVE_STYLESHEET_PRELOAD_ID = "react-native-preload-stylesheet";

export const useRemovePreloadedCss = () => {
	useMountEffect(() => {
		const style = document.getElementById(NATIVE_STYLESHEET_PRELOAD_ID);
		style?.remove();
	});
};
