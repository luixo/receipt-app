import React from "react";

import { QueryClientsContext } from "~app/contexts/query-clients-context";
import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import { QueryProvider } from "~app/providers/query";
import type { I18nContext } from "~app/utils/i18n";

type Props = {
	getQueryClientsRecord: () => QueryClientsRecord;
	initialQueryClientKey: keyof QueryClientsRecord;
	i18nContext: I18nContext;
};

export const OuterProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	getQueryClientsRecord,
	initialQueryClientKey,
	i18nContext,
}) => {
	// We're doing useState instead of useMemo
	// Because we don't want to rerender Wrap on every queryClient change
	// eslint-disable-next-line react/hook-use-state
	const queryClientsState = React.useState<QueryClientsRecord>(
		getQueryClientsRecord,
	);
	return (
		<i18nContext.Provider>
			<QueryClientsContext value={queryClientsState}>
				<QueryProvider queryClientKey={initialQueryClientKey}>
					{children}
				</QueryProvider>
			</QueryClientsContext>
		</i18nContext.Provider>
	);
};
