export type Language = "ru" | "en";

export type SettingsState = {
  language: Language;
  sound: boolean;
  volume: number;
  hints: boolean;
};

export const DEFAULT_SETTINGS: SettingsState = {
  language: "ru",
  sound: true,
  volume: 8,
  hints: true,
};

const STORAGE_KEY = "kraft-clicker-settings";

export function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return {
      language: parsed.language === "en" ? "en" : "ru",
      sound: parsed.sound !== false,
      volume: clampVolume(parsed.volume),
      hints: parsed.hints !== false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clampVolume(value: unknown) {
  const numberValue = typeof value === "number" ? value : DEFAULT_SETTINGS.volume;
  return Math.min(10, Math.max(0, Math.round(numberValue)));
}
