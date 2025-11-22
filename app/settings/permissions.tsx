// app/settings/permissions.tsx
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
    Switch,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    Shield,
    RefreshCw,
    Sun,
    Moon,
    LogOut,
    Settings as SettingsIcon,
    Search,
    ChevronRight,
    Plus,
    Save,
    Trash2,
    ChevronLeft,
} from "lucide-react-native";

import { THEME_KEY, useColors } from "@/src/hooks/useColors";
import api, { clearAuthToken, extractApiErrorMessage } from "@/src/services/api";
import ZenixLogo from "@/assets/zenixpos.svg";
import {
    GenericPermission,
    GenericPermissionPayload,
    fetchAllPermissions,
    createPermission,
    updatePermission,
    deletePermission,
} from "@/src/services/permissions";

type ThemeMode = "light" | "dark";

interface PermissionFormState {
    id: string | null;
    permissionCode: string;
    permissionName: string;
    permissionDescription: string;
    enabled: boolean;
}

export default function PermissionsSettingsScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();

    const isSmallScreen = width < 768;
    const isMediumScreen = width < 1200;
    const maxContentWidth = 1200;

    const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
    const C = useColors(themeMode, true);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [permissions, setPermissions] = useState<GenericPermission[]>([]);
    const [search, setSearch] = useState("");

    const [form, setForm] = useState<PermissionFormState>({
        id: null,
        permissionCode: "",
        permissionName: "",
        permissionDescription: "",
        enabled: true,
    });

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    /* -------- API: caricamento permessi -------- */
    const loadPermissions = async () => {
        try {
            setError(null);
            const list = await fetchAllPermissions();
            setPermissions(list);
        } catch (e: any) {
            console.log("FETCH_PERMISSIONS_ERROR", e?.response?.data || e?.message);
            setError(extractApiErrorMessage(e));
        }
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await loadPermissions();
            setLoading(false);
        })();
    }, []);

    const onRefresh = async () => {
        try {
            setRefreshing(true);
            await loadPermissions();
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

    /* -------- Filtraggio permessi -------- */
    const filteredPermissions = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return permissions;

        return permissions.filter((p) => {
            const haystack = [
                p.permissionCode ?? "",
                p.permissionName ?? "",
                p.permissionDescription ?? "",
                p.id ?? "",
            ]
                .join(" ")
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [permissions, search]);

    /* -------- Gestione form -------- */
    const resetForm = () => {
        setForm({
            id: null,
            permissionCode: "",
            permissionName: "",
            permissionDescription: "",
            enabled: false,
        });
    };

    const fillFormFromPermission = (p: GenericPermission) => {
        setForm({
            id: p.id,
            permissionCode: p.permissionCode || "",
            permissionName: p.permissionName || "",
            permissionDescription: p.permissionDescription || "",
            enabled: p.enabled,
        });
    };

    const onSelectPermission = (p: GenericPermission) => {
        fillFormFromPermission(p);
    };

    const onChangeField = (key: keyof PermissionFormState, value: string) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const validateForm = (): boolean => {
        if (!form.permissionCode.trim()) {
            Alert.alert("Attenzione", "Il codice permesso è obbligatorio.");
            return false;
        }
        if (!form.permissionName.trim()) {
            Alert.alert("Attenzione", "Il nome permesso è obbligatorio.");
            return false;
        }
        return true;
    };

    const onSave = async () => {
        if (!validateForm()) return;

        // payload base
        const basePayload: GenericPermissionPayload = {
            permissionCode: form.permissionCode.trim(),
            permissionName: form.permissionName.trim(),
            permissionDescription: form.permissionDescription.trim() || undefined,
        };

        // 👇 regola richiesta:
        // - nuovo oggetto → enabled = false SEMPRE
        // - oggetto esistente → enabled = valore scelto nel form
        const payload: GenericPermissionPayload = form.id
            ? { ...basePayload, enabled: form.enabled }
            : { ...basePayload, enabled: false };

        try {
            setSaving(true);
            setError(null);

            let saved: GenericPermission;

            if (form.id) {
                // UPDATE
                saved = await updatePermission(form.id, payload);
            } else {
                // CREATE
                saved = await createPermission(payload);
            }

            await loadPermissions();
            fillFormFromPermission(saved); // aggiorna UI

        } catch (e: any) {
            console.log("SAVE_PERMISSION_ERROR", e?.response?.data || e?.message);
            setError(extractApiErrorMessage(e));
        } finally {
            setSaving(false);
        }
    };


    const onDelete = async () => {
        if (!form.id) {
            Alert.alert("Attenzione", "Seleziona prima un permesso da eliminare.");
            return;
        }

        const ok =
            Platform.OS === "web"
                ? window.confirm("Vuoi davvero eliminare questo permesso?")
                : await new Promise<boolean>((resolve) => {
                    Alert.alert(
                        "Conferma eliminazione",
                        "Vuoi davvero eliminare questo permesso?",
                        [
                            {
                                text: "Annulla",
                                style: "cancel",
                                onPress: () => resolve(false),
                            },
                            {
                                text: "Elimina",
                                style: "destructive",
                                onPress: () => resolve(true),
                            },
                        ]
                    );
                });

        if (!ok) return;

        try {
            setDeleting(true);
            setError(null);

            await deletePermission(form.id);
            await loadPermissions();
            resetForm(); // reset UI

        } catch (e: any) {
            console.log("DELETE_PERMISSION_ERROR", e?.response?.data || e?.message);
            setError(extractApiErrorMessage(e));
        } finally {
            setDeleting(false);
        }
    };

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
                    Caricamento permessi...
                </Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.screenBg }}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* HEADER */}
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
                {/* BACK BUTTON */}
                <TouchableOpacity
                    onPress={() => router.push("/")}
                    style={{
                        padding: 6,
                        borderRadius: 999,
                        backgroundColor: C.rowBg,
                        borderWidth: 1,
                        borderColor: C.cardBorder,
                        marginRight: 8,
                    }}
                >
                    <ChevronLeft
                        size={20}
                        color={C.textSecondary}
                    />
                </TouchableOpacity>

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
                            Gestione permessi
                        </Text>

                        {!isSmallScreen && (
                            <Text
                                style={{
                                    color: C.textSecondary,
                                    fontSize: 11,
                                }}
                                numberOfLines={1}
                            >
                                Definisci e modifica i codici permesso per il cloud.
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
                        maxWidth: maxContentWidth,
                    }}
                >
                    {/* Banner intro */}
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
                                Permessi generici
                            </Text>
                            <Text
                                style={{
                                    color: C.textSecondary,
                                    fontSize: 12,
                                    marginTop: 2,
                                }}
                            >
                                Usa i codici permesso per abilitare funzioni e ruoli nel
                                cloud. Puoi crearne di nuovi o modificare quelli esistenti.
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

                    {/* Layout 2 colonne (lista + form) */}
                    <View
                        style={{
                            flexDirection: isSmallScreen ? "column" : "row",
                            gap: 16,
                        }}
                    >
                        {/* Lista permessi */}
                        <View
                            style={{
                                flexBasis: isSmallScreen ? "100%" : isMediumScreen ? 260 : 320,
                                flexGrow: 1,
                                borderRadius: 16,
                                backgroundColor: C.cardBg,
                                borderWidth: 1,
                                borderColor: C.cardBorder,
                                padding: 12,
                                ...(Platform.OS === "web"
                                    ? { maxHeight: 520 }
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
                                <Text
                                    style={{
                                        color: C.textPrimary,
                                        fontWeight: "800",
                                    }}
                                >
                                    Elenco permessi
                                </Text>
                                {!isSmallScreen && (
                                    <Text
                                        style={{
                                            color: C.textSecondary,
                                            fontSize: 11,
                                        }}
                                    >
                                        {permissions.length} elementi
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
                                    placeholder="Cerca per codice o nome"
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

                            {/* lista */}
                            <ScrollView
                                style={{ flex: 1, marginTop: 4 }}
                                contentContainerStyle={{ paddingBottom: 8 }}
                            >
                                {filteredPermissions.length === 0 && (
                                    <Text
                                        style={{
                                            color: C.textSecondary,
                                            fontSize: 12,
                                            marginTop: 10,
                                        }}
                                    >
                                        Nessun permesso trovato.
                                    </Text>
                                )}

                                {filteredPermissions.map((p) => {
                                    const isSelected = form.id === p.id;
                                    return (
                                        <TouchableOpacity
                                            key={p.id}
                                            onPress={() => onSelectPermission(p)}
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
                                            <View style={{ flex: 1, marginRight: 6 }}>
                                                <Text
                                                    style={{
                                                        color: C.textPrimary,
                                                        fontSize: 13,
                                                        fontWeight: "700",
                                                    }}
                                                    numberOfLines={1}
                                                >
                                                    {p.permissionCode}
                                                </Text>
                                                {p.permissionName ? (
                                                    <Text
                                                        style={{
                                                            color: C.textSecondary,
                                                            fontSize: 11,
                                                            marginTop: 1,
                                                        }}
                                                        numberOfLines={1}
                                                    >
                                                        {p.permissionName}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                                <View
                                                    style={{
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        borderRadius: 999,
                                                        backgroundColor: p.enabled ? "#166534" : "#4b5563",
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: "#f9fafb",
                                                            fontSize: 10,
                                                            fontWeight: "700",
                                                        }}
                                                    >
                                                        {p.enabled ? "ATTIVO" : "DISATTIVO"}
                                                    </Text>
                                                </View>
                                                <ChevronRight
                                                    size={16}
                                                    color={isSelected ? C.accent : C.textSecondary}
                                                    style={{ marginLeft: 6 }}
                                                />
                                            </View>

                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Form permesso */}
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
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        color: C.textPrimary,
                                        fontWeight: "800",
                                    }}
                                >
                                    {form.id
                                        ? "Modifica permesso"
                                        : "Nuovo permesso"}
                                </Text>

                                <TouchableOpacity
                                    onPress={resetForm}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 4,
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 999,
                                        backgroundColor: C.rowBg,
                                        borderWidth: 1,
                                        borderColor: C.cardBorder,
                                    }}
                                >
                                    <Plus size={14} color={C.textSecondary} />
                                    {!isSmallScreen && (
                                        <Text
                                            style={{
                                                color: C.textSecondary,
                                                fontSize: 11,
                                                fontWeight: "700",
                                            }}
                                        >
                                            Nuovo
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* campi form */}
                            <Field
                                label="Codice permesso *"
                                value={form.permissionCode}
                                onChange={(v) => onChangeField("permissionCode", v)}
                                placeholder="es. CLOUD_ADMIN"
                                C={C}
                            />

                            <Field
                                label="Nome permesso *"
                                value={form.permissionName}
                                onChange={(v) => onChangeField("permissionName", v)}
                                placeholder="es. Amministratore cloud"
                                C={C}
                            />

                            <Field
                                label="Descrizione"
                                value={form.permissionDescription}
                                onChange={(v) =>
                                    onChangeField("permissionDescription", v)
                                }
                                placeholder="Descrivi cosa abilita questo permesso"
                                C={C}
                                multiline
                            />
                            {/* toggle enabled */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginTop: 6,
                                    marginBottom: 10,
                                }}
                            >
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text
                                        style={{
                                            color: C.textPrimary,
                                            fontSize: 12,
                                            fontWeight: "700",
                                        }}
                                    >
                                        Permesso abilitato
                                    </Text>
                                    <Text
                                        style={{
                                            color: C.textSecondary,
                                            fontSize: 11,
                                            marginTop: 2,
                                        }}
                                    >
                                        In creazione viene salvato come disabilitato. Puoi abilitarlo dopo.
                                    </Text>
                                </View>
                                <Switch
                                    value={form.enabled}
                                    onValueChange={(value) =>
                                        setForm((prev) => ({ ...prev, enabled: value }))
                                    }
                                    disabled={!form.id} // 👈 opzionale: disabilita toggle su nuovo record
                                />
                            </View>

                            {/* azioni */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    gap: 8,
                                    marginTop: 10,
                                }}
                            >
                                <TouchableOpacity
                                    onPress={onSave}
                                    disabled={saving}
                                    style={{
                                        flex: 1,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        paddingVertical: 10,
                                        borderRadius: 10,
                                        backgroundColor: saving
                                            ? C.btnDisabled
                                            : C.accent,
                                    }}
                                >
                                    {saving ? (
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
                                                Salva
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                {form.id && (
                                    <TouchableOpacity
                                        onPress={onDelete}
                                        disabled={deleting}
                                        style={{
                                            width: 44,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            paddingVertical: 10,
                                            borderRadius: 10,
                                            backgroundColor: deleting
                                                ? C.btnDisabled
                                                : "#b91c1c",
                                        }}
                                    >
                                        {deleting ? (
                                            <ActivityIndicator
                                                size="small"
                                                color="#fef2f2"
                                            />
                                        ) : (
                                            <Trash2 size={16} color="#fef2f2" />
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

/* Campo riutilizzabile */
function Field({
                   label,
                   value,
                   onChange,
                   placeholder,
                   C,
                   multiline,
               }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    C: any;
    multiline?: boolean;
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
                autoCapitalize="none"
                multiline={multiline}
                style={{
                    backgroundColor: C.inputBg,
                    borderWidth: 1,
                    borderColor: C.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: multiline ? 8 : 8,
                    color: C.textPrimary,
                    fontSize: 13,
                    minHeight: multiline ? 70 : undefined,
                    textAlignVertical: multiline ? "top" : "center",
                }}
            />
        </View>
    );
}
