import React from "react";
import * as ReactNative from "react-native";

import type { InfiniteData } from "react-query";

import {
	TRPCInfiniteQueryKey,
	TRPCQueryOutput,
	TRPCInfiniteQueryResult,
} from "app/trpc";
import { styled, Text } from "app/utils/styles";

const ErrorText = styled(Text)({
	margin: "md",
});

const LoadingText = styled(Text)({
	margin: "md",
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
			return (
				<>
					<Children {...(rest as unknown as P)} data={query.data} />
					{query.isFetching ? (
						<Text>Loading..</Text>
					) : query.hasNextPage ? (
						<ReactNative.Button
							title="Fetch next page"
							onPress={() => query.fetchNextPage()}
						/>
					) : null}
				</>
			);
	}
};
