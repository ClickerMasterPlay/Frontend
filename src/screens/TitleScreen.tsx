import { useMemo } from "react";
import { McButton } from "../components/McButton";
import { useSettings } from "../settings/SettingsContext";
import "./TitleScreen.css";

const SPLASHES = {
  ru: [
    "Копай глубже!",
    "Кирки нет!",
    "Гость копает!",
    "Осторожно, гравий!",
    "С верстака!",
    "Кликай чаще!",
    "Дерево руками!",
    "Не стой под песком!",
  ],
  en: [
    "Dig deeper!",
    "No pickaxe included!",
    "Guests dig too!",
    "Watch the gravel!",
    "Fresh from the bench!",
    "Click more!",
    "Punch the tree!",
    "Don't stand under sand!",
  ],
};

type TitleScreenProps = {
  onStart: () => void;
  onSettings: () => void;
};

export function TitleScreen({ onStart, onSettings }: TitleScreenProps) {
  const { t, settings } = useSettings();
  const splash = useMemo(() => {
    const list = SPLASHES[settings.language];
    return list[Math.floor(Math.random() * list.length)];
  }, [settings.language]);

  return (
    <div className="title-screen">
      <div className="title-screen__dirt" />
      <div className="title-screen__shade" />

      <div className="title-screen__content">
        <header className="logo">
          <h1 className="logo__title">
            <span className="logo__line">{settings.language === "en" ? "CRAFT" : "КРАФТ"}</span>
            <span className="logo__line logo__line--big">
              {settings.language === "en" ? "CLICKER" : "КЛИКЕР"}
            </span>
          </h1>
          <p className="logo__splash">{splash}</p>
        </header>

        <nav className="menu" aria-label={t("start")}>
          <McButton wide onClick={onStart}>
            {t("start")}
          </McButton>
          <div className="menu__row">
            <McButton onClick={onSettings}>{t("settings")}</McButton>
            <McButton disabled>{t("quit")}</McButton>
          </div>
        </nav>
      </div>

      <footer className="title-screen__bar">
        <span>{t("version")}</span>
        <span>{t("disclaimer")}</span>
      </footer>
    </div>
  );
}
