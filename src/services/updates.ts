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
    fileUri: string;
    originalFileName: string;
}): Promise<any> {
    const original = toSafeFilename(params.originalFileName);
    const baseName = original.replace(/\.zip$/i, "");

    const zipName = original.toLowerCase().endsWith(".zip")
        ? original
        : `${baseName}.zip`;

    const form = new FormData();
    form.append("module", params.module);
    form.append("version", params.version.trim());
    form.append("fileName", baseName);
    form.append("contentType", "application/zip");
    form.append(
        "file",
        { uri: params.fileUri, name: zipName, type: "application/zip" } as any
    );

    try {
        // NON impostare Content-Type manualmente
        const res = await api.post("/api/v1/admin/updates", form);
        return res.data;
    } catch (e: any) {
        throw new Error(extractApiErrorMessage?.(e) || e?.message || "Upload fallito");
    }
}
