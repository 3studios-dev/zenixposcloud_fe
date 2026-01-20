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
    fileUri: string;
    originalFileName: string;
}): Promise<any> {
    const fileName = toSafeFilename(params.originalFileName);

    const form = new FormData();
    form.append("module", params.module);
    form.append("version", params.version.trim());
    form.append("fileName", fileName);
    form.append("contentType", "application/zip");

    // React Native / Expo: serve { uri, name, type }
    form.append(
        "file",
        {
            uri: params.fileUri,
            name: fileName,
            type: "application/zip",
        } as any
    );

    try {
        const res = await api.post("/api/v1/admin/updates", form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
    } catch (e: any) {
        throw new Error(
            extractApiErrorMessage?.(e) || e?.message || "Upload fallito"
        );
    }
}
