import { useMountEffect } from "~app/hooks/use-mount-effect";

export const useHydratedMark = () => {
	useMountEffect(() => {
		if (import.meta.env.MODE !== "test") {
			return;
		}
		if (!document.querySelector("hydrated")) {
			document.body.appendChild(document.createElement("hydrated"));
		}
	});
};
