import React from "react";
import { View } from "react-native";

import { tv } from "@nextui-org/react";
import type { Toast as ToastType } from "react-hot-toast";
import { Toaster as RawToaster, ToastBar, toast } from "react-hot-toast";

declare global {
	interface Window {
		dismissToasts: () => void;
	}
}

const toaster = tv({
	base: "text-foreground bg-content4 border-2 border-solid",
	variants: {
		type: {
			success: "border-success",
			error: "border-danger",
		},
	},
});

const toastOptions = {
	className: toaster(),
	position: "bottom-right",
	error: {
		className: toaster({ type: "error" }),
	},
	success: {
		className: toaster({ type: "success" }),
	},
} as const;

const Toast: React.FC<ToastType> = (toastInstance) => {
	const { id, position } = toastInstance;
	const dismiss = React.useCallback(() => toast.dismiss(id), [id]);
	return (
		<View onClick={dismiss} aria-hidden>
			<ToastBar toast={toastInstance} position={position || "top-center"} />
		</View>
	);
};

export const Toaster: React.FC = () => {
	React.useEffect(() => {
		window.dismissToasts = () => toast.dismiss();
	}, []);
	return (
		<RawToaster
			toastOptions={toastOptions}
			containerClassName="toaster"
			gutter={12}
		>
			{(toastInstance) => <Toast {...toastInstance} />}
		</RawToaster>
	);
};
