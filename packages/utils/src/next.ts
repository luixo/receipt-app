import type { NextPage } from "next";

export type AppPage<P = Record<string, never>> = NextPage<P> & {
	// You can disable whichever you don't need
	public?: boolean;
};
