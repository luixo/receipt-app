import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Props } from "#app/providers/persist-client.tsx";

export const storage: Props["storage"] = AsyncStorage;
