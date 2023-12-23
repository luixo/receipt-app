import React from "react";

export const PersistStorageProvider: React.FC<
	React.PropsWithChildren<object>
> = ({ children }) => (
	// Probably something like this would be implemented:
	// import AsyncStorage from '@react-native-async-storage/async-storage'
	// <PersistStorageContext.Provider value={AsyncStorage}>
	<>{children}</>
	// </PersistStorageContext.Provider>
);
