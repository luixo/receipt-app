import { DebtScreen } from "~app/features/debt/debt-screen";
import { useParams } from "~app/hooks/use-navigation";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const { id } = useParams<{ id: string }>();
	return <DebtScreen id={id} />;
};

export default Screen;
