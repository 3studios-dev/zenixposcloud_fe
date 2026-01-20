// src/services/users.ts
import api from "./api";

export interface AppUser {
    id: string;
    username?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
}

export async function fetchAllUsers(): Promise<AppUser[]> {
    const res = await api.get<AppUser[]>("/api/v1/app/users/all");
    return res.data;
}

export interface RegisterUserPayload {
    username: string;
    password: string;
    role: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string; // "2022-03-10"
    email?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
}

export async function registerUser(payload: RegisterUserPayload): Promise<AppUser> {
    const res = await api.post<AppUser>("/api/v1/auth/register", payload);
    return res.data;
}

export interface SyncAgentPayload {
    agentId: string;
    userId: string;
}

export interface SyncAgent {
    // campi “base” usati in sync-agents.tsx
    id?: string;
    agentId: string;
    apiKey?: string | null;

    // campi possibili da info endpoint
    enabled?: boolean;
    tenantId?: string;
    userId?: string;

    user?: {
        id: string;
        username: string;
        role: string;
    };

    creationDate?: string;
    updateDate?: string;
}

export async function createSyncAgent(payload: SyncAgentPayload): Promise<SyncAgent> {
    const res = await api.post<SyncAgent>("/api/v1/admin/sync-agents", payload);
    return res.data;
}

export async function fetchSyncAgentInfoByUserId(userId: string): Promise<SyncAgent | null> {
    try {
        const res = await api.get<SyncAgent>(`/api/v1/admin/sync-agents/get-info/${userId}`);
        return res.data;
    } catch (e: any) {
        const status = e?.response?.status;

        // Se il backend usa 404 quando NON c'è il sync agent
        if (status === 404) {
            return null;
        }

        // altri errori li propaghiamo
        throw e;
    }
}
