export const updateSetStateAction = <T>(
	setStateAction: React.SetStateAction<T>,
	prevValue: T,
) =>
	typeof setStateAction === "function"
		? (setStateAction as (prevState: T) => T)(prevValue)
		: setStateAction;
