import { useState } from "react";
import { GameMusic } from "./audio/GameMusic";
import { GameScreen } from "./screens/GameScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TitleScreen } from "./screens/TitleScreen";
import { SessionProvider, useSession } from "./session/SessionContext";
import { SettingsProvider } from "./settings/SettingsContext";
import { WalletProvider } from "./wallet/WalletContext";

type Screen = "title" | "game" | "settings" | "profile";

function screenFromHash(): Screen {
  const hash = window.location.hash.replace("#", "");
  if (hash === "game" || hash === "settings" || hash === "profile") {
    return hash;
  }
  if (
    hash === "inventory" ||
    hash === "rating" ||
    hash === "shop" ||
    hash === "quests"
  ) {
    return "game";
  }
  return "title";
}

function AppScreens() {
  const { ensureGuest, busy } = useSession();
  const [screen, setScreen] = useState<Screen>(screenFromHash);
  const [settingsFrom, setSettingsFrom] = useState<Screen>("title");

  const inGame =
    screen === "game" ||
    screen === "profile" ||
    (screen === "settings" && settingsFrom !== "title");

  const openSettings = (from: Screen) => {
    setSettingsFrom(from);
    setScreen("settings");
  };

  return (
    <>
      <GameMusic playing={inGame} />
      {screen === "settings" ? (
        <SettingsScreen
          fromGame={settingsFrom === "game" || settingsFrom === "profile"}
          onBack={() => setScreen(settingsFrom)}
          onToMenu={() => setScreen("title")}
        />
      ) : screen === "profile" ? (
        <ProfileScreen onBack={() => setScreen("game")} />
      ) : screen === "game" ? (
        <GameScreen
          onSettings={() => openSettings("game")}
          onProfile={() => setScreen("profile")}
        />
      ) : (
        <TitleScreen
          starting={busy}
          onStart={() => {
            void ensureGuest().finally(() => setScreen("game"));
          }}
          onSettings={() => openSettings("title")}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <SessionProvider>
        <WalletProvider>
          <AppScreens />
        </WalletProvider>
      </SessionProvider>
    </SettingsProvider>
  );
}
