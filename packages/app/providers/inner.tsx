import type React from "react";

import type { Persister } from "@tanstack/react-query-persist-client";

import {
	LinksContext,
	type LinksContextType,
} from "~app/contexts/links-context";
import { NavigationContext } from "~app/contexts/navigation-context";
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
	navigationContext: NavigationContext;
	DevToolsProvider: React.ComponentType<React.PropsWithChildren>;
};

export const InnerProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	storeContext,
	persister,
	linksContext,
	navigationContext,
	DevToolsProvider,
}) => (
	<ThemeProvider>
		<NavigationContext value={navigationContext}>
			<LinksContext value={linksContext}>
				<StoreContext value={storeContext}>
					<StoredDataProvider>
						<QueryProviderWithPretend>
							<ShimsProvider>
								<PersisterProvider persister={persister}>
									<DevToolsProvider>{children}</DevToolsProvider>
								</PersisterProvider>
							</ShimsProvider>
						</QueryProviderWithPretend>
					</StoredDataProvider>
				</StoreContext>
			</LinksContext>
		</NavigationContext>
	</ThemeProvider>
);
