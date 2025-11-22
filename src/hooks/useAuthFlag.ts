import { useEffect, useState } from "react";
import { bootstrapAuthToken, getAuthToken } from "../services/api";

// Se vuoi bypassare l'auth in dev, metti true
const DEV_BYPASS_AUTH = true;

export function useAuthFlag() {
    const [ready, setReady] = useState(false);
    const [authed, setAuthed] = useState<boolean | null>(null);

    useEffect(() => {
        (async () => {
            try {
                if (DEV_BYPASS_AUTH) {
                    setAuthed(true);
                } else {
                    await bootstrapAuthToken();
                    const token = getAuthToken();
                    setAuthed(!!token);
                }
            } finally {
                setReady(true);
            }
        })();
    }, []);

    return { ready, authed };
}
