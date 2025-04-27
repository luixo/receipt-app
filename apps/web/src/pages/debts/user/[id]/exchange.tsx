import { DebtsExchangeScreen } from "~app/features/debts-exchange/debts-exchange-screen";
import { useParams } from "~app/hooks/use-navigation";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const { id: userId } = useParams<{ id: string }>();
	return <DebtsExchangeScreen userId={userId} />;
};

export default Screen;
