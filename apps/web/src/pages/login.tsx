import { LoginScreen } from "~app/features/login/login-screen";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => <LoginScreen />;
Screen.public = true;

export default Screen;
