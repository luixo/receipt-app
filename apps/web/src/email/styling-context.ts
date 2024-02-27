import React from "react";

export type AugmentedProperies = React.CSSProperties & {
	msoHide?: string;
	msoTableLspace?: string;
	msoTableRspace?: string;
	MsTextSizeAdjust?: string;
};

export const StylingContext = React.createContext<
	Record<
		string,
		{
			default: AugmentedProperies | undefined;
			[key: string]: AugmentedProperies | undefined;
		}
	>
>({});
