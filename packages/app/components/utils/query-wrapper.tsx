import React from "react";
import { styled, Text } from "../../utils/styles";
import { TRPCQueryKey, TRPCQueryOutput, TRPCQueryResult } from "../../trpc";

const ErrorText = styled(Text)({
	margin: "$m",
});

const LoadingText = styled(Text)({
	margin: "$m",
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
