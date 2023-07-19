import React from "react";

export const useMountEffect = (callback: React.EffectCallback) => {
	// eslint-disable-next-line react-hooks/exhaustive-deps
	React.useEffect(callback, []);
};
