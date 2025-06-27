import { getWebRequest } from "@tanstack/react-start/server";

export const getRequest = (): Request =>
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	import.meta.env.SSR ? getWebRequest()! : new Request("does-not-matter");
