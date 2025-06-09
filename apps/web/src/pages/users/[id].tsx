import { UserScreen } from "~app/features/user/user-screen";
import { createFileRoute } from "~web/utils/router";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <UserScreen id={id} />;
};

const Route = createFileRoute("/_protected/users/$id")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - User" }] }),
});

export default Route.Screen;
