import React from "react";

type MetaKey = "ctrl" | "alt" | "shift" | "meta";

export const useHotkey = (
	metaKeys: MetaKey[],
	key: string,
	onPress: () => void,
) => {
	React.useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			const didMatchMeta = metaKeys.every((metaKey) =>
				Boolean(event[`${metaKey}Key`]),
			);
			const didMatchKey = event.code === `Key${key.toUpperCase()}`;
			if (didMatchMeta && didMatchKey) {
				event.preventDefault();
				event.stopImmediatePropagation();
				onPress();
			}
		};
		document.addEventListener("keydown", handler, {
			passive: false,
		});
		return () => document.removeEventListener("keydown", handler);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [...metaKeys, key, onPress]);
};
