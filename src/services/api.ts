// src/services/api.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export const TOKEN_KEY = "auth_token";

let MEM_TOKEN: string | null = null;

// evita loop se arrivano più 401 in cascata durante redirect
let IS_REDIRECTING_TO_LOGIN = false;

export function getAuthToken(): string | null {
    return MEM_TOKEN;
}

export async function setAuthToken(token: string) {
    MEM_TOKEN = token;
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearAuthToken() {
    MEM_TOKEN = null;
    delete api.defaults.headers.common.Authorization;
    await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function bootstrapAuthToken() {
    if (MEM_TOKEN) return;

    const t = await AsyncStorage.getItem(TOKEN_KEY);
    MEM_TOKEN = t || null;

    if (MEM_TOKEN) {
        api.defaults.headers.common.Authorization = `Bearer ${MEM_TOKEN}`;
    }
}

export function extractApiErrorMessage(error: any): string {
    const data = error?.response?.data;

    if (data && typeof data === "object") {
        if (typeof data.userMessage === "string" && data.userMessage.trim())
            return data.userMessage;
        if (typeof data.message === "string" && data.message.trim())
            return data.message;
        if (typeof data.error === "string" && data.error.trim()) return data.error;
        if (typeof data.internalMessage === "string" && data.internalMessage.trim())
            return data.internalMessage;
    }

    if (error?.code === "ECONNABORTED")
        return "Timeout della richiesta. Controlla la connessione.";
    if (error?.message === "Network Error")
        return "Errore di rete. Controlla la connessione.";
    return error?.message || "Errore imprevisto.";
}

/* ================== BASE URL (.env) ================== */

const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ||
    "https://railway-java-quarkus-production-ce76.up.railway.app"; // fallback sicuro (cambialo se vuoi)

if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    console.warn(
        "⚠️ EXPO_PUBLIC_API_BASE_URL non è definita. Uso fallback:",
        API_BASE_URL
    );
}

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    withCredentials: true,
});

async function ensureToken(): Promise<string | null> {
    if (MEM_TOKEN) return MEM_TOKEN;

    const t = await AsyncStorage.getItem(TOKEN_KEY);
    MEM_TOKEN = t || null;

    if (MEM_TOKEN) {
        api.defaults.headers.common.Authorization = `Bearer ${MEM_TOKEN}`;
    }

    return MEM_TOKEN;
}

function getCurrentPathSafe(): string {
    if (typeof window !== "undefined" && window.location?.pathname) {
        return window.location.pathname;
    }
    return "";
}

function isLoginRequest(config: any): boolean {
    const url = String(config?.url || "");
    // più robusto: evita che 401 del login triggeri redirect/logout
    return url.includes("/auth/login");
}

function isOnLoginScreen(): boolean {
    const path = getCurrentPathSafe();
    return path.includes("/login");
}

/* ================== INTERCEPTORS ================== */

api.interceptors.request.use(
    async (config) => {
        const token = await ensureToken();

        const isFormData =
            typeof FormData !== "undefined" && config.data instanceof FormData;

        const method = (config.method || "get").toLowerCase();

        config.headers = {
            ...(config.headers || {}),
        };

        (config.headers as any).Accept = isFormData ? "*/*" : "application/json";

        if (!isFormData && method !== "get") {
            (config.headers as any)["Content-Type"] = "application/json";
        }
        if (isFormData && (config.headers as any)["Content-Type"]) {
            delete (config.headers as any)["Content-Type"];
        }

        if (token) {
            (config.headers as any).Authorization = `Bearer ${token}`;
        } else {
            if ((config.headers as any).Authorization)
                delete (config.headers as any).Authorization;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        try {
            const msg = extractApiErrorMessage(error);
            (globalThis as any).__toast_show__?.(msg, "error", 4500);
        } catch {}

        const status = error?.response?.status;
        const cfg = error?.config;

        if (status === 401) {
            if (isLoginRequest(cfg)) {
                return Promise.reject(error);
            }

            if (IS_REDIRECTING_TO_LOGIN) {
                return Promise.reject(error);
            }

            IS_REDIRECTING_TO_LOGIN = true;

            try {
                await clearAuthToken();

                if (typeof window !== "undefined") {
                    if (!isOnLoginScreen()) {
                        router.replace("/login");
                    }
                } else {
                    router.replace("/login");
                }
            } finally {
                setTimeout(() => {
                    IS_REDIRECTING_TO_LOGIN = false;
                }, 300);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
