// src/services/auth.ts
import api, { setAuthToken, clearAuthToken } from "./api";

type LoginPayload = { username: string; password: string };
type LoginResponse = { token?: string; access_token?: string; [k: string]: any };

export async function login({ username, password }: LoginPayload) {
    const res = await api.post<LoginResponse>("/api/v1/auth/login", {
        username,
        password,
    });

    const token =
        res.data.token ||
        res.data.access_token ||
        (typeof res.headers?.authorization === "string" &&
        res.headers.authorization.startsWith("Bearer ")
            ? res.headers.authorization.slice("Bearer ".length)
            : undefined);

    if (!token) {
        throw new Error("Token mancante dalla risposta di login");
    }

    // salva globalmente (mem + AsyncStorage + axios default header)
    await setAuthToken(token);

    return { ...res.data, token };
}

export async function logout() {
    // facoltativo: chiama una /logout server side
    // try { await api.post("/api/v1/auth/logout"); } catch {}

    await clearAuthToken();
}
