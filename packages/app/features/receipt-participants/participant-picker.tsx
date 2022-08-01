import React from "react";

import { Loading } from "@nextui-org/react";
import { InfiniteData } from "react-query";

import { cache } from "app/cache";
import { UsersPicker } from "app/components/app/users-picker";
import { QueryErrorMessage } from "app/components/error-message";
import {
	trpc,
	TRPCInfiniteQueryOutput,
	TRPCInfiniteQuerySuccessResult,
} from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

type AvailableUsersResult = TRPCInfiniteQueryOutput<"users.get-available">;

const extractUsers = (data: InfiniteData<AvailableUsersResult>) =>
	data.pages.reduce<AvailableUsersResult["items"]>(
		(acc, page) => [...acc, ...page.items],
		[]
	);

const getBreakIndex = (data: InfiniteData<AvailableUsersResult>) => {
	const breakIndex = data.pages.reduce<number>(
		(acc, page) => acc + page.topAmount,
		0
	);
	if (!breakIndex) {
		return;
	}
	return breakIndex;
};

const extractDetails = ({
	id,
	name,
}: AvailableUsersResult["items"][number]) => ({ id, name });

type InnerProps = {
	query: TRPCInfiniteQuerySuccessResult<"users.get-available">;
	disabled: boolean;
	onUserClick: (user: AvailableUsersResult["items"][number]) => void;
};

const ParticipantPickerInner: React.FC<InnerProps> = ({
	query,
	disabled,
	onUserClick,
}) => {
	const loadMore = React.useCallback(() => query.fetchNextPage(), [query]);
	return (
		<UsersPicker
			type="block"
			query={query}
			extractUsers={extractUsers}
			extractDetails={extractDetails}
			getBreakIndex={getBreakIndex}
			onChange={onUserClick}
			loadMore={loadMore}
			disabled={disabled}
		/>
	);
};

type Props = Omit<InnerProps, "query"> & {
	receiptId: ReceiptsId;
};

export const ParticipantPicker: React.FC<Props> = ({ receiptId, ...props }) => {
	const [input] = cache.users.getAvailable.useStore(receiptId);
	const query = trpc.useInfiniteQuery(["users.get-available", input], {
		getNextPageParam: cache.users.getAvailable.getNextPage,
	});
	if (query.status === "loading") {
		return <Loading size="xl" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <ParticipantPickerInner query={query} {...props} />;
};
