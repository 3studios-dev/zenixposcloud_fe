// app/_layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import "@/src/setup/scrollviewDefaults";

import { FeedbackProvider } from "@/src/feedback/FeedbackProvider";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
      <GluestackUIProvider mode={isDark ? "dark" : "light"}>
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
          <FeedbackProvider theme={isDark ? "dark" : "light"}>
            <Stack initialRouteName="login" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                  name="modal"
                  options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
          </FeedbackProvider>
          <StatusBar style={isDark ? "light" : "dark"} />
        </ThemeProvider>
      </GluestackUIProvider>
  );
}
