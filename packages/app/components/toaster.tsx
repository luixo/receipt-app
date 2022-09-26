import React from "react";

import { css } from "@nextui-org/react";
import {
	ToastBar,
	Toaster as RawToaster,
	toast,
	Toast as ToastType,
} from "react-hot-toast";

const toaster = css({
	background: "$backgroundContrast",
	color: "$text",
	borderWidth: 2,
	borderStyle: "solid",

	variants: {
		type: {
			success: {
				borderColor: "$success",
				"& > div > div > div": {
					background: "$success",
				},
			},
			error: {
				borderColor: "$error",
				"& > div > div > div": {
					background: "$error",
				},
			},
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
		<div onClick={dismiss} aria-hidden>
			<ToastBar toast={toastInstance} position={position || "top-center"} />
		</div>
	);
};

export const Toaster: React.FC = () => (
	<RawToaster toastOptions={toastOptions} gutter={12}>
		{(toastInstance) => <Toast {...toastInstance} />}
	</RawToaster>
);
