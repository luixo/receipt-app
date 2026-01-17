import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Props } from "~app/providers/persist-client";

export const storage: Props["storage"] = AsyncStorage;
