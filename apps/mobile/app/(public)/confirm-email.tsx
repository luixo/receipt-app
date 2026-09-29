import type React from "react";

import { PageWrapper } from "#app/components/page-wrapper.tsx";
import { ConfirmEmailScreen } from "#app/features/confirm-email/confirm-email-screen.tsx";

const Wrapper = () => (
	<PageWrapper>
		<ConfirmEmailScreen />
	</PageWrapper>
);

export default Wrapper;
