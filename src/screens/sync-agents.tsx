// app/settings/sync-agents.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    useWindowDimensions,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    Users,
    Key,
    RefreshCw,
    Search,
    Sun,
    Moon,
    LogOut,
    ChevronRight,
    Shield,
    BadgeCheck,
    UserPlus,
    Save,
    Settings,
} from "lucide-react-native";

import { THEME_KEY, useColors } from "@/src/hooks/useColors";
import { clearAuthToken } from "@/src/services/api";
import ZenixLogo from "@/assets/zenixpos.svg";

import {
    AppUser,
    fetchAllUsers,
    createSyncAgent,
    SyncAgent,
    registerUser,
    RegisterUserPayload,
    fetchSyncAgentInfoByUserId,
} from "@/src/services/users";

import {
    GenericPermission,
    fetchAllPermissions,
} from "@/src/services/permissions";

import {
    fetchUserPermissionIds,
    assignPermissionsToUser,
} from "@/src/services/userPermissions";

type ThemeMode = "light" | "dark";
type ActivePanel = "register" | "apiKey" | "permissions";

function suggestAgentIdFromUser(user: AppUser): string {
    const base =
        user.firstName && user.lastName
            ? `${user.firstName}-${user.lastName}`
            : user.name ||
            user.username ||
            user.email ||
            user.id ||
            "agent";

    const safe = base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return `${safe}-agent`;
}

export default function SyncAgentsSettingsScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();

    const isSmallScreen = width < 768;
    const isMediumScreen = width < 1200;
    const contentMaxWidth = 1200;

    const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
    const C = useColors(themeMode, true);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [existingAgent, setExistingAgent] = useState<SyncAgent | null>(null);
    const [loadingAgentInfo, setLoadingAgentInfo] = useState(false);
    const loadSyncAgentInfoForUser = async (userId: string) => {
        try {
            setLoadingAgentInfo(true);
            const info = await fetchSyncAgentInfoByUserId(userId);
            setExistingAgent(info);

            // opzionale: se esiste già, precompili il campo Agent ID
            if (info?.agentId) {
                setAgentId(info.agentId);
            }
        } catch (e: any) {
            console.log(
                "FETCH_SYNC_AGENT_INFO_ERROR",
                e?.response?.data || e?.message
            );
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Errore nel recupero delle info Sync Agent."
            );
        } finally {
            setLoadingAgentInfo(false);
        }
    };


    const [agentId, setAgentId] = useState("");
    const [creating, setCreating] = useState(false);
    const [lastCreated, setLastCreated] = useState<SyncAgent | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [activePanel, setActivePanel] = useState<ActivePanel>("apiKey");

    // stato form registrazione
    const [registering, setRegistering] = useState(false);
    const [reg, setReg] = useState<RegisterUserPayload>({
        username: "",
        password: "",
        role: "USER",
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        email: "",
        phoneNumber: "",
        address: "",
        city: "",
        postalCode: "",
        country: "",
    });

    // ---- PERMESSI UTENTE ----
    const [allPermissions, setAllPermissions] = useState<GenericPermission[]>([]);
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
    const [loadingUserPerms, setLoadingUserPerms] = useState(false);
    const [savingUserPerms, setSavingUserPerms] = useState(false);

    /* -------- TEMA -------- */
    useEffect(() => {
        (async () => {
            const saved = (await AsyncStorage.getItem(THEME_KEY)) as ThemeMode | null;
            if (saved === "light" || saved === "dark") {
                setThemeMode(saved);
            }
        })();
    }, []);

    const toggleTheme = async () => {
        const next = themeMode === "dark" ? "light" : "dark";
        setThemeMode(next);
        await AsyncStorage.setItem(THEME_KEY, next);
    };

    /* -------- API: utenti + permessi generici -------- */

    const loadUsers = async () => {
        try {
            setError(null);
            const list = await fetchAllUsers();
            setUsers(list);

            if (!selectedUser && list.length > 0) {
                const first = list[0];
                setSelectedUser(first);
                setAgentId(suggestAgentIdFromUser(first));
            }
        } catch (e: any) {
            console.log("FETCH_USERS_ERROR", e?.response?.data || e?.message);
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Errore nel caricamento degli utenti."
            );
        }
    };

    const loadGenericPermissions = async () => {
        try {
            const list = await fetchAllPermissions();
            setAllPermissions(list);
        } catch (e: any) {
            console.log(
                "FETCH_GENERIC_PERMISSIONS_ERROR",
                e?.response?.data || e?.message
            );
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Errore nel caricamento dei permessi generici."
            );
        }
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([loadUsers(), loadGenericPermissions()]);
            setLoading(false);
        })();
    }, []);

    useEffect(() => {
        if (activePanel === "apiKey" && selectedUser?.id) {
            loadSyncAgentInfoForUser(selectedUser.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePanel, selectedUser?.id]);

    const onRefresh = async () => {
        try {
            setRefreshing(true);
            await Promise.all([loadUsers(), loadGenericPermissions()]);
        } finally {
            setRefreshing(false);
        }
    };

    /* -------- Logout -------- */

    const handleLogout = async () => {
        const ask = () =>
            Platform.OS === "web"
                ? Promise.resolve(window.confirm("Vuoi davvero uscire?"))
                : new Promise<boolean>((resolve) => {
                    Alert.alert("Logout", "Vuoi davvero uscire?", [
                        { text: "Annulla", style: "cancel", onPress: () => resolve(false) },
                        {
                            text: "Esci",
                            style: "destructive",
                            onPress: () => resolve(true),
                        },
                    ]);
                });

        const ok = await ask();
        if (!ok) return;

        await clearAuthToken();
        router.replace("/login");
    };

    /* -------- UTENTI FILTRATI -------- */

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;

        return users.filter((u) => {
            const haystack = [
                u.firstName ?? "",
                u.lastName ?? "",
                u.name ?? "",
                u.username ?? "",
                u.email ?? "",
                u.id ?? "",
            ]
                .join(" ")
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [users, search]);

    const onSelectUser = (user: AppUser) => {
        setSelectedUser(user);
        setLastCreated(null);
        setAgentId(suggestAgentIdFromUser(user));
        // opzionale: potresti anche lasciare il pannello corrente
        setActivePanel("apiKey");
    };

    /* -------- CREA SYNC AGENT / API KEY -------- */

    const onCreateSyncAgent = async () => {
        if (!selectedUser) {
            Alert.alert("Attenzione", "Seleziona prima un utente.");
            return;
        }

        const trimmedId = agentId.trim();
        if (!trimmedId) {
            Alert.alert("Attenzione", "Inserisci un Agent ID valido.");
            return;
        }

        try {
            setCreating(true);
            setError(null);

            const payload = {
                agentId: trimmedId,
                userId: selectedUser.id,
            };

            const created = await createSyncAgent(payload);
            setLastCreated(created);

            Alert.alert(
                "Api Key generata",
                created.apiKey
                    ? "La Api Key è stata generata correttamente."
                    : "Sync Agent creato correttamente."
            );
        } catch (e: any) {
            console.log("CREATE_SYNC_AGENT_ERROR", e?.response?.data || e?.message);
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Errore durante la generazione della Api Key."
            );
        } finally {
            setCreating(false);
        }
    };

    /* -------- REGISTER USER -------- */

    const onChangeRegField = (key: keyof RegisterUserPayload, value: string) => {
        setReg((prev) => ({ ...prev, [key]: value }));
    };

    const onRegisterUser = async () => {
        if (!reg.username.trim() || !reg.password.trim()) {
            Alert.alert("Attenzione", "Username e password sono obbligatori.");
            return;
        }
        if (!reg.email?.trim()) {
            Alert.alert("Attenzione", "Email consigliata per gestire l'utente.");
        }
        if (!reg.role?.trim()) {
            Alert.alert("Attenzione", "Imposta un ruolo per l'utente.");
            return;
        }

        try {
            setRegistering(true);
            setError(null);

            const payload: RegisterUserPayload = {
                ...reg,
                username: reg.username.trim(),
                password: reg.password,
                role: reg.role.trim(),
                email: reg.email?.trim() || undefined,
                firstName: reg.firstName?.trim() || undefined,
                lastName: reg.lastName?.trim() || undefined,
                dateOfBirth: reg.dateOfBirth || undefined,
                phoneNumber: reg.phoneNumber?.trim() || undefined,
                address: reg.address?.trim() || undefined,
                city: reg.city?.trim() || undefined,
                postalCode: reg.postalCode?.trim() || undefined,
                country: reg.country?.trim() || undefined,
            };

            const created = await registerUser(payload);

            // reset form base (role/country le lascio per comodità)
            setReg((prev) => ({
                ...prev,
                username: "",
                password: "",
                firstName: "",
                lastName: "",
                dateOfBirth: "",
                email: "",
                phoneNumber: "",
                address: "",
                city: "",
                postalCode: "",
            }));

            // ricarico utenti e seleziono quello creato
            await loadUsers();
            setSelectedUser(created);
            setAgentId(suggestAgentIdFromUser(created));
            setActivePanel("apiKey");

            Alert.alert(
                "Utente creato",
                "L'utente è stato registrato correttamente. Ora puoi generare la sua Api Key."
            );
        } catch (e: any) {
            console.log("REGISTER_USER_ERROR", e?.response?.data || e?.message);
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Errore durante la registrazione dell'utente."
            );
        } finally {
            setRegistering(false);
        }
    };

    /* -------- PERMESSI UTENTE (solo lista di ID) -------- */

    const loadPermissionsForUser = async (userId: string) => {
        try {
            setLoadingUserPerms(true);
            const ids = await fetchUserPermissionIds(userId);
            setSelectedPermissionIds(ids);
        } catch (e: any) {
            console.log(
                "FETCH_USER_PERMISSION_IDS_ERROR",
                e?.response?.data || e?.message
            );
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Errore nel caricamento dei permessi utente."
            );
        } finally {
            setLoadingUserPerms(false);
        }
    };

    const togglePermissionForUser = (permissionId: string) => {
        setSelectedPermissionIds((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const onSaveUserPermissions = async () => {
        if (!selectedUser) {
            Alert.alert("Attenzione", "Seleziona prima un utente.");
            return;
        }

        try {
            setSavingUserPerms(true);
            setError(null);

            await assignPermissionsToUser(selectedUser.id, selectedPermissionIds);
            // ricarico per sicurezza (anche se la risposta è già la lista aggiornata)
            await loadPermissionsForUser(selectedUser.id);

            Alert.alert(
                "Permessi aggiornati",
                "I permessi dell'utente sono stati aggiornati correttamente."
            );
        } catch (e: any) {
            console.log(
                "ASSIGN_PERMISSIONS_ERROR",
                e?.response?.data || e?.message
            );
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Errore durante l'assegnazione dei permessi utente."
            );
        } finally {
            setSavingUserPerms(false);
        }
    };

    // Quando apro il tab "permissions" e c'è un utente selezionato → carico i permessi
    useEffect(() => {
        if (activePanel === "permissions" && selectedUser) {
            loadPermissionsForUser(selectedUser.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePanel, selectedUser?.id]);

    /* -------- UI -------- */

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: C.screenBg,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator size="large" color={C.accent} />
                <Text style={{ color: C.textSecondary, marginTop: 8 }}>
                    Caricamento utenti...
                </Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.screenBg }}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* HEADER STILE POS */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: isSmallScreen ? 10 : 12,
                    paddingVertical: isSmallScreen ? 8 : 10,
                    backgroundColor: C.headerBg,
                    borderBottomWidth: 1,
                    borderBottomColor: C.headerBorder,
                }}
            >
                {/* Logo + titolo */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: isSmallScreen ? 6 : 10,
                        flex: 1,
                    }}
                >
                    <View
                        style={{
                            alignItems: "center",
                            justifyContent: "center",
                            height: 30,
                        }}
                    >
                        <ZenixLogo
                            width={isSmallScreen ? 90 : 110}
                            height={50}
                            color={themeMode === "dark" ? "#FFFFFF" : "#000000"}
                        />
                    </View>
                    <View style={{ flexShrink: 1 }}>
                        <Text
                            style={{
                                color: C.brandText ?? C.textPrimary,
                                fontSize: isSmallScreen ? 16 : 18,
                                fontWeight: "800",
                            }}
                            numberOfLines={1}
                        >
                            Cloud Manager
                        </Text>
                        {!isSmallScreen && (
                            <Text
                                style={{
                                    color: C.textSecondary,
                                    fontSize: 11,
                                }}
                                numberOfLines={1}
                            >
                                Gestione utenti, Api Key & permessi
                            </Text>
                        )}
                    </View>
                </View>

                {/* Azioni header */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    <TouchableOpacity
                        onPress={onRefresh}
                        disabled={refreshing}
                        style={{
                            padding: 6,
                            borderRadius: 999,
                            backgroundColor: C.rowBg,
                            borderWidth: 1,
                            borderColor: C.cardBorder,
                        }}
                    >
                        <RefreshCw
                            size={18}
                            color={refreshing ? C.accent : C.textSecondary}
                        />
                    </TouchableOpacity>

                    {/* link rapido alla pagina permessi generici */}
                    <TouchableOpacity
                        onPress={() => router.push("/settings/permissions")}
                        style={{
                            padding: 6,
                            borderRadius: 999,
                            backgroundColor: C.rowBg,
                            borderWidth: 1,
                            borderColor: C.cardBorder,
                        }}
                    >
                        <Settings size={18} color={C.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={toggleTheme}
                        style={{
                            padding: 6,
                            borderRadius: 999,
                        }}
                    >
                        {themeMode === "dark" ? (
                            <Sun size={20} color={C.icon} />
                        ) : (
                            <Moon size={20} color={C.icon} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleLogout}
                        style={{
                            paddingHorizontal: isSmallScreen ? 6 : 8,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: C.rowBg,
                            borderWidth: 1,
                            borderColor: C.cardBorder,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        <LogOut size={18} color={C.textSecondary} />
                        {!isSmallScreen && (
                            <Text
                                style={{
                                    color: C.textSecondary,
                                    fontSize: 12,
                                    fontWeight: "700",
                                }}
                            >
                                Logout
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* BODY */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingVertical: 16,
                    paddingHorizontal: isSmallScreen ? 10 : 16,
                    paddingBottom: 30,
                    alignItems: "center",
                }}
            >
                <View
                    style={{
                        width: "100%",
                        maxWidth: contentMaxWidth,
                    }}
                >
                    {/* Banner introduttivo */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: isSmallScreen ? 8 : 10,
                            borderRadius: 12,
                            backgroundColor: C.rowBg,
                            borderWidth: 1,
                            borderColor: C.cardBorder,
                            marginBottom: 16,
                            gap: 10,
                        }}
                    >
                        <View
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                backgroundColor: C.cardInsetBg ?? C.sectionAlt,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Shield size={18} color={C.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    color: C.textPrimary,
                                    fontWeight: "700",
                                    fontSize: 14,
                                }}
                            >
                                Utenze Cloud, Api Key & permessi
                            </Text>
                            <Text
                                style={{
                                    color: C.textSecondary,
                                    fontSize: 12,
                                    marginTop: 2,
                                }}
                            >
                                Crea nuove utenze, assegna Api Key (Sync Agent) e
                                gestisci i permessi applicativi per ogni utente.
                            </Text>
                        </View>
                    </View>

                    {/* Error */}
                    {error && (
                        <View
                            style={{
                                marginBottom: 16,
                                padding: 10,
                                borderRadius: 12,
                                backgroundColor: "#7f1d1d",
                                borderWidth: 1,
                                borderColor: "#fecaca",
                            }}
                        >
                            <Text
                                style={{
                                    color: "#fee2e2",
                                    fontSize: 12,
                                }}
                            >
                                {error}
                            </Text>
                        </View>
                    )}

                    {/* 2 colonne: utenti / dettaglio */}
                    <View
                        style={{
                            flexDirection: isSmallScreen ? "column" : "row",
                            gap: 16,
                        }}
                    >
                        {/* COLONNA SINISTRA: lista utenti */}
                        <View
                            style={{
                                flexBasis: isSmallScreen ? "100%" : isMediumScreen ? 280 : 320,
                                flexGrow: 1,
                                borderRadius: 16,
                                backgroundColor: C.cardBg,
                                borderWidth: 1,
                                borderColor: C.cardBorder,
                                padding: 12,
                                ...(Platform.OS === "web"
                                    ? { maxHeight: 530 }
                                    : {}),
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 8,
                                }}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Users size={18} color={C.accent} />
                                    <Text
                                        style={{
                                            marginLeft: 6,
                                            color: C.textPrimary,
                                            fontWeight: "800",
                                        }}
                                    >
                                        Utenze registrate
                                    </Text>
                                </View>
                                {!isSmallScreen && (
                                    <Text
                                        style={{
                                            color: C.textSecondary,
                                            fontSize: 11,
                                        }}
                                    >
                                        {users.length} utenti
                                    </Text>
                                )}
                            </View>

                            {/* search */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 8,
                                    borderRadius: 999,
                                    backgroundColor: C.inputBg,
                                    borderWidth: 1,
                                    borderColor: C.inputBorder,
                                    paddingHorizontal: 10,
                                }}
                            >
                                <Search size={16} color={C.textSecondary} />
                                <TextInput
                                    value={search}
                                    onChangeText={setSearch}
                                    placeholder="Cerca per nome, email o ID"
                                    placeholderTextColor={C.placeholder}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 6,
                                        paddingHorizontal: 6,
                                        color: C.textPrimary,
                                        fontSize: 12,
                                    }}
                                />
                            </View>

                            {/* lista utenti */}
                            <ScrollView
                                style={{ flex: 1, marginTop: 4 }}
                                contentContainerStyle={{ paddingBottom: 8 }}
                            >
                                {filteredUsers.length === 0 && (
                                    <Text
                                        style={{
                                            color: C.textSecondary,
                                            fontSize: 12,
                                            marginTop: 10,
                                        }}
                                    >
                                        Nessun utente trovato.
                                    </Text>
                                )}

                                {filteredUsers.map((u) => {
                                    const isSelected = selectedUser?.id === u.id;
                                    const title =
                                        (u.firstName || "") && (u.lastName || "")
                                            ? `${u.firstName} ${u.lastName}`
                                            : u.name || u.username || u.email || u.id;
                                    const subtitle = u.email || u.username || "";

                                    return (
                                        <TouchableOpacity
                                            key={u.id}
                                            onPress={() => onSelectUser(u)}
                                            style={{
                                                paddingVertical: 8,
                                                paddingHorizontal: 10,
                                                borderRadius: 10,
                                                marginBottom: 6,
                                                backgroundColor: isSelected
                                                    ? C.rowSelectedBg ?? "#1f2937"
                                                    : C.rowBg,
                                                borderWidth: 1,
                                                borderColor: isSelected
                                                    ? C.accent
                                                    : C.cardBorder,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={{
                                                        color: C.textPrimary,
                                                        fontSize: 13,
                                                        fontWeight: "700",
                                                    }}
                                                    numberOfLines={1}
                                                >
                                                    {title}
                                                </Text>
                                                {subtitle ? (
                                                    <Text
                                                        style={{
                                                            color: C.textSecondary,
                                                            fontSize: 11,
                                                            marginTop: 1,
                                                        }}
                                                        numberOfLines={1}
                                                    >
                                                        {subtitle}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <ChevronRight
                                                size={16}
                                                color={
                                                    isSelected
                                                        ? C.accent
                                                        : C.textSecondary
                                                }
                                            />
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* COLONNA DESTRA: tab Registrazione / Api Key / Permessi */}
                        <View
                            style={{
                                flexBasis: isSmallScreen ? "100%" : isMediumScreen ? 320 : 380,
                                flexGrow: 1,
                                borderRadius: 16,
                                backgroundColor: C.cardBg,
                                borderWidth: 1,
                                borderColor: C.cardBorder,
                                padding: 14,
                                marginTop: isSmallScreen ? 12 : 0,
                            }}
                        >
                            {/* Tabs */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    marginBottom: 10,
                                    backgroundColor: C.rowBg,
                                    borderRadius: 999,
                                    padding: 2,
                                }}
                            >
                                <TouchableOpacity
                                    onPress={() => setActivePanel("register")}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 6,
                                        borderRadius: 999,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor:
                                            activePanel === "register"
                                                ? C.cardInsetBg ?? C.screenBg
                                                : "transparent",
                                    }}
                                >
                                    <UserPlus
                                        size={16}
                                        color={
                                            activePanel === "register"
                                                ? C.textPrimary
                                                : C.textSecondary
                                        }
                                    />
                                    <Text
                                        style={{
                                            marginLeft: 4,
                                            color:
                                                activePanel === "register"
                                                    ? C.textPrimary
                                                    : C.textSecondary,
                                            fontSize: 12,
                                            fontWeight: "700",
                                        }}
                                    >
                                        Nuovo utente
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setActivePanel("apiKey")}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 6,
                                        borderRadius: 999,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor:
                                            activePanel === "apiKey"
                                                ? C.cardInsetBg ?? C.screenBg
                                                : "transparent",
                                    }}
                                >
                                    <Key
                                        size={16}
                                        color={
                                            activePanel === "apiKey"
                                                ? C.textPrimary
                                                : C.textSecondary
                                        }
                                    />
                                    <Text
                                        style={{
                                            marginLeft: 4,
                                            color:
                                                activePanel === "apiKey"
                                                    ? C.textPrimary
                                                    : C.textSecondary,
                                            fontSize: 12,
                                            fontWeight: "700",
                                        }}
                                    >
                                        Api Key utente
                                    </Text>

                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setActivePanel("permissions")}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 6,
                                        borderRadius: 999,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor:
                                            activePanel === "permissions"
                                                ? C.cardInsetBg ?? C.screenBg
                                                : "transparent",
                                    }}
                                >
                                    <Shield
                                        size={16}
                                        color={
                                            activePanel === "permissions"
                                                ? C.textPrimary
                                                : C.textSecondary
                                        }
                                    />
                                    <Text
                                        style={{
                                            marginLeft: 4,
                                            color:
                                                activePanel === "permissions"
                                                    ? C.textPrimary
                                                    : C.textSecondary,
                                            fontSize: 12,
                                            fontWeight: "700",
                                        }}
                                    >
                                        Permessi utente
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {activePanel === "register" ? (
                                /* -------- PANEL REGISTRAZIONE -------- */
                                <ScrollView
                                    style={{ flex: 1 }}
                                    contentContainerStyle={{ paddingBottom: 8 }}
                                >
                                    <Text
                                        style={{
                                            color: C.textPrimary,
                                            fontSize: 13,
                                            fontWeight: "800",
                                            marginBottom: 8,
                                        }}
                                    >
                                        Registrazione nuova utenza
                                    </Text>

                                    <Text
                                        style={{
                                            color: C.textSecondary,
                                            fontSize: 11,
                                            marginBottom: 10,
                                        }}
                                    >
                                        Compila i dati dell&apos;utente. Dopo la
                                        registrazione potrai generare la sua Api Key
                                        nella sezione &quot;Api Key utente&quot;.
                                    </Text>

                                    {/* Campi principali */}
                                    <Field
                                        label="Username *"
                                        value={reg.username}
                                        onChange={(v) => onChangeRegField("username", v)}
                                        placeholder="es. mario.rossi"
                                        C={C}
                                    />

                                    <Field
                                        label="Password *"
                                        value={reg.password}
                                        onChange={(v) => onChangeRegField("password", v)}
                                        placeholder="••••••••"
                                        secureTextEntry
                                        C={C}
                                    />

                                    <Field
                                        label="Ruolo *"
                                        value={reg.role}
                                        onChange={(v) => onChangeRegField("role", v)}
                                        placeholder="es. ADMIN, USER..."
                                        C={C}
                                    />

                                    <View
                                        style={{
                                            flexDirection: isSmallScreen ? "column" : "row",
                                            gap: 8,
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Field
                                                label="Nome"
                                                value={reg.firstName || ""}
                                                onChange={(v) =>
                                                    onChangeRegField("firstName", v)
                                                }
                                                placeholder="Mario"
                                                C={C}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Field
                                                label="Cognome"
                                                value={reg.lastName || ""}
                                                onChange={(v) =>
                                                    onChangeRegField("lastName", v)
                                                }
                                                placeholder="Rossi"
                                                C={C}
                                            />
                                        </View>
                                    </View>

                                    <Field
                                        label="Email"
                                        value={reg.email || ""}
                                        onChange={(v) => onChangeRegField("email", v)}
                                        placeholder="mario.rossi@example.com"
                                        keyboardType="email-address"
                                        C={C}
                                    />

                                    {/* Campi aggiuntivi */}
                                    <View
                                        style={{
                                            flexDirection: isSmallScreen ? "column" : "row",
                                            gap: 8,
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Field
                                                label="Telefono"
                                                value={reg.phoneNumber || ""}
                                                onChange={(v) =>
                                                    onChangeRegField("phoneNumber", v)
                                                }
                                                placeholder="+39..."
                                                keyboardType="phone-pad"
                                                C={C}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Field
                                                label="Data di nascita"
                                                value={reg.dateOfBirth || ""}
                                                onChange={(v) =>
                                                    onChangeRegField("dateOfBirth", v)
                                                }
                                                placeholder="YYYY-MM-DD"
                                                C={C}
                                            />
                                        </View>
                                    </View>

                                    <Field
                                        label="Indirizzo"
                                        value={reg.address || ""}
                                        onChange={(v) => onChangeRegField("address", v)}
                                        placeholder="Via, numero civico"
                                        C={C}
                                    />

                                    <View
                                        style={{
                                            flexDirection: isSmallScreen ? "column" : "row",
                                            gap: 8,
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Field
                                                label="Città"
                                                value={reg.city || ""}
                                                onChange={(v) =>
                                                    onChangeRegField("city", v)
                                                }
                                                placeholder="Milano"
                                                C={C}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Field
                                                label="CAP"
                                                value={reg.postalCode || ""}
                                                onChange={(v) =>
                                                    onChangeRegField("postalCode", v)
                                                }
                                                placeholder="20100"
                                                keyboardType="numeric"
                                                C={C}
                                            />
                                        </View>
                                    </View>

                                    <Field
                                        label="Paese"
                                        value={reg.country || ""}
                                        onChange={(v) =>
                                            onChangeRegField("country", v)
                                        }
                                        placeholder="Italia"
                                        C={C}
                                    />

                                    <TouchableOpacity
                                        onPress={onRegisterUser}
                                        disabled={registering}
                                        style={{
                                            marginTop: 10,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            paddingVertical: 10,
                                            borderRadius: 10,
                                            backgroundColor: registering
                                                ? C.btnDisabled
                                                : C.accent,
                                        }}
                                    >
                                        {registering ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={C.onAccent}
                                            />
                                        ) : (
                                            <>
                                                <UserPlus
                                                    size={16}
                                                    color={C.onAccent}
                                                />
                                                <Text
                                                    style={{
                                                        marginLeft: 6,
                                                        color: C.onAccent,
                                                        fontWeight: "800",
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    Registra utente
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                </ScrollView>

                            ) : activePanel === "apiKey" ? (
                                /* -------- PANEL API KEY -------- */
                                <>
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: 6,
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Key size={18} color={C.accent} />
                                            <Text
                                                style={{
                                                    marginLeft: 6,
                                                    color: C.textPrimary,
                                                    fontWeight: "800",
                                                }}
                                            >
                                                Genera Api Key per utente
                                            </Text>
                                        </View>
                                    </View>

                                    {!selectedUser ? (
                                        <Text
                                            style={{
                                                color: C.textSecondary,
                                                marginTop: 10,
                                                fontSize: 12,
                                            }}
                                        >
                                            Seleziona un utente nella lista per
                                            configurare la Api Key.
                                        </Text>
                                    ) : (
                                        <>
                                            {/* info utente */}
                                            <View
                                                style={{
                                                    padding: 10,
                                                    borderRadius: 12,
                                                    backgroundColor: C.rowBg,
                                                    borderWidth: 1,
                                                    borderColor: C.cardBorder,
                                                    marginBottom: 12,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: C.textPrimary,
                                                        fontWeight: "700",
                                                        fontSize: 13,
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    {selectedUser.firstName ||
                                                    selectedUser.lastName
                                                        ? `${selectedUser.firstName ?? ""} ${
                                                            selectedUser.lastName ?? ""
                                                        }`.trim()
                                                        : selectedUser.name ||
                                                        selectedUser.username ||
                                                        selectedUser.email ||
                                                        selectedUser.id}
                                                </Text>
                                                {selectedUser.email && (
                                                    <Text
                                                        style={{
                                                            color: C.textSecondary,
                                                            fontSize: 11,
                                                        }}
                                                    >
                                                        {selectedUser.email}
                                                    </Text>
                                                )}
                                                <Text
                                                    style={{
                                                        color: C.textSecondary,
                                                        fontSize: 11,
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    User ID:{" "}
                                                    <Text
                                                        style={{
                                                            color: C.textPrimary,
                                                        }}
                                                    >
                                                        {selectedUser.id}
                                                    </Text>
                                                </Text>
                                            </View>

                                            {/* agent id */}
                                            <Text
                                                style={{
                                                    color: C.textPrimary,
                                                    fontSize: 13,
                                                    fontWeight: "700",
                                                    marginBottom: 4,
                                                }}
                                            >
                                                Agent ID
                                            </Text>
                                            <TextInput
                                                value={agentId}
                                                onChangeText={setAgentId}
                                                placeholder="es. mario-rossi-agent"
                                                placeholderTextColor={C.placeholder}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                                style={{
                                                    backgroundColor: C.inputBg,
                                                    borderWidth: 1,
                                                    borderColor: C.inputBorder,
                                                    borderRadius: 10,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 10,
                                                    color: C.textPrimary,
                                                    fontSize: 13,
                                                    marginBottom: 10,
                                                }}
                                            />

                                            <TouchableOpacity
                                                onPress={onCreateSyncAgent}
                                                disabled={creating}
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    paddingVertical: 10,
                                                    borderRadius: 10,
                                                    backgroundColor: creating
                                                        ? C.btnDisabled
                                                        : C.accent,
                                                }}
                                            >
                                                {creating ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color={C.onAccent}
                                                    />
                                                ) : (
                                                    <>
                                                        <BadgeCheck
                                                            size={16}
                                                            color={C.onAccent}
                                                        />
                                                        <Text
                                                            style={{
                                                                marginLeft: 6,
                                                                color: C.onAccent,
                                                                fontWeight: "800",
                                                                fontSize: 13,
                                                            }}
                                                        >
                                                            Genera Api Key
                                                        </Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                            {loadingAgentInfo ? (
                                                <View style={{ paddingVertical: 8 }}>
                                                    <ActivityIndicator size="small" color={C.accent} />
                                                    <Text
                                                        style={{
                                                            color: C.textSecondary,
                                                            fontSize: 11,
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        Verifica Sync Agent esistente...
                                                    </Text>
                                                </View>
                                            ) : existingAgent ? (
                                                <View
                                                    style={{
                                                        marginBottom: 10,
                                                        padding: 10,
                                                        borderRadius: 12,
                                                        backgroundColor: C.rowBg,
                                                        borderWidth: 1,
                                                        borderColor: C.cardBorder,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: C.textPrimary,
                                                            fontSize: 12,
                                                            fontWeight: "700",
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        Sync Agent già configurato
                                                    </Text>
                                                    <Text style={{ color: C.textSecondary, fontSize: 11 }}>
                                                        Agent ID: <Text style={{ color: C.textPrimary }}>{existingAgent.agentId}</Text>
                                                    </Text>
                                                    {existingAgent.apiKey && (
                                                        <Text
                                                            style={{
                                                                color: C.textSecondary,
                                                                fontSize: 11,
                                                                marginTop: 2,
                                                            }}
                                                            numberOfLines={1}
                                                        >
                                                            Api Key:{" "}
                                                            <Text style={{ color: C.textPrimary }}>
                                                                {existingAgent.apiKey}
                                                            </Text>
                                                        </Text>
                                                    )}
                                                    <Text
                                                        style={{
                                                            color: existingAgent.enabled ? "#22c55e" : "#f97316",
                                                            fontSize: 11,
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        Stato: {existingAgent.enabled ? "Abilitato" : "Disabilitato"}
                                                    </Text>
                                                </View>
                                            ) : null}

                                            {lastCreated && (
                                                <View
                                                    style={{
                                                        marginTop: 14,
                                                        padding: 10,
                                                        borderRadius: 12,
                                                        backgroundColor: C.rowBg,
                                                        borderWidth: 1,
                                                        borderColor: C.cardBorder,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: C.textSecondary,
                                                            fontSize: 11,
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        Ultimo Sync Agent creato:
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            color: C.textPrimary,
                                                            fontSize: 12,
                                                            fontWeight: "700",
                                                        }}
                                                    >
                                                        Agent ID:{" "}
                                                        {lastCreated.agentId}
                                                    </Text>
                                                    {lastCreated.apiKey && (
                                                        <Text
                                                            style={{
                                                                color: C.textSecondary,
                                                                fontSize: 11,
                                                                marginTop: 4,
                                                            }}
                                                            selectable
                                                        >
                                                            Api Key:{" "}
                                                            <Text
                                                                style={{
                                                                    color: C.textPrimary,
                                                                }}
                                                            >
                                                                {lastCreated.apiKey}
                                                            </Text>
                                                        </Text>
                                                    )}
                                                    {lastCreated.creationDate && (
                                                        <Text
                                                            style={{
                                                                color: C.textSecondary,
                                                                fontSize: 11,
                                                                marginTop: 4,
                                                            }}
                                                        >
                                                            Creato il:{" "}
                                                            {lastCreated.creationDate}
                                                        </Text>
                                                    )}
                                                </View>
                                            )}
                                        </>
                                    )}
                                </>
                            ) : (
                                /* -------- PANEL PERMESSI UTENTE -------- */
                                <>
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: 6,
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Shield size={18} color={C.accent} />
                                            <Text
                                                style={{
                                                    marginLeft: 6,
                                                    color: C.textPrimary,
                                                    fontWeight: "800",
                                                }}
                                            >
                                                Permessi utente
                                            </Text>
                                        </View>
                                    </View>

                                    {!selectedUser ? (
                                        <Text
                                            style={{
                                                color: C.textSecondary,
                                                marginTop: 10,
                                                fontSize: 12,
                                            }}
                                        >
                                            Seleziona un utente nella lista per gestire
                                            i permessi.
                                        </Text>
                                    ) : (
                                        <>
                                            {/* info utente */}
                                            <View
                                                style={{
                                                    padding: 10,
                                                    borderRadius: 12,
                                                    backgroundColor: C.rowBg,
                                                    borderWidth: 1,
                                                    borderColor: C.cardBorder,
                                                    marginBottom: 12,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: C.textPrimary,
                                                        fontWeight: "700",
                                                        fontSize: 13,
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    {selectedUser.firstName ||
                                                    selectedUser.lastName
                                                        ? `${selectedUser.firstName ?? ""} ${
                                                            selectedUser.lastName ?? ""
                                                        }`.trim()
                                                        : selectedUser.name ||
                                                        selectedUser.username ||
                                                        selectedUser.email ||
                                                        selectedUser.id}
                                                </Text>
                                                {selectedUser.email && (
                                                    <Text
                                                        style={{
                                                            color: C.textSecondary,
                                                            fontSize: 11,
                                                        }}
                                                    >
                                                        {selectedUser.email}
                                                    </Text>
                                                )}
                                            </View>

                                            {loadingUserPerms ? (
                                                <View
                                                    style={{
                                                        paddingVertical: 20,
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <ActivityIndicator
                                                        size="small"
                                                        color={C.accent}
                                                    />
                                                    <Text
                                                        style={{
                                                            color: C.textSecondary,
                                                            fontSize: 11,
                                                            marginTop: 6,
                                                        }}
                                                    >
                                                        Caricamento permessi utente...
                                                    </Text>
                                                </View>
                                            ) : (
                                                <ScrollView
                                                    style={{ maxHeight: 260 }}
                                                    contentContainerStyle={{
                                                        paddingVertical: 4,
                                                    }}
                                                >
                                                    {allPermissions.length === 0 && (
                                                        <Text
                                                            style={{
                                                                color: C.textSecondary,
                                                                fontSize: 12,
                                                            }}
                                                        >
                                                            Nessun permesso configurato.
                                                            Crea prima i permessi nella
                                                            sezione dedicata.
                                                        </Text>
                                                    )}

                                                    {allPermissions.map((perm) => {
                                                        const checked =
                                                            selectedPermissionIds.includes(
                                                                perm.id
                                                            );

                                                        return (
                                                            <TouchableOpacity
                                                                key={perm.id}
                                                                onPress={() =>
                                                                    togglePermissionForUser(
                                                                        perm.id
                                                                    )
                                                                }
                                                                style={{
                                                                    paddingVertical: 8,
                                                                    paddingHorizontal: 10,
                                                                    borderRadius: 10,
                                                                    marginBottom: 6,
                                                                    backgroundColor: checked
                                                                        ? C.rowSelectedBg ??
                                                                        "#111827"
                                                                        : C.rowBg,
                                                                    borderWidth: 1,
                                                                    borderColor: checked
                                                                        ? C.accent
                                                                        : C.cardBorder,
                                                                    flexDirection: "row",
                                                                    alignItems: "center",
                                                                    justifyContent:
                                                                        "space-between",
                                                                }}
                                                            >
                                                                <View
                                                                    style={{
                                                                        flex: 1,
                                                                        marginRight: 8,
                                                                    }}
                                                                >
                                                                    <Text
                                                                        style={{
                                                                            color: C.textPrimary,
                                                                            fontSize: 13,
                                                                            fontWeight: "700",
                                                                        }}
                                                                        numberOfLines={1}
                                                                    >
                                                                        {
                                                                            perm.permissionCode
                                                                        }
                                                                    </Text>
                                                                    {perm.permissionName && (
                                                                        <Text
                                                                            style={{
                                                                                color: C.textSecondary,
                                                                                fontSize: 11,
                                                                                marginTop: 1,
                                                                            }}
                                                                            numberOfLines={1}
                                                                        >
                                                                            {
                                                                                perm.permissionName
                                                                            }
                                                                        </Text>
                                                                    )}
                                                                </View>

                                                                {/* pseudo-checkbox */}
                                                                <View
                                                                    style={{
                                                                        width: 18,
                                                                        height: 18,
                                                                        borderRadius: 9,
                                                                        borderWidth: 2,
                                                                        borderColor: checked
                                                                            ? C.accent
                                                                            : C.cardBorder,
                                                                        alignItems: "center",
                                                                        justifyContent:
                                                                            "center",
                                                                    }}
                                                                >
                                                                    {checked && (
                                                                        <View
                                                                            style={{
                                                                                width: 10,
                                                                                height: 10,
                                                                                borderRadius: 5,
                                                                                backgroundColor:
                                                                                C.accent,
                                                                            }}
                                                                        />
                                                                    )}
                                                                </View>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </ScrollView>
                                            )}

                                            <TouchableOpacity
                                                onPress={onSaveUserPermissions}
                                                disabled={savingUserPerms}
                                                style={{
                                                    marginTop: 10,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    paddingVertical: 10,
                                                    borderRadius: 10,
                                                    backgroundColor: savingUserPerms
                                                        ? C.btnDisabled
                                                        : C.accent,
                                                }}
                                            >
                                                {savingUserPerms ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color={C.onAccent}
                                                    />
                                                ) : (
                                                    <>
                                                        <Save
                                                            size={16}
                                                            color={C.onAccent}
                                                        />
                                                        <Text
                                                            style={{
                                                                marginLeft: 6,
                                                                color: C.onAccent,
                                                                fontWeight: "800",
                                                                fontSize: 13,
                                                            }}
                                                        >
                                                            Salva permessi utente
                                                        </Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

/* Campo riutilizzabile per il form */
function Field({
                   label,
                   value,
                   onChange,
                   placeholder,
                   secureTextEntry,
                   keyboardType,
                   C,
               }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
    C: any;
}) {
    return (
        <View style={{ marginBottom: 8 }}>
            <Text
                style={{
                    color: C.textPrimary,
                    fontSize: 12,
                    fontWeight: "700",
                    marginBottom: 3,
                }}
            >
                {label}
            </Text>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={C.placeholder}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize="none"
                style={{
                    backgroundColor: C.inputBg,
                    borderWidth: 1,
                    borderColor: C.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    color: C.textPrimary,
                    fontSize: 13,
                }}
            />
        </View>
    );
}
