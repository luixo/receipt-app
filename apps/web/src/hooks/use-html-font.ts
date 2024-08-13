import React from "react";

export const useHtmlFont = (fontVariable: string) => {
	React.useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const html = document.querySelector("html")!;
		html.classList.add(fontVariable);
		html.classList.add("font-sans");
		return () => html.classList.remove(fontVariable);
	}, [fontVariable]);
};
