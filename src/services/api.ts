import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const TOKEN_KEY = "auth_token";

let MEM_TOKEN: string | null = null;

export function getAuthToken() {
    return MEM_TOKEN;
}

export async function setAuthToken(token: string) {
    MEM_TOKEN = token;
    await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearAuthToken() {
    MEM_TOKEN = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function bootstrapAuthToken() {
    if (!MEM_TOKEN) {
        const t = await AsyncStorage.getItem(TOKEN_KEY);
        MEM_TOKEN = t || null;
    }
}

// 🔹 helper per mappare il payload d'errore del backend
export const extractApiErrorMessage = (error: any): string => {
    const res = error?.response;
    const data = res?.data;

    // caso tipo:
    // { code, httpCode, internalMessage, moreInfo, type, userMessage }
    if (data && typeof data === "object") {
        if (typeof data.userMessage === "string" && data.userMessage.trim().length > 0) {
            return data.userMessage;
        }
        if (typeof data.message === "string" && data.message.trim().length > 0) {
            return data.message;
        }
        if (typeof data.internalMessage === "string" && data.internalMessage.trim().length > 0) {
            return data.internalMessage;
        }
    }

    // errori senza response (timeout, rete, ecc.)
    if (error?.code === "ECONNABORTED") {
        return "La richiesta ha superato il tempo massimo, riprova.";
    }
    if (error?.message?.includes("Network Error")) {
        return "Errore di rete. Controlla la connessione.";
    }

    return error?.message || "Si è verificato un errore imprevisto.";
};

const api = axios.create({
    // NB: gli endpoint devono essere chiamati tipo: /api/v1/app/users/all
    baseURL: "https://railway-java-quarkus-production-ce76.up.railway.app",
    timeout: 15000,
    withCredentials: true,
});

async function ensureToken(): Promise<string | null> {
    if (MEM_TOKEN) return MEM_TOKEN;
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    MEM_TOKEN = t || null;
    return MEM_TOKEN;
}

// ========= INTERCEPTORS =========
api.interceptors.request.use(
    async (config) => {
        const token = await ensureToken();

        const isFormData =
            typeof FormData !== "undefined" &&
            config.data instanceof FormData;

        // Normalizziamo gli header SENZA rompere le GET
        const method = (config.method || "get").toLowerCase();

        // Partiamo dagli header esistenti
        config.headers = {
            ...(config.headers || {}),
        };

        // Accept di default
        (config.headers as any).Accept = isFormData ? "*/*" : "application/json";

        // ⚠️ Content-Type SOLO se NON è GET e NON è FormData
        if (!isFormData && method !== "get") {
            (config.headers as any)["Content-Type"] = "application/json";
        }

        // Se è FormData, lasciamo gestire axios il boundary → niente Content-Type manuale
        if (isFormData && (config.headers as any)["Content-Type"]) {
            delete (config.headers as any)["Content-Type"];
        }

        // Authorization corretto (case-sensitive per gli standard)
        if (token) {
            (config.headers as any).Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // 🔸 mostra SEMPRE un toast con il messaggio d'errore mappato
        try {
            const msg = extractApiErrorMessage(error);
            // definito da <FeedbackProvider> / ToastHost
            (globalThis as any).__toast_show__?.(msg, "error", 4500);
        } catch (e) {
            console.log("[API_INTERCEPTOR_TOAST_ERROR]", e);
        }

        const status = error?.response?.status;

        if (status === 401) {
            console.warn("🔒 Token scaduto o non valido, eseguo logout...");
            await clearAuthToken();
            const currentPath = (router as any)?.pathname || "";
            if (!currentPath.includes("/login")) {
                router.replace("/login");
            }
        }

        // importantissimo: rilancia l'errore così i catch locali continuano a funzionare
        return Promise.reject(error);
    }
);

export default api;
export { TOKEN_KEY };
