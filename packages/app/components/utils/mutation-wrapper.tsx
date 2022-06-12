import React from "react";
import { styled, Text } from "../../utils/styles";
import {
	TRPCMutationKey,
	TRPCMutationOutput,
	TRPCMutationResult,
} from "../../trpc";

const ErrorText = styled(Text)({
	margin: "$m",
});

const LoadingText = styled(Text)({
	margin: "$m",
});

type InjectedProps<Path extends TRPCMutationKey> = {
	data: TRPCMutationOutput<Path>;
};

type Props<
	Path extends TRPCMutationKey,
	P extends InjectedProps<Path> = InjectedProps<Path>
> = Omit<P, keyof InjectedProps<Path>> & {
	mutation: TRPCMutationResult<Path>;
	children: React.ComponentType<P>;
};

export const MutationWrapper = <
	Path extends TRPCMutationKey,
	ExtraProps = {},
	P extends InjectedProps<Path> = InjectedProps<Path> & ExtraProps
>({
	mutation,
	children: Children,
	...rest
}: Props<Path, P>) => {
	switch (mutation.status) {
		case "idle":
			return null;
		case "error":
			return <ErrorText>Error: {mutation.error.message}</ErrorText>;
		case "loading":
			return <LoadingText>Loading..</LoadingText>;
		case "success":
			return <Children {...(rest as unknown as P)} data={mutation.data} />;
	}
};
