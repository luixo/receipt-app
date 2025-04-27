import { UserDebtsScreen } from "~app/features/user-debts/user-debts-screen";
import { useParams } from "~app/hooks/use-navigation";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const { id: userId } = useParams<{ id: string }>();
	return <UserDebtsScreen userId={userId} />;
};

export default Screen;
