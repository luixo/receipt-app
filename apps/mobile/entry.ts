// If you skip this - the app will fail to run
// Not sure why this is happening
// Seems like Expo Router should import that before it runs SafeAreaView context
// But it does not
// Expo Go version of the app runs ok nevertheless
import "react-native/Libraries/Renderer/shims/ReactNative";
import "expo-router/entry";
