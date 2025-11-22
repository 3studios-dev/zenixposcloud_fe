// src/services/userPermissions.ts
import api from "@/src/services/api";

/* === TIPI === */

export interface PermissionUserLink {
    id: string;  // id del record permission-user
    permission: {
        id: string;
        permissionCode: string;
        permissionName: string;
        permissionDescription: string;
        enabled: boolean;
    };
    user: {
        id: string;
        username: string;
        role: string;
        // ...altri campi se ti servono
    };
    // ...createdBy, creationDate, ecc se mai ti servono
}

/* === API === */

// (OPZIONALE) GET /api/v1/app/permission-user/all
// Ora tipizzato correttamente come lista di PermissionUserLink
export async function fetchAllPermissionUsers(): Promise<PermissionUserLink[]> {
    const res = await api.get<PermissionUserLink[]>(
        "/api/v1/app/permission-user/all"
    );
    return res.data;
}

// ✅ GET /api/v1/app/permission-user/all/{userId}
// Il backend restituisce PermissionUserLink[], noi lo trasformiamo in string[]
// con SOLO gli id dei permessi (permission.id)
export async function fetchUserPermissionIds(userId: string): Promise<string[]> {
    const res = await api.get<PermissionUserLink[]>(
        `/api/v1/app/permission-user/all/${userId}`
    );

    // 👇 prendiamo l'id del permesso associato
    return res.data.map((link) => link.permission.id);
}

// ✅ POST /api/v1/app/permission-user/{userId}
// body: [ "uuid1", "uuid2", ... ]
// risposta: sempre [ "uuid1", "uuid2", ... ] (se il backend è fatto così)
export async function assignPermissionsToUser(
    userId: string,
    permissionIds: string[]
): Promise<string[]> {
    const res = await api.post<string[]>(
        `/api/v1/app/permission-user/${userId}`,
        permissionIds   // array puro di ID permessi
    );
    return res.data;
}

// Se non ti serve PUT/DELETE, puoi anche toglierle del tutto o tipizzarle bene
export async function updatePermissionUser(
    id: string,
    payload: any
): Promise<PermissionUserLink> {
    const res = await api.put<PermissionUserLink>(
        `/api/v1/app/permission-user/${id}`,
        payload
    );
    return res.data;
}

export async function deletePermissionUser(id: string): Promise<void> {
    await api.delete(`/api/v1/app/permission-user/${id}`);
}
