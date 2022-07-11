import React from "react";

import { InfiniteData } from "react-query";

import {
	TRPCInfiniteQueryKey,
	TRPCQueryOutput,
	TRPCInfiniteQueryResult,
} from "../../trpc";
import { styled, Text } from "../../utils/styles";

const ErrorText = styled(Text)({
	margin: "$m",
});

const LoadingText = styled(Text)({
	margin: "$m",
});

type InjectedProps<Path extends TRPCInfiniteQueryKey> = {
	data: InfiniteData<TRPCQueryOutput<Path>>;
};

type Props<
	Path extends TRPCInfiniteQueryKey,
	P extends InjectedProps<Path>
> = Omit<P, keyof InjectedProps<Path>> & {
	query: TRPCInfiniteQueryResult<Path>;
	children: React.ComponentType<P>;
};

export const InfiniteQueryWrapper = <
	Path extends TRPCInfiniteQueryKey,
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
