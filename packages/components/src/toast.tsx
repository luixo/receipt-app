import type React from "react";

import type { ToastProvider } from "@heroui/toast";

import { DESCRIPTION_CLASSNAME } from "~utils/toast";

export {
	addToast,
	closeAll,
	ToastProvider,
	getToastQueue,
} from "@heroui/toast";

export const defaultToastProps: React.ComponentProps<
	typeof ToastProvider
>["toastProps"] = {
	timeout: 3000,
	shouldShowTimeoutProgress: true,
	classNames: {
		description: DESCRIPTION_CLASSNAME,
	},
};
