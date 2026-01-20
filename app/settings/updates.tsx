// app/settings/updates.tsx
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
import * as DocumentPicker from "expo-document-picker";
import {
    CloudUpload,
    RefreshCw,
    Sun,
    Moon,
    LogOut,
    ChevronLeft,
    Package,
    BadgeCheck,
} from "lucide-react-native";

import ZenixLogo from "@/assets/zenixpos.svg";
import { THEME_KEY, useColors } from "@/src/hooks/useColors";
import { clearAuthToken } from "@/src/services/api";
import { UpdateModule, uploadUpdateZip } from "@/src/services/updates";

type ThemeMode = "light" | "dark";

const MODULES: UpdateModule[] = ["FE", "BE", "LAUNCHER"];

function formatJsonPreview(data: any): string {
    try {
        return JSON.stringify(data, null, 2);
    } catch {
        return String(data);
    }
}

function normalizePickedName(name?: string | null): string {
    const base =
        (name || "update.zip").split("/").pop()?.split("\\").pop() || "update.zip";
    return base.replace(/\s+/g, " ").trim();
}

export default function UpdatesCloudScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();

    const isSmallScreen = width < 768;
    const isMediumScreen = width < 1200;
    const maxContentWidth = 1200;

    const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
    const C = useColors(themeMode, true);

    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ------- UPLOAD STATE -------
    const [uploadModule, setUploadModule] = useState<UpdateModule>("FE");
    const [uploadVersion, setUploadVersion] = useState("");
    const [pickedUri, setPickedUri] = useState<string | null>(null);
    const [pickedName, setPickedName] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [lastUploadResult, setLastUploadResult] = useState<any>(null);

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

    /* -------- Logout -------- */
    const handleLogout = async () => {
        const ask = () =>
            Platform.OS === "web"
                ? Promise.resolve(window.confirm("Vuoi davvero uscire?"))
                : new Promise<boolean>((resolve) => {
                    Alert.alert("Logout", "Vuoi davvero uscire?", [
                        { text: "Annulla", style: "cancel", onPress: () => resolve(false) },
                        { text: "Esci", style: "destructive", onPress: () => resolve(true) },
                    ]);
                });

        const ok = await ask();
        if (!ok) return;

        await clearAuthToken();
        router.replace("/login");
    };

    /* -------- Refresh (soft) -------- */
    const onRefresh = async () => {
        try {
            setRefreshing(true);
            setError(null);
            // Soft refresh: ripulisce errori e UI; non ci sono liste da ricaricare.
        } finally {
            setRefreshing(false);
        }
    };

    /* -------- File picker -------- */
    const pickZip = async () => {
        try {
            setError(null);

            const res = await DocumentPicker.getDocumentAsync({
                type: [
                    "application/zip",
                    "application/x-zip-compressed",
                    "application/octet-stream",
                    "*/*",
                ],
                multiple: false,
                copyToCacheDirectory: true,
            });

            if (res.canceled) return;

            const asset = res.assets?.[0];
            if (!asset?.uri) {
                Alert.alert("Errore", "File non valido.");
                return;
            }

            const name = normalizePickedName(asset.name);
            if (!name.toLowerCase().endsWith(".zip")) {
                Alert.alert("Attenzione", "Seleziona un file .zip");
                return;
            }

            setPickedUri(asset.uri);
            setPickedName(name);
        } catch (e: any) {
            setError(e?.message || "Errore durante la selezione file.");
        }
    };

    const canUpload = useMemo(() => {
        return !!uploadVersion.trim() && !!pickedUri && !!pickedName;
    }, [uploadVersion, pickedUri, pickedName]);

    /* -------- ACTION: UPLOAD -------- */
    const onUpload = async () => {
        if (!canUpload) {
            Alert.alert("Attenzione", "Compila versione e seleziona un file .zip.");
            return;
        }

        try {
            setUploading(true);
            setError(null);
            setLastUploadResult(null);

            const data = await uploadUpdateZip({
                module: uploadModule,
                version: uploadVersion.trim(),
                fileUri: pickedUri!,
                originalFileName: pickedName!,
            });

            setLastUploadResult(data);

            Alert.alert("Upload completato", "Aggiornamento caricato correttamente.");
        } catch (e: any) {
            setError(e?.message || "Upload fallito.");
        } finally {
            setUploading(false);
        }
    };

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
                    <ChevronLeft size={20} color={C.textSecondary} />
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
                    <View style={{ alignItems: "center", justifyContent: "center", height: 30 }}>
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
                            Cloud Updates
                        </Text>

                        {!isSmallScreen && (
                            <Text
                                style={{
                                    color: C.textSecondary,
                                    fontSize: 11,
                                }}
                                numberOfLines={1}
                            >
                                Upload pacchetti ZIP (FE/BE/Launcher)
                            </Text>
                        )}
                    </View>
                </View>

                {/* Azioni header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
                <View style={{ width: "100%", maxWidth: maxContentWidth }}>
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
                            <CloudUpload size={18} color={C.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: C.textPrimary, fontWeight: "700", fontSize: 14 }}>
                                Upload aggiornamento (ZIP)
                            </Text>
                            <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 2 }}>
                                Carica un file ZIP per FE/BE/LAUNCHER indicando la versione. Il fileName viene preso automaticamente dal file selezionato.
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
                            <Text style={{ color: "#fee2e2", fontSize: 12 }}>{error}</Text>
                        </View>
                    )}

                    {/* Layout 2 colonne */}
                    <View style={{ flexDirection: isSmallScreen ? "column" : "row", gap: 16 }}>
                        {/* Colonna sinistra: Form upload */}
                        <View
                            style={{
                                flexBasis: isSmallScreen ? "100%" : isMediumScreen ? 420 : 520,
                                flexGrow: 1,
                                borderRadius: 16,
                                backgroundColor: C.cardBg,
                                borderWidth: 1,
                                borderColor: C.cardBorder,
                                padding: 14,
                            }}
                        >
                            <SectionTitle
                                title="Carica pacchetto ZIP"
                                subtitle="POST /api/v1/admin/updates (multipart/form-data)"
                                C={C}
                            />

                            <Label text="Module" C={C} />
                            <Segmented
                                options={MODULES}
                                value={uploadModule}
                                onChange={(v) => setUploadModule(v as UpdateModule)}
                                C={C}
                            />

                            <Field
                                label="Version *"
                                value={uploadVersion}
                                onChange={setUploadVersion}
                                placeholder="es. 1.4.0"
                                C={C}
                            />

                            <Label text="File ZIP *" C={C} />
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                <TouchableOpacity
                                    onPress={pickZip}
                                    style={{
                                        flex: 1,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        paddingVertical: 10,
                                        borderRadius: 10,
                                        backgroundColor: C.rowBg,
                                        borderWidth: 1,
                                        borderColor: C.cardBorder,
                                    }}
                                >
                                    <Package size={16} color={C.textSecondary} />
                                    <Text
                                        style={{
                                            marginLeft: 6,
                                            color: C.textSecondary,
                                            fontWeight: "800",
                                            fontSize: 13,
                                        }}
                                    >
                                        Seleziona ZIP
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => {
                                        setPickedUri(null);
                                        setPickedName(null);
                                    }}
                                    style={{
                                        width: 44,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        paddingVertical: 10,
                                        borderRadius: 10,
                                        backgroundColor: C.rowBg,
                                        borderWidth: 1,
                                        borderColor: C.cardBorder,
                                    }}
                                >
                                    <Text style={{ color: C.textSecondary, fontWeight: "900" }}>
                                        ×
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View
                                style={{
                                    marginTop: 10,
                                    padding: 10,
                                    borderRadius: 12,
                                    backgroundColor: C.rowBg,
                                    borderWidth: 1,
                                    borderColor: C.cardBorder,
                                }}
                            >
                                <Text style={{ color: C.textSecondary, fontSize: 11 }}>
                                    FileName (auto):
                                </Text>
                                <Text
                                    style={{
                                        color: C.textPrimary,
                                        fontSize: 12,
                                        fontWeight: "700",
                                        marginTop: 3,
                                    }}
                                    numberOfLines={2}
                                >
                                    {pickedName ? pickedName : "Nessun file selezionato"}
                                </Text>

                                <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 8 }}>
                                    Content-Type (forzato):
                                </Text>
                                <Text
                                    style={{
                                        color: C.textPrimary,
                                        fontSize: 12,
                                        fontWeight: "700",
                                        marginTop: 3,
                                    }}
                                >
                                    application/zip
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={onUpload}
                                disabled={uploading || !canUpload}
                                style={{
                                    marginTop: 12,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    paddingVertical: 10,
                                    borderRadius: 10,
                                    backgroundColor: uploading || !canUpload ? C.btnDisabled : C.accent,
                                }}
                            >
                                {uploading ? (
                                    <ActivityIndicator size="small" color={C.onAccent} />
                                ) : (
                                    <>
                                        <BadgeCheck size={16} color={C.onAccent} />
                                        <Text
                                            style={{
                                                marginLeft: 6,
                                                color: C.onAccent,
                                                fontWeight: "800",
                                                fontSize: 13,
                                            }}
                                        >
                                            Carica aggiornamento
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Colonna destra: Risultato */}
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
                            <Text style={{ color: C.textPrimary, fontWeight: "800" }}>
                                Risultato upload
                            </Text>
                            <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 4 }}>
                                Ultima risposta del server dopo la POST di upload.
                            </Text>

                            <View style={{ height: 12 }} />

                            <ResultCard
                                title="Ultimo upload"
                                data={lastUploadResult}
                                emptyText="Nessun upload eseguito."
                                C={C}
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

/* ---------- Componenti UI locali ---------- */

function SectionTitle({
                          title,
                          subtitle,
                          C,
                      }: {
    title: string;
    subtitle: string;
    C: any;
}) {
    return (
        <View style={{ marginBottom: 10 }}>
            <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: "800" }}>
                {title}
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 2 }}>
                {subtitle}
            </Text>
        </View>
    );
}

function Label({ text, C }: { text: string; C: any }) {
    return (
        <Text
            style={{
                color: C.textPrimary,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 6,
            }}
        >
            {text}
        </Text>
    );
}

function Segmented({
                       options,
                       value,
                       onChange,
                       C,
                   }: {
    options: string[];
    value: string;
    onChange: (v: string) => void;
    C: any;
}) {
    return (
        <View
            style={{
                flexDirection: "row",
                backgroundColor: C.rowBg,
                borderRadius: 999,
                padding: 2,
                borderWidth: 1,
                borderColor: C.cardBorder,
                marginBottom: 10,
            }}
        >
            {options.map((opt) => {
                const active = opt === value;
                return (
                    <TouchableOpacity
                        key={opt}
                        onPress={() => onChange(opt)}
                        style={{
                            flex: 1,
                            paddingVertical: 7,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: active ? (C.cardInsetBg ?? C.screenBg) : "transparent",
                        }}
                    >
                        <Text
                            style={{
                                color: active ? C.textPrimary : C.textSecondary,
                                fontSize: 12,
                                fontWeight: "800",
                            }}
                        >
                            {opt}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function Field({
                   label,
                   value,
                   onChange,
                   placeholder,
                   C,
               }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    C: any;
}) {
    return (
        <View style={{ marginBottom: 10 }}>
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
                style={{
                    backgroundColor: C.inputBg,
                    borderWidth: 1,
                    borderColor: C.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: C.textPrimary,
                    fontSize: 13,
                }}
            />
        </View>
    );
}

function ResultCard({
                        title,
                        data,
                        emptyText,
                        C,
                    }: {
    title: string;
    data: any;
    emptyText: string;
    C: any;
}) {
    const hasData = data !== null && data !== undefined;

    return (
        <View
            style={{
                padding: 10,
                borderRadius: 12,
                backgroundColor: C.rowBg,
                borderWidth: 1,
                borderColor: C.cardBorder,
            }}
        >
            <Text style={{ color: C.textPrimary, fontSize: 12, fontWeight: "800" }}>
                {title}
            </Text>

            {!hasData ? (
                <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 6 }}>
                    {emptyText}
                </Text>
            ) : (
                <Text
                    selectable
                    style={{
                        color: C.textPrimary,
                        fontSize: 11,
                        marginTop: 6,
                        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                    }}
                >
                    {formatJsonPreview(data)}
                </Text>
            )}
        </View>
    );
}
