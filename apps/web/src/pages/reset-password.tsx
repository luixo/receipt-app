import { useQueryState } from "nuqs";

import { ResetPasswordScreen } from "~app/features/reset-password/reset-password-screen";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const [token] = useQueryState("token");
	return <ResetPasswordScreen token={token ?? ""} />;
};
Screen.public = true;

export default Screen;
