import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { View, Text, Animated, Easing, TouchableOpacity, Modal, Pressable } from "react-native";
import { Check } from "lucide-react-native";

// Tipi
type ToastType = "error" | "info" | "success" | "warn";
type ShowToastArgs = { message: string; type?: ToastType; durationMs?: number };
type ShowSuccessArgs = { title?: string; message?: string; durationMs?: number };

type FeedbackCtx = {
    showToast: (args: ShowToastArgs) => void;
    showSuccess: (args?: ShowSuccessArgs) => Promise<void>;
};

// Context
const Ctx = createContext<FeedbackCtx | null>(null);

// ---- Toast host ----
const ToastHost = ({ theme }: { theme?: "light" | "dark" }) => {
    const [visible, setVisible] = useState(false);
    const [msg, setMsg] = useState("");
    const [type, setType] = useState<ToastType>("info");
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const y = useRef(new Animated.Value(-80)).current; // parte fuori dallo schermo
    const bgByType: Record<ToastType, string> = {
        error: "#ef4444",
        warn: "#f59e0b",
        success: "#10b981",
        info: theme === "dark" ? "#334155" : "#1f2937",
    };

    const show = (message: string, t: ToastType = "info", durationMs = 3500) => {
        setMsg(message);
        setType(t);
        setVisible(true);
        Animated.timing(y, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            Animated.timing(y, { toValue: -80, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
                setVisible(false);
                setMsg("");
            });
        }, durationMs);
    };

    // expose imperatively via window for provider (hack interno)
    (globalThis as any).__toast_show__ = show;

    if (!visible) return null;
    return (
        <Animated.View
            pointerEvents="box-none"
            style={{
                position: "absolute",
                top: 12,
                left: 12,
                right: 12,
                transform: [{ translateY: y }],
                zIndex: 9999,
            }}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                    if (timer.current) clearTimeout(timer.current);
                    Animated.timing(y, { toValue: -80, duration: 200, useNativeDriver: true }).start(() => setVisible(false));
                }}
                style={{
                    backgroundColor: bgByType[type],
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    shadowColor: "#000",
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 3,
                }}
            >
                <Text style={{ color: "#fff", fontWeight: "800" }}>{msg}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ---- Success modal ----
const SuccessHost = ({ theme }: { theme?: "light" | "dark" }) => {
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState("Fatto!");
    const [message, setMessage] = useState<string | undefined>(undefined);
    const scale = useRef(new Animated.Value(0.75)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const resolver = useRef<(() => void) | null>(null);

    const open = (t?: string, m?: string, durationMs = 1400) =>
        new Promise<void>((resolve) => {
            setTitle(t || "Operazione riuscita");
            setMessage(m);
            setVisible(true);
            resolver.current = resolve;
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
            ]).start(() => {
                setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                        Animated.timing(scale, { toValue: 0.75, duration: 200, useNativeDriver: true }),
                    ]).start(() => {
                        setVisible(false);
                        resolver.current?.();
                    });
                }, durationMs);
            });
        });

    (globalThis as any).__success_open__ = open;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={() => {}}>
            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" }}>
                <Animated.View
                    style={{
                        width: 280,
                        paddingVertical: 22,
                        paddingHorizontal: 16,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme === "dark" ? "#0b1220" : "#ffffff",
                        borderWidth: 1,
                        borderColor: theme === "dark" ? "#1f2a37" : "#dfe8f2",
                        transform: [{ scale }],
                        opacity,
                    }}
                >
                    <View
                        style={{
                            width: 84,
                            height: 84,
                            borderRadius: 999,
                            backgroundColor: "#10b981",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 12,
                            shadowColor: "#10b981",
                            shadowOpacity: 0.6,
                            shadowRadius: 10,
                            elevation: 6,
                        }}
                    >
                        <Check color={"#00150f"} size={42} />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: "900", color: theme === "dark" ? "#fff" : "#0f172a", textAlign: "center" }}>
                        {title}
                    </Text>
                    {!!message && (
                        <Text style={{ marginTop: 6, color: theme === "dark" ? "#9fb2c6" : "#4b5a68", textAlign: "center" }}>{message}</Text>
                    )}
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

// ---- Provider ----
export const FeedbackProvider = ({
                                     children,
                                     theme = "light",
                                 }: {
    children: React.ReactNode;
    theme?: "light" | "dark";
}) => {
    const value = useMemo<FeedbackCtx>(
        () => ({
            showToast: ({ message, type = "info", durationMs = 3500 }) => {
                (globalThis as any).__toast_show__?.(message, type, durationMs);
            },
            showSuccess: ({ title, message, durationMs = 1400 }: ShowSuccessArgs = {}) => {
                return (globalThis as any).__success_open__?.(title, message, durationMs) ?? Promise.resolve();
            },
        }),
        []
    );

    return (
        <Ctx.Provider value={value}>
            <View style={{ flex: 1 }}>
                {children}
                <ToastHost theme={theme} />
                <SuccessHost theme={theme} />
            </View>
        </Ctx.Provider>
    );
};

export const useFeedback = () => {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useFeedback must be used inside <FeedbackProvider/>");
    return ctx;
};
