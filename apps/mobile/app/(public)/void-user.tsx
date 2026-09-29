import type React from "react";

import { PageWrapper } from "#app/components/page-wrapper.tsx";
import { VoidUserScreen } from "#app/features/void-user/void-user-screen.tsx";

const Wrapper = () => (
	<PageWrapper>
		<VoidUserScreen />
	</PageWrapper>
);

export default Wrapper;
