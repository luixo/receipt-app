import type React from "react";

import { PageWrapper } from "#app/components/page-wrapper.tsx";
import { RegisterScreen } from "#app/features/register/register-screen.tsx";

const Wrapper = () => (
	<PageWrapper>
		<RegisterScreen />
	</PageWrapper>
);

export default Wrapper;
