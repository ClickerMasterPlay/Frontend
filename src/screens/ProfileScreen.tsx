import { useState } from "react";
import { McButton } from "../components/McButton";
import { formatStones } from "../game/levels";
import { useSession } from "../session/SessionContext";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import "./TitleScreen.css";
import "./SettingsScreen.css";
import "./ProfileScreen.css";

type ProfileScreenProps = {
  onBack: () => void;
};

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { t, settings } = useSettings();
  const { stones, blocksBroken, power, owned } = useWallet();
  const { session, busy, error, login, register } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const name = session?.displayName || t("guestName");
  const mode = session && !session.isGuest ? t("registeredMode") : t("guestMode");
  const achievements = [
    { key: "achGuest" as const, done: true },
    { key: "achFirstClick" as const, done: blocksBroken > 0 || power > 1 },
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
                <span>{t("statBlocks")}</span>
                <span>{blocksBroken}</span>
              </li>
              <li>
                <span>{t("statStones")}</span>
                <span>{formatStones(stones, settings.language === "ru")}</span>
              </li>
              <li>
                <span>{t("statClickPower")}</span>
                <span>{formatStones(power, settings.language === "ru")}</span>
              </li>
            </ul>
          </div>

          <form
            className="profile__form"
            onSubmit={(event) => {
              event.preventDefault();
              void login(email, password);
            }}
          >
            <p className="profile__achs-title">{t("account")}</p>
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
                autoComplete="current-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {session?.isGuest !== false ? (
              <label className="profile__field">
                <span>{t("displayName")}</span>
                <input
                  type="text"
                  maxLength={100}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>
            ) : null}
            {error ? <p className="profile__error">{error}</p> : null}
            <div className="profile__form-actions">
              <McButton
                slim
                disabled={busy || !email || !password}
                onClick={() => {
                  void login(email, password);
                }}
              >
                {t("login")}
              </McButton>
              {session?.isGuest !== false ? (
                <McButton
                  slim
                  disabled={busy || !email || password.length < 8}
                  onClick={() => {
                    void register(email, password, displayName);
                  }}
                >
                  {t("register")}
                </McButton>
              ) : null}
            </div>
          </form>

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
