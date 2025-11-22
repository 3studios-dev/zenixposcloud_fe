// src/services/permissions.ts
import api from "@/src/services/api";

export interface GenericPermission {
    id: string;
    permissionCode: string;
    permissionName: string;
    permissionDescription?: string;
    enabled: boolean;
}

export interface GenericPermissionPayload {
    permissionCode: string;
    permissionName: string;
    permissionDescription?: string;
    enabled: boolean;
}

export async function fetchAllPermissions(): Promise<GenericPermission[]> {
    const res = await api.get<GenericPermission[]>(

        "/api/v1/app/genericPermission/all"
    );
    return res.data;
}

export async function createPermission(
    payload: GenericPermissionPayload
): Promise<GenericPermission> {
    const res = await api.post<GenericPermission>(
        "/api/v1/app/genericPermission",
        payload
    );
    return res.data;
}

export async function updatePermission(
    id: string,
    payload: GenericPermissionPayload
): Promise<GenericPermission> {
    const res = await api.put<GenericPermission>(
        `/api/v1/app/genericPermission/${id}`,
        payload
    );
    return res.data;
}

export async function deletePermission(id: string): Promise<void> {
    await api.delete(`/api/v1/app/genericPermission/${id}`);
}
