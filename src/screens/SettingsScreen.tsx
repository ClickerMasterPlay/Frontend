import { McButton } from "../components/McButton";
import { useSettings } from "../settings/SettingsContext";
import "./TitleScreen.css";
import "./SettingsScreen.css";

type SettingsScreenProps = {
  fromGame: boolean;
  onBack: () => void;
  onToMenu: () => void;
};

export function SettingsScreen({
  fromGame,
  onBack,
  onToMenu,
}: SettingsScreenProps) {
  const { t, settings, setLanguage, setSound, setVolume, setHints } =
    useSettings();

  return (
    <div className="title-screen">
      <div className="title-screen__dirt" />
      <div className="title-screen__shade" />

      <div className="title-screen__content">
      <div className="settings">
        <h1 className="settings__title">{t("settingsTitle")}</h1>
        {settings.hints ? <p className="settings__hint">{t("hintSettings")}</p> : null}

        <div className="settings__list">
          <div className="settings__row">
            <span>{t("language")}</span>
            <div className="settings__pair">
              <McButton
                slim
                active={settings.language === "ru"}
                onClick={() => setLanguage("ru")}
              >
                {t("languageRu")}
              </McButton>
              <McButton
                slim
                active={settings.language === "en"}
                onClick={() => setLanguage("en")}
              >
                {t("languageEn")}
              </McButton>
            </div>
          </div>

          <div className="settings__row">
            <span>{t("sound")}</span>
            <McButton slim onClick={() => setSound(!settings.sound)}>
              {settings.sound ? t("on") : t("off")}
            </McButton>
          </div>

          <div className="settings__row">
            <span>{t("volume")}</span>
            <div className="settings__volume" aria-label={t("volume")}>
              {Array.from({ length: 10 }, (_, index) => {
                const level = index + 1;
                const filled = settings.sound && settings.volume >= level;
                return (
                  <button
                    key={level}
                    type="button"
                    className={
                      filled
                        ? "settings__tick settings__tick--on"
                        : "settings__tick"
                    }
                    onClick={() => {
                      setSound(true);
                      setVolume(level);
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="settings__row">
            <span>{t("hints")}</span>
            <McButton slim onClick={() => setHints(!settings.hints)}>
              {settings.hints ? t("on") : t("off")}
            </McButton>
          </div>
        </div>

        <div className="settings__actions">
          <McButton wide onClick={onBack}>
            {t("back")}
          </McButton>
          {fromGame ? (
            <McButton wide onClick={onToMenu}>
              {t("toMenu")}
            </McButton>
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
}
