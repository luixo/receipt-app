import React from "react";
import { Provider } from "app/provider";
import { NativeNavigation } from "./navigation";

const App: React.FC = () => {
	return (
		<Provider>
			<NativeNavigation />
		</Provider>
	);
};

export default App;
