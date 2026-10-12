import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { strings, type MessageKey } from "../i18n/strings";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Language,
  type SettingsState,
} from "./settings";

type SettingsContextValue = {
  settings: SettingsState;
  t: (key: MessageKey) => string;
  setLanguage: (language: Language) => void;
  setSound: (sound: boolean) => void;
  setVolume: (volume: number) => void;
  setHints: (hints: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    saveSettings(settings);
    document.documentElement.lang = settings.language;
    document.title = settings.language === "en" ? "Craft Clicker" : "Крафт кликер";
  }, [ready, settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      t: (key) => strings[settings.language][key],
      setLanguage: (language) => setSettings((current) => ({ ...current, language })),
      setSound: (sound) => setSettings((current) => ({ ...current, sound })),
      setVolume: (volume) => setSettings((current) => ({ ...current, volume })),
      setHints: (hints) => setSettings((current) => ({ ...current, hints })),
    }),
    [settings],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return value;
}
