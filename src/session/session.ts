import type { AuthPayload } from "../api/types";

const STORAGE_KEY = "kraft-clicker-session";

export type SessionState = {
  userId: string;
  isGuest: boolean;
  displayName: string | null;
};

export function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    if (typeof parsed.userId !== "string" || !parsed.userId) {
      return null;
    }
    return {
      userId: parsed.userId,
      isGuest: Boolean(parsed.isGuest),
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : null,
    };
  } catch {
    return null;
  }
}

export function saveSession(session: SessionState | null) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function sessionFromAuth(auth: AuthPayload): SessionState {
  return {
    userId: auth.userId,
    isGuest: auth.isGuest,
    displayName: auth.displayName,
  };
}
