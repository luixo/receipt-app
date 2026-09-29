import type React from "react";

import { PageWrapper } from "#app/components/page-wrapper.tsx";
import { PlaygroundScreen } from "#app/features/playground/playground-screen.tsx";

const Wrapper = () => (
	<PageWrapper>
		<PlaygroundScreen />
	</PageWrapper>
);

export default Wrapper;
