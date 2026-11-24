import { useState } from "react";
import { McButton } from "../components/McButton";
import { ResourceIcon } from "../components/ResourceIcon";
import { toolMultiplierFor } from "../game/clickRewards";
import { formatStones } from "../game/levels";
import { useSession } from "../session/SessionContext";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import "./TitleScreen.css";
import "./SettingsScreen.css";
import "./ProfileScreen.css";

type ProfileScreenProps = {
  onBack: () => void;
  onLogout?: () => void;
};

export function ProfileScreen({ onBack, onLogout }: ProfileScreenProps) {
  const { t, settings } = useSettings();
  const {
    stones,
    blocksBroken,
    power,
    owned,
    serverClickPower,
    upgrades,
    active,
    equippedToolCode,
  } = useWallet();
  const { session, status, busy, error, login, register, logout } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const signedIn = Boolean(session && !session.isGuest);
  const online = status === "online" && Boolean(session);
  const clickPower = online
    ? Math.round(
        serverClickPower * toolMultiplierFor(upgrades, active, equippedToolCode) * 100,
      ) / 100
    : power;
  const name = session?.displayName || t("guestName");
  const mode = signedIn ? t("registeredMode") : t("guestMode");
  const achievements = [
    { key: "achGuest" as const, done: true },
    { key: "achFirstClick" as const, done: blocksBroken > 0 || clickPower > 1 },
    { key: "achBreakBlock" as const, done: blocksBroken > 0 },
    { key: "achStack" as const, done: stones >= 10 },
    { key: "achTool" as const, done: owned.some((id) => id === "wood" || id === "iron" || id === "gold") },
    { key: "achTop" as const, done: false },
  ];

  return (
    <div className="title-screen">
      <div className="title-screen__dirt" />
      <div className="title-screen__shade" />

      <div className="title-screen__content">
        <div className="settings profile">
          <h1 className="settings__title">{t("profile")}</h1>

          <div className="profile__card">
            <p className="profile__name">{name}</p>
            <p className="profile__mode">{mode}</p>
            <ul className="profile__stats">
              <li>
                <span>{t("statStones")}</span>
                <span className="res-inline">
                  <ResourceIcon kind="stone" size={26} />
                  {formatStones(stones, settings.language === "ru")}
                </span>
              </li>
              <li>
                <span>{t("statClickPower")}</span>
                <span>{formatStones(clickPower, settings.language === "ru")}</span>
              </li>
            </ul>
          </div>

          {signedIn ? null : (
            <form
              className="profile__form"
              onSubmit={(event) => {
                event.preventDefault();
                if (authMode === "login") {
                  void login(email, password);
                  return;
                }
                void register(email, password, displayName.trim());
              }}
            >
              <p className="profile__achs-title">
                {authMode === "login" ? t("login") : t("register")}
              </p>
              {authMode === "register" ? (
                <label className="profile__field">
                  <span>{t("displayName")}</span>
                  <input
                    type="text"
                    autoComplete="nickname"
                    maxLength={100}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </label>
              ) : null}
              <label className="profile__field">
                <span>{t("email")}</span>
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="profile__field">
                <span>{t("password")}</span>
                <input
                  type="password"
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  minLength={authMode === "register" ? 8 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {error ? <p className="profile__error">{error}</p> : null}
              <McButton
                wide
                disabled={
                  busy ||
                  !email ||
                  !password ||
                  (authMode === "register" && (password.length < 8 || !displayName.trim()))
                }
                onClick={() => {
                  if (authMode === "login") {
                    void login(email, password);
                    return;
                  }
                  void register(email, password, displayName.trim());
                }}
              >
                {authMode === "login" ? t("login") : t("register")}
              </McButton>
              <button
                type="button"
                className="profile__switch"
                onClick={() => setAuthMode((mode) => (mode === "login" ? "register" : "login"))}
              >
                {authMode === "login" ? (
                  <>
                    {t("noAccount")} <span>{t("registerLink")}</span>
                  </>
                ) : (
                  <>
                    {t("hasAccount")} <span>{t("login")}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {signedIn ? (
            <div className="profile__logout">
              <McButton
                wide
                onClick={() => {
                  logout();
                  onLogout?.();
                }}
              >
                {t("quit")}
              </McButton>
            </div>
          ) : null}

          <section className="profile__achs" aria-label={t("achievements")}>
            <p className="profile__achs-title">{t("achievements")}</p>
            <ul className="profile__ach-list">
              {achievements.map((item) => (
                <li
                  key={item.key}
                  className={item.done ? "profile__ach profile__ach--on" : "profile__ach"}
                >
                  <span>{t(item.key)}</span>
                  <span>{item.done ? t("achDone") : t("achLocked")}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="settings__actions">
            <McButton wide onClick={onBack}>
              {t("back")}
            </McButton>
          </div>
        </div>
      </div>
    </div>
  );
}
