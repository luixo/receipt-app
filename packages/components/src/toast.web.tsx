import {
	ToastProvider as ToastProviderRaw,
	addToast as addToastRaw,
	closeAll,
	getToastQueue,
} from "@heroui/toast";

import {
	DESCRIPTION_CLASSNAME,
	MAX_VISIBLE_TOASTS,
	TOAST_TIMEOUT,
} from "~utils/toast";

export type ToastProviderProps = React.PropsWithChildren;

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => (
	<>
		<ToastProviderRaw
			maxVisibleToasts={MAX_VISIBLE_TOASTS}
			toastProps={{
				shouldShowTimeoutProgress: true,
				classNames: {
					description: DESCRIPTION_CLASSNAME,
				},
				disableAnimation: import.meta.env.MODE === "test",
			}}
		/>
		{children}
	</>
);

export const closeAllToasts = ({
	disableAnimation,
}: {
	disableAnimation?: boolean;
}) => closeAll({ disableAnimation });
export const closeToastById = (id: string) => getToastQueue().close(id);
export const getToastsAmount = () => getToastQueue().visibleToasts.length;

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
	addToastRaw({
		title,
		description,
		timeout,
		color,
	});
