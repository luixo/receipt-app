import type React from "react";

import { LoginScreen } from "~app/features/login/login-screen";

// @ts-expect-error Add proper redirect url here
const Wrapper: React.FC = () => <LoginScreen redirectUrl="/" />;

export default Wrapper;
