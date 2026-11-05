import React from "react";

import {
	Toast,
	ToastProvider as ToastProviderRaw,
	useToast,
} from "heroui-native/toast";
import { tv } from "tailwind-variants";

import { Icon } from "~components/icons";
import type { IconName } from "~components/icons";
import type { AddProps, ToastProviderProps } from "~components/toast";
import { View } from "~components/view";
import { MAX_VISIBLE_TOASTS, TOAST_TIMEOUT } from "~utils/toast";

let toastManager: ReturnType<typeof useToast> | undefined = undefined;
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
	const localToastManager = useToast();
	React.useEffect(() => {
		toastManager = localToastManager;
	}, [localToastManager]);
	return (
		<ToastProviderRaw
			maxVisibleToasts={MAX_VISIBLE_TOASTS}
			defaultProps={{
				animation: import.meta.env.MODE === "test" ? "disable-all" : undefined,
			}}
		>
			{children}
		</ToastProviderRaw>
	);
};

export const closeAllToasts = () => {
	if (!toastManager) {
		return;
	}
	toastManager.toast.hide("all");
};
export const closeToastById = (id: string) => {
	if (!toastManager) {
		return;
	}
	toastManager.toast.hide(id);
};
export const getToastsAmount = () => {
	if (!toastManager) {
		return;
	}
	// This is wrong
	return toastManager.isToastVisible ? 1 : 0;
};

const icons: Record<NonNullable<AddProps["color"]>, IconName> = {
	default: "info",
	success: "check",
	danger: "warning",
};

const toast = tv({
	slots: {
		wrapper: "flex-row items-center gap-4",
		icon: "size-5",
		title: "",
		description: "",
	},
	variants: {
		color: {
			default: {
				wrapper: "bg-overlay border-overlay",
				icon: "text-overlay-foreground",
				title: "text-overlay-foreground",
				description: "text-muted",
			},
			success: {
				wrapper: "bg-success/10 border-success/10",
				icon: "text-success",
				title: "text-success",
				description: "text-success",
			},
			danger: {
				wrapper: "bg-danger/10 border-danger/10",
				icon: "text-danger",
				title: "text-danger",
				description: "text-danger",
			},
		},
	},
	defaultVariants: {
		color: "default",
	},
});

export const addToast = ({
	title,
	description,
	timeout = TOAST_TIMEOUT,
	color = "default",
}: AddProps) => {
	if (!toastManager) {
		return;
	}
	return toastManager.toast.show({
		duration: timeout,
		component: (props) => {
			const slots = toast({ color });
			const close = () => props.hide(props.id);
			return (
				<Toast
					variant={color}
					placement="top"
					className={slots.wrapper()}
					{...props}
				>
					<Icon name={icons[color]} className={slots.icon()} />
					<View className="flex-1">
						<Toast.Title className={slots.title()}>{title}</Toast.Title>
						<Toast.Description className={slots.description()}>
							{description}
						</Toast.Description>
					</View>
					<View className="p-4" onPress={close}>
						<Icon name="close" className={slots.icon()} />
					</View>
				</Toast>
			);
		},
	});
};
