import React from "react";

import { isDeepEqual } from "remeda";

export const useGetMemoizedValue = <T>(getValue: () => T) => {
	const snapshotRef = React.useRef<T | null>(null);
	return React.useCallback(() => {
		const nextSnapshot = getValue();
		if (
			snapshotRef.current !== null &&
			isDeepEqual<T>(snapshotRef.current, nextSnapshot)
		) {
			return snapshotRef.current;
		}
		snapshotRef.current = nextSnapshot;
		return nextSnapshot;
	}, [getValue]);
};
