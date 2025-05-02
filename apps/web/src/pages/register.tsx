import { RegisterScreen } from "~app/features/register/register-screen";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => <RegisterScreen />;
Screen.public = true;

export default Screen;
