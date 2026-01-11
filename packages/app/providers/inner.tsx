import type React from "react";

import type { Persister } from "@tanstack/react-query-persist-client";

import {
	LinksContext,
	type LinksContextType,
} from "~app/contexts/links-context";
import { StoreContext } from "~app/contexts/store-context";
import type { StoreContextType } from "~app/contexts/store-context";

import { PersisterProvider } from "./persist-client";
import { QueryProviderWithPretend } from "./query-with-pretend";
import { ShimsProvider } from "./shims";
import { StoredDataProvider } from "./stored-data";
import { ThemeProvider } from "./theme";

type Props = {
	storeContext: StoreContextType;
	persister: Persister;
	linksContext: LinksContextType;
	DevToolsProvider: React.ComponentType<React.PropsWithChildren>;
};

export const InnerProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	storeContext,
	persister,
	linksContext,
	DevToolsProvider,
}) => (
	<ThemeProvider>
		<LinksContext value={linksContext}>
			<StoreContext value={storeContext}>
				<StoredDataProvider>
					<QueryProviderWithPretend>
						<ShimsProvider>
							<PersisterProvider persister={persister}>
								{/* {children} */}
								<DevToolsProvider>{children}</DevToolsProvider>
							</PersisterProvider>
						</ShimsProvider>
					</QueryProviderWithPretend>
				</StoredDataProvider>
			</StoreContext>
		</LinksContext>
	</ThemeProvider>
);
