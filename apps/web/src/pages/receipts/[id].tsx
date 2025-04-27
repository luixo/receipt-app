import { Receipt } from "~app/features/receipt/receipt";
import { useParams } from "~app/hooks/use-navigation";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const { id } = useParams<{ id: string }>();
	return <Receipt id={id} />;
};

export default Screen;
