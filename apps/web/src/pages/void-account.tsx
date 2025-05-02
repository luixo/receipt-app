import { useQueryState } from "nuqs";

import { VoidAccountScreen } from "~app/features/void-account/void-account-screen";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const [token] = useQueryState("token");
	return <VoidAccountScreen token={token ?? ""} />;
};
Screen.public = true;

export default Screen;
