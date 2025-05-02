import { useQueryState } from "nuqs";

import { ConfirmEmailScreen } from "~app/features/confirm-email/confirm-email-screen";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const [token] = useQueryState("token");
	return <ConfirmEmailScreen token={token ?? ""} />;
};
Screen.public = true;

export default Screen;
