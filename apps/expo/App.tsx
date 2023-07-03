import React from "react";

import { defaultSettings } from "app/contexts/settings-context";
import { Provider } from "app/provider";

import { NativeNavigation } from "./navigation";

const App: React.FC = () => (
	<Provider colorModeConfig={{}} settings={defaultSettings} query={{}}>
		<NativeNavigation />
	</Provider>
);

export default App;
