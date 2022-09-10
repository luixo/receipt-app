import { useQueryState } from "next-usequerystate";
import { createParam } from "solito";

const { useParam } = createParam<{ [K in string]: string }>();

export const useQueryParam = (paramName: string, defaultValue: string) => {
	const [serverSideQueryOffset] = useParam(paramName);
	return useQueryState(paramName, {
		defaultValue: serverSideQueryOffset || defaultValue,
	});
};
