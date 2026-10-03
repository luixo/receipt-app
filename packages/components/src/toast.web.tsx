import { Toast, toast } from "@heroui/react";

import { MAX_VISIBLE_TOASTS, TOAST_TIMEOUT } from "~utils/toast";

export type ToastProviderProps = React.PropsWithChildren;

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => (
	<>
		<Toast.Provider maxVisibleToasts={MAX_VISIBLE_TOASTS} />
		{children}
	</>
);

// FIXME: v3 has no animation toggle when clearing the queue.
export const closeAllToasts = (options: { disableAnimation?: boolean }) => {
	if (options.disableAnimation) {
		toast.clear();
		return;
	}
	toast.clear();
};
export const closeToastById = (id: string) => toast.close(id);
export const getToastsAmount = () => toast.getQueue().visibleToasts.length;

export type AddProps = {
	title: string;
	description?: string;
	timeout?: number;
	color?: "default" | "success" | "danger";
};

export const addToast = ({
	title,
	description,
	timeout = TOAST_TIMEOUT,
	color = "default",
}: AddProps) =>
	toast(title, {
		description,
		timeout: timeout === Infinity ? 0 : timeout,
		variant: color,
	});
