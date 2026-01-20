// src/services/updates.ts
import api, { extractApiErrorMessage } from "@/src/services/api";

export type UpdateModule = "FE" | "BE" | "LAUNCHER";

function toSafeFilename(name: string): string {
    const base = name.split("/").pop()?.split("\\").pop() ?? name;
    return base.replace(/\s+/g, " ").trim();
}

export async function uploadUpdateZip(params: {
    module: UpdateModule;
    version: string;
    originalFileName: string;
    fileUri?: string; // native
    file?: File;      // web
}): Promise<any> {
    const original = toSafeFilename(params.originalFileName);
    const baseName = original.replace(/\.zip$/i, "");

    // nome "file" sempre con .zip
    const zipName = original.toLowerCase().endsWith(".zip")
        ? original
        : `${baseName}.zip`;

    const form = new FormData();
    form.append("module", params.module);
    form.append("version", params.version.trim());

    // FIX: fileName con estensione .zip
    form.append("fileName", zipName);

    form.append("contentType", "application/zip");

    if (params.file) {
        // WEB
        form.append("file", params.file, zipName);
    } else {
        // NATIVE
        if (!params.fileUri) {
            throw new Error("fileUri mancante (native) o file mancante (web).");
        }
        form.append(
            "file",
            { uri: params.fileUri, name: zipName, type: "application/zip" } as any
        );
    }

    try {
        const res = await api.post("/api/v1/admin/updates", form);
        return res.data;
    } catch (e: any) {
        throw new Error(extractApiErrorMessage?.(e) || e?.message || "Upload fallito");
    }
}
