// src/utils/http.ts
export function backendErrorMessage(e: any, fallback = "Operazione non riuscita") {
    const msg =
        e?.response?.data?.message ??
        e?.response?.data?.error ??
        e?.message ??
        fallback;
    return String(msg);
}
