// app/login.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Eye, EyeOff, LogIn, User, Lock, Sun, Moon } from "lucide-react-native";
import { login } from "../src/services/auth";
import ZenixLogo from "@/assets/zenixpos.svg";
import ThreeStudiosLogo from "@/assets/3studios.svg";
import {THEME_KEY, useColors } from "@/src/hooks/useColors";

const REMEMBER_KEY = "rt_remember_username";
const TOKEN_KEY = "auth_token";


const BRAND_NAME = "ZenixPos";


type ThemeMode = "light" | "dark";

export default function LoginScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const C = useColors(theme, true);

  useEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const savedTheme = (await AsyncStorage.getItem(THEME_KEY)) as ThemeMode | null;
      if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);

      const remembered = await AsyncStorage.getItem(REMEMBER_KEY);
      if (remembered) {
        setUsername(remembered);
        setRememberMe(true);
      }
    })();
  }, []);

  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  const canSubmit = useMemo(
      () => username.trim().length > 0 && password.trim().length > 0 && !loading,
      [username, password, loading]
  );

  const mapApiError = (err: any): string => {
    const status = err?.response?.status;
    const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "";

    if (err?.code === "ECONNABORTED") return "Timeout della richiesta. Controlla la connessione.";
    if (apiMsg.toLowerCase().includes("network") || err?.message === "Network Error") {
      return "Impossibile contattare il server.";
    }

    if (status === 400) return apiMsg || "Richiesta non valida.";
    if (status === 401 || status === 403) return "Credenziali non valide.";
    if (status === 404) return "Endpoint non trovato.";
    if (status >= 500) return "Errore del server. Riprova più tardi.";

    return apiMsg || "Si è verificato un errore.";
  };

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!canSubmit) return;

    try {
      setLoading(true);
      await login({ username: username.trim(), password });

      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_KEY, username.trim());
      } else {
        await AsyncStorage.removeItem(REMEMBER_KEY);
      }

      router.replace("/");
    } catch (err: any) {
      setErrorMsg(mapApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const colors = useMemo(() => {
    if (theme === "light") {
      return {
        screen: "bg-white",
        card: "bg-gray-100",
        textPrimary: "text-gray-900",
        textSecondary: "text-gray-600",
        fieldBg: "bg-white",
        fieldBorder: "border-gray-300",
        icon: "#6B7280",
        button: canSubmit ? "bg-blue-500" : "bg-gray-300",
        buttonText: "text-white",
        dangerBox: "bg-red-50 border-red-200",
        dangerText: "text-red-600",
        divider: "border-gray-200",
        checkboxBorder: "border-gray-500",
        checkboxOn: "bg-emerald-600 border-emerald-600",
      };
    }
    return {
      screen: "bg-black",
      card: "bg-gray-900",
      textPrimary: "text-white",
      textSecondary: "text-gray-400",
      fieldBg: "bg-gray-800",
      fieldBorder: "border-gray-700",
      icon: "#9CA3AF",
      button: canSubmit ? "bg-blue-500" : "bg-gray-700",
      buttonText: "text-white",
      dangerBox: "bg-red-500/10 border-red-500/40",
      dangerText: "text-red-400",
      divider: "border-gray-800",
      checkboxBorder: "border-gray-600",
      checkboxOn: "bg-green-500 border-green-500",
    };
  }, [theme, canSubmit]);

  return (
      <ScrollView className={`flex-1 ${colors.screen}`} contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center items-center p-6">

          {/* Toggle tema discreto, in alto a destra */}
          <View style={{ position: "absolute", top: 16, right: 16 }}>
            <TouchableOpacity
                onPress={toggleTheme}
                accessibilityRole="button"
                accessibilityLabel="Cambia tema"
                className="p-2 rounded-xl border border-transparent"
            >
              {theme === "dark" ? (
                  <Sun size={22} color={colors.icon} />
              ) : (
                  <Moon size={22} color={colors.icon} />
              )}
            </TouchableOpacity>
          </View>

          {/* Logo centrale grande */}
          <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <ZenixLogo
                width={240}
                height={110}
                color={theme === "dark" ? "#FFFFFF" : "#000000"}
            />
          </View>

          {/* Card login */}
          <View className={`w-full max-w-md ${colors.card} rounded-2xl p-6 shadow-lg`}>
            <Text className={`text-2xl font-bold ${colors.textPrimary} mb-6 text-center`}>Cloud Manager</Text>

            {errorMsg ? (
                <View className={`${colors.dangerBox} border rounded-xl px-4 py-3 mb-4`}>
                  <Text className={`${colors.dangerText}`}>{errorMsg}</Text>
                </View>
            ) : null}

            {/* Username */}
            <View className="mb-4">
              <Text className={`${colors.textSecondary} mb-2 ml-1`}>Username</Text>
              <View className={`flex-row items-center ${colors.fieldBg} border ${colors.fieldBorder} rounded-xl px-4`}>
                <User size={20} color={colors.icon} />
                <TextInput
                    className={`flex-1 py-4 ml-3 ${colors.textPrimary}`}
                    placeholder="Inserisci username"
                    placeholderTextColor={theme === "light" ? "#9CA3AF" : "#6B7280"}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoComplete="username"
                    returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View className="mb-2">
              <Text className={`${colors.textSecondary} mb-2 ml-1`}>Password</Text>
              <View className={`flex-row items-center ${colors.fieldBg} border ${colors.fieldBorder} rounded-xl px-4`}>
                <Lock size={20} color={colors.icon} />
                <TextInput
                    className={`flex-1 py-4 ml-3 ${colors.textPrimary}`}
                    placeholder="Inserisci password"
                    placeholderTextColor={theme === "light" ? "#9CA3AF" : "#6B7280"}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? <EyeOff size={20} color={colors.icon} /> : <Eye size={20} color={colors.icon} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember me */}
            <View className="flex-row justify-between items-center mb-6 mt-2">
              <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => setRememberMe(!rememberMe)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                  accessibilityLabel="Ricorda username"
              >
                <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      marginRight: 8,
                      // bordo: blu se selezionato, altrimenti il tuo colore tema
                      borderWidth: 1,
                      borderColor: rememberMe
                          ? "#38B6FF"
                          : (theme === "light" ? "#6B7280" : "#4B5563"),
                      // sfondo: blu se selezionato, trasparente se no
                      backgroundColor: rememberMe ? "#38B6FF" : "transparent",
                    }}
                />
                <Text className={`${colors.textSecondary}`}>Ricordami</Text>
              </TouchableOpacity>
            </View>


            {/* Login */}
            <TouchableOpacity
                className={`py-4 rounded-xl items-center ${colors.button}`}
                onPress={handleLogin}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Accedi"
            >
              <View className="flex-row items-center">
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                      <LogIn size={20} color="white" />
                      <Text className={`font-bold text-lg ml-2 ${colors.buttonText}`}>Sign In</Text>
                    </>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer legale conforme */}
          <View style={{ alignItems: "center", marginTop: 30, marginBottom: 20 }}>
            {/* COPYRIGHT + P.IVA */}
            <Text style={{ color: C.textSecondary, fontSize: 12, textAlign: "center" }}>
              © 2025 ZenixPos - P.IVA 01445770777
            </Text>

            {/* POWERED BY */}
            <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 6 }}>
              Powered by
            </Text>

            {/* Logo 3Studios sotto */}
            <ThreeStudiosLogo width={80} height={30} style={{ marginTop: 4, color: C.textPrimary,}} />
          </View>
        </View>
      </ScrollView>
  );
}
