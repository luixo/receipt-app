import type React from "react";

import {
	LinksContext,
	type LinksContextType,
} from "~app/contexts/links-context";
import { NavigationContext } from "~app/contexts/navigation-context";
import { StoreContext } from "~app/contexts/store-context";
import type { StoreContextType } from "~app/contexts/store-context";

import {
	type Props as PersisterProps,
	PersisterProvider,
} from "./persist-client";
import { QueryProviderWithPretend } from "./query-with-pretend";
import { ShimsProvider } from "./shims";
import { StoredDataProvider } from "./stored-data";
import { ThemeProvider } from "./theme";

type Props = {
	storeContext: StoreContextType;
	storage: PersisterProps["storage"];
	linksContext: LinksContextType;
	navigationContext: NavigationContext;
	applyColorMode: React.ComponentProps<typeof ThemeProvider>["applyColorMode"];
	DevToolsProvider: React.ComponentType<React.PropsWithChildren>;
	ToastProvider: React.ComponentType<React.PropsWithChildren>;
};

export const InnerProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	storeContext,
	storage,
	linksContext,
	navigationContext,
	DevToolsProvider,
	ToastProvider,
	applyColorMode,
}) => (
	<NavigationContext value={navigationContext}>
		<LinksContext value={linksContext}>
			<StoreContext value={storeContext}>
				<StoredDataProvider>
					<ThemeProvider applyColorMode={applyColorMode}>
						<QueryProviderWithPretend>
							<ShimsProvider>
								<PersisterProvider storage={storage}>
									<DevToolsProvider>
										<ToastProvider>{children}</ToastProvider>
									</DevToolsProvider>
								</PersisterProvider>
							</ShimsProvider>
						</QueryProviderWithPretend>
					</ThemeProvider>
				</StoredDataProvider>
			</StoreContext>
		</LinksContext>
	</NavigationContext>
);
