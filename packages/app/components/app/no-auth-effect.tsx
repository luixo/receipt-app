import React from "react";

import { useRouter } from "solito/navigation";

import { QueryErrorMessage } from "~app/components/error-message";
import { CookieContext } from "~app/contexts/cookie-context";
import { trpc } from "~app/trpc";
import { AUTH_COOKIE } from "~app/utils/auth";

export const NoAuthEffect: React.FC = () => {
	const { deleteCookie } = React.useContext(CookieContext);
	const router = useRouter();
	const accountQuery = trpc.account.get.useQuery(undefined, {
		retry: (_count, error) => error.data?.code !== "UNAUTHORIZED",
	});
	React.useEffect(() => {
		if (
			accountQuery.error &&
			accountQuery.error.data?.code === "UNAUTHORIZED"
		) {
			deleteCookie(AUTH_COOKIE);
			router.push("/login");
		}
	}, [accountQuery.error, router, deleteCookie]);
	if (accountQuery.status === "error") {
		return <QueryErrorMessage query={accountQuery} />;
	}
	return null;
};
