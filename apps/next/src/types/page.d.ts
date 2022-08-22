import React from "react";

import { NextPage } from "next";

export type PageWithLayout<P = Record<string, never>> = NextPage<P> & {
	// You can disable whichever you don't need
	LayoutComponent?: React.FC;
};
