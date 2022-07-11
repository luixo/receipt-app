import React from "react";

import { Provider } from "app/provider";

import { NativeNavigation } from "./navigation";

const App: React.FC = () => (
	<Provider initialColorModeConfig={{}}>
		<NativeNavigation />
	</Provider>
);

export default App;
