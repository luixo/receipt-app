import { useMountEffect } from "app/hooks/use-mount-effect";

export const useHydratedMark = () => {
	useMountEffect(() => {
		if (process.env.NEXT_PUBLIC_ENV !== "test") {
			return;
		}
		if (!document.querySelector("hydrated")) {
			document.body.appendChild(document.createElement("hydrated"));
		}
	});
};
