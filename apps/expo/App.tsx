import React from "react";

import { getSSRContextCookieData } from "app/contexts/ssr-context";
import { Provider } from "app/provider";

import { NativeNavigation } from "./navigation";

const App: React.FC = () => (
	<Provider
		query={{}}
		ssrContext={{ ...getSSRContextCookieData(), nowTimestamp: Date.now() }}
	>
		<NativeNavigation />
	</Provider>
);

export default App;
