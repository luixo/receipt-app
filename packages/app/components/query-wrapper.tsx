import React from "react";

import { TRPCQueryKey, TRPCQueryOutput, TRPCQueryResult } from "app/trpc";
import { styled, Text } from "app/utils/styles";

const ErrorText = styled(Text)({
	margin: "md",
});

const LoadingText = styled(Text)({
	margin: "md",
});

type InjectedProps<Path extends TRPCQueryKey> = {
	data: TRPCQueryOutput<Path>;
};

type Props<Path extends TRPCQueryKey, P extends InjectedProps<Path>> = Omit<
	P,
	keyof InjectedProps<Path>
> & {
	query: TRPCQueryResult<Path>;
	children: React.FC<P>;
};

export const QueryWrapper = <
	Path extends TRPCQueryKey,
	ExtraProps = object,
	P extends InjectedProps<Path> = InjectedProps<Path> & ExtraProps
>({
	query,
	children: Children,
	...rest
}: Props<Path, P>) => {
	switch (query.status) {
		case "error":
			return <ErrorText>Error: {query.error.message}</ErrorText>;
		case "loading":
		case "idle":
			return <LoadingText>Loading..</LoadingText>;
		case "success":
			return <Children {...(rest as unknown as P)} data={query.data} />;
	}
};
