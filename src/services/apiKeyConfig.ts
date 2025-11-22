// src/services/apiKeyConfig.ts
import api from "./api";

export interface CurrentUserPermission {
    creationDate: string;
    updateDate: string;
    id: string;
    createdBy: string;
    modifiedBy: string;
    isNew: boolean;
    new: boolean;
    apiKey: string | null;
    posId: string | null;
    // qui dopo aggiungi roles/permissions se il backend li mette
}

export async function loadCurrentUserPermission(): Promise<CurrentUserPermission> {
    const res = await api.get<CurrentUserPermission>(
        "/api/v1/kitchen-app/current-user-permission"
    );
    return res.data;
}

export async function setApiKey(apiKey: string): Promise<void> {
    await api.post("/api/v1/kitchen-app/config-api-key", { apiKey });
}

export async function removeApiKey(): Promise<void> {
    await api.delete("/api/v1/kitchen-app/config-api-key");
}
