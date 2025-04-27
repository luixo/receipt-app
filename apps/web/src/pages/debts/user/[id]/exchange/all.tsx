import { DebtsExchangeAllScreen } from "~app/features/debts-exchange-all/debts-exchange-all-screen";
import { useParams } from "~app/hooks/use-navigation";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const { id: userId } = useParams<{ id: string }>();
	return <DebtsExchangeAllScreen userId={userId} />;
};

export default Screen;
