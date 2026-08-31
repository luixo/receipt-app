import React from "react";

export const useMountEffect = (callback: React.EffectCallback) => {
	// oxlint-disable-next-line react-hooks/exhaustive-deps
	React.useEffect(callback, []);
};
