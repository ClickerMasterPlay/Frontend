import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createGuest,
  fetchProgress,
  loginAccount,
  registerAccount,
} from "../api/backend";
import { BackendError } from "../api/client";
import type { AuthPayload, ProgressPayload } from "../api/types";
import {
  loadSession,
  saveSession,
  sessionFromAuth,
  type SessionState,
} from "./session";

export type ConnectionStatus = "checking" | "online" | "offline";

type SessionContextValue = {
  session: SessionState | null;
  status: ConnectionStatus;
  busy: boolean;
  error: string | null;
  lastAuth: AuthPayload | null;
  lastProgress: ProgressPayload | null;
  ensureGuest: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAuth, setLastAuth] = useState<AuthPayload | null>(null);
  const [lastProgress, setLastProgress] = useState<ProgressPayload | null>(null);
  const [ready, setReady] = useState(false);

  const applyAuth = (auth: AuthPayload) => {
    const next = sessionFromAuth(auth);
    setSession(next);
    saveSession(next);
    setLastAuth(auth);
    setStatus("online");
    setError(null);
  };

  useEffect(() => {
    const stored = loadSession();
    setSession(stored);
    setReady(true);
    if (!stored) {
      setStatus("offline");
      return;
    }
    void fetchProgress(stored.userId)
      .then((progress) => {
        applyAuth(progress);
        setLastProgress(progress);
      })
      .catch((err: unknown) => {
        if (err instanceof BackendError && err.code === "USER_NOT_FOUND") {
          saveSession(null);
          setSession(null);
        }
        setStatus("offline");
      });
  }, []);

  const run = async (task: () => Promise<boolean>) => {
    setBusy(true);
    setError(null);
    try {
      return await task();
    } catch (err) {
      const message = err instanceof BackendError ? err.message : "Backend is unavailable";
      setError(message);
      setStatus("offline");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      status: ready ? status : "checking",
      busy,
      error,
      lastAuth,
      lastProgress,
      ensureGuest: () =>
        run(async () => {
          if (session && status === "online") {
            return true;
          }
          if (session) {
            const progress = await fetchProgress(session.userId);
            applyAuth(progress);
            setLastProgress(progress);
            return true;
          }
          const auth = await createGuest();
          applyAuth(auth);
          return true;
        }),
      login: (email, password) =>
        run(async () => {
          const auth = await loginAccount(email, password);
          applyAuth(auth);
          const progress = await fetchProgress(auth.userId);
          setLastProgress(progress);
          return true;
        }),
      register: (email, password, displayName) =>
        run(async () => {
          let userId = session?.userId;
          if (!userId) {
            const guest = await createGuest();
            applyAuth(guest);
            userId = guest.userId;
          }
          const auth = await registerAccount(userId, email, password, displayName);
          applyAuth(auth);
          const progress = await fetchProgress(auth.userId);
          setLastProgress(progress);
          return true;
        }),
    }),
    [busy, error, lastAuth, lastProgress, ready, session, status],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return value;
}
