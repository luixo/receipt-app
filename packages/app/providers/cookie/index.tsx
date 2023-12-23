import React from "react";

export type Props = React.PropsWithChildren;

export const CookieProvider: React.FC<Props> = ({ children }) => (
	// TODO: add CookieContext with an option to update cookies in native environments
	<>{children}</>
);
