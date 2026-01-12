import { Platform } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import * as ExpoDevice from "expo-device";
import * as SecureStore from "expo-secure-store";
// This should be redacted in production builds
// eslint-disable-next-line import-x/no-extraneous-dependencies
import { useSyncQueriesExternal } from "react-query-external-sync";

export const DevToolsProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const queryClient = useQueryClient();
	useSyncQueriesExternal({
		queryClient,
		socketURL: "http://localhost:42831",
		deviceName: Platform.OS,
		platform: Platform.OS,
		deviceId: Platform.OS,
		isDevice: ExpoDevice.isDevice,
		extraDeviceInfo: {
			appVersion: "1.0.0",
		},
		enableLogs: false,
		envVariables: {
			NODE_ENV: process.env.NODE_ENV || "unknown",
		},
		asyncStorage: AsyncStorage,
		secureStorage: SecureStore,
		secureStorageKeys: [
			"userToken",
			"refreshToken",
			"biometricKey",
			"deviceId",
		],
	});
	return <>{children}</>;
};
