import React from "react";
import { Redirect } from "expo-router";
import { useAuthFlag } from "../src/hooks/useAuthFlag";
import POSScreen from "../src/screens/sync-agents";

export default function IndexGate() {
    const { ready, authed } = useAuthFlag();
    if (!ready) return null;
    if (!authed) return <Redirect href="/login" />;
    return <POSScreen />;
}
