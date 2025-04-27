import { UserScreen } from "~app/features/user/user-screen";
import { useParams } from "~app/hooks/use-navigation";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const { id } = useParams<{ id: string }>();
	return <UserScreen id={id} />;
};

export default Screen;
