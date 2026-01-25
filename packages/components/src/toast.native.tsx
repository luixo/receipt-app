import React from "react";

import { tv } from "@heroui/react";
import {
	Toast,
	ToastProvider as ToastProviderRaw,
	useToast,
} from "heroui-native";

import { Icon, type IconName } from "~components/icons";
import type { AddProps, ToastProviderProps } from "~components/toast";
import { View } from "~components/view";
import { MAX_VISIBLE_TOASTS, TOAST_TIMEOUT } from "~utils/toast";

let toastManager: ReturnType<typeof useToast> | undefined;
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
				wrapper: "bg-content1 border-content1",
				icon: "text-foreground",
				title: "text-foreground",
				description: "text-default-500",
			},
			success: {
				wrapper: "bg-success-50 border-success-50",
				icon: "text-success-600",
				title: "text-success-600",
				description: "text-success-500",
			},
			danger: {
				wrapper: "bg-danger-50 border-danger-50",
				icon: "text-danger-600",
				title: "text-danger-600",
				description: "text-danger-500",
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
						<Icon name="close" className={slots.icon()} onClick={close} />
					</View>
				</Toast>
			);
		},
	});
};
