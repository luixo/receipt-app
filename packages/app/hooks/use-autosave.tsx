import React from "react";

import type { AnyFormApi } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-form";
import { useDebouncedCallback } from "@tanstack/react-pacer";

import { CheckMark } from "~components/icons";
import { Spinner } from "~components/spinner";

export const useAutosave = ({
	isUpdatePending,
	className = "",
	submitDebounceMs = 2000,
}: {
	isUpdatePending: boolean;
	className?: string;
	submitDebounceMs?: number;
}) => {
	const [eagerToSubmit, setEagerToSubmit] = React.useState(false);
	const [justSaved, setJustSaved] = React.useState(false);
	const onSuccess = React.useCallback(() => {
		setJustSaved(true);
		setTimeout(() => setJustSaved(false), 2000);
	}, []);
	const onSubmitImmediate = React.useCallback(() => setEagerToSubmit(true), []);
	const onSubmit = useDebouncedCallback(onSubmitImmediate, {
		wait: submitDebounceMs,
	});
	const updateElement = React.useMemo(
		() =>
			isUpdatePending ? (
				<Spinner size="sm" classNames={{ wrapper: `size-3 ${className}` }} />
			) : (
				<CheckMark
					className={`size-3 text-success transition-opacity duration-500 ${justSaved ? "opacity-100" : "opacity-0"} ${className}`}
				/>
			),
		[isUpdatePending, justSaved, className],
	);
	return {
		onSuccess,
		onSubmit,
		onSubmitImmediate,
		updateElement,
		eagerToSubmitState: [eagerToSubmit, setEagerToSubmit] satisfies [
			boolean,
			React.Dispatch<React.SetStateAction<boolean>>,
		],
	};
};

export const useAutosaveEffect = (
	form: AnyFormApi,
	{
		state: eagerState,
	}: { state: [boolean, React.Dispatch<React.SetStateAction<boolean>>] },
) => {
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
	const [eagerToSubmit, setEagerToSubmit] = eagerState;
	React.useEffect(() => {
		if (!eagerToSubmit || isSubmitting) {
			return;
		}
		setEagerToSubmit(false);
		void form.handleSubmit();
	}, [eagerToSubmit, form, isSubmitting, setEagerToSubmit]);
};
