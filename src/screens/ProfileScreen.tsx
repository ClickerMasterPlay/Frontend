import { McButton } from "../components/McButton";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import "./TitleScreen.css";
import "./SettingsScreen.css";
import "./ProfileScreen.css";

type ProfileScreenProps = {
  onBack: () => void;
};

const ACHIEVEMENTS = [
  { key: "achGuest" as const, done: true },
  { key: "achFirstClick" as const, done: false },
  { key: "achBreakBlock" as const, done: false },
  { key: "achStack" as const, done: false },
  { key: "achTool" as const, done: false },
  { key: "achTop" as const, done: false },
];

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { t } = useSettings();
  const { coins, blocksBroken } = useWallet();

  return (
    <div className="title-screen">
      <div className="title-screen__dirt" />
      <div className="title-screen__shade" />

      <div className="title-screen__content">
      <div className="settings profile">
        <h1 className="settings__title">{t("profile")}</h1>

        <div className="profile__card">
          <p className="profile__name">{t("guestName")}</p>
          <p className="profile__mode">{t("guestMode")}</p>
          <ul className="profile__stats">
            <li>
              <span>{t("statBlocks")}</span>
              <span>{blocksBroken}</span>
            </li>
            <li>
              <span>{t("statCoins")}</span>
              <span>{coins}</span>
            </li>
          </ul>
        </div>

        <section className="profile__achs" aria-label={t("achievements")}>
          <p className="profile__achs-title">{t("achievements")}</p>
          <ul className="profile__ach-list">
            {ACHIEVEMENTS.map((item) => (
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
