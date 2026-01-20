// src/services/updates.ts
import api, { extractApiErrorMessage } from "@/src/services/api";

export type UpdateModule = "FE" | "BE" | "LAUNCHER";

function toSafeFilename(name: string): string {
    // evita spazi “strani” e path accidentali
    const base = name.split("/").pop()?.split("\\").pop() ?? name;
    return base.replace(/\s+/g, " ").trim();
}

export async function uploadUpdateZip(params: {
    module: UpdateModule;
    version: string;
    originalFileName: string;

    /**
     * Native (ios/android): usa fileUri
     * Web: usa file (File reale)
     */
    fileUri?: string;
    file?: File;
}): Promise<any> {
    const original = toSafeFilename(params.originalFileName);
    const baseName = original.replace(/\.zip$/i, "");

    const zipName = original.toLowerCase().endsWith(".zip")
        ? original
        : `${baseName}.zip`;

    const form = new FormData();
    form.append("module", params.module);
    form.append("version", params.version.trim());
    form.append("fileName", baseName); // come cURL: senza .zip
    form.append("contentType", "application/zip");

    // WEB: File/Blob reale (fondamentale, altrimenti zip corrotto)
    if (params.file) {
        form.append("file", params.file, zipName);
    } else {
        // NATIVE: uri object
        if (!params.fileUri) {
            throw new Error("fileUri mancante (native) o file mancante (web).");
        }
        form.append(
            "file",
            { uri: params.fileUri, name: zipName, type: "application/zip" } as any
        );
    }

    try {
        // IMPORTANTISSIMO: non impostare Content-Type manualmente (boundary)
        const res = await api.post("/api/v1/admin/updates", form);
        return res.data;
    } catch (e: any) {
        throw new Error(extractApiErrorMessage?.(e) || e?.message || "Upload fallito");
    }
}
