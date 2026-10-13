import { useSettings } from "../settings/SettingsContext";
import "./ResourceStub.css";

const SLOT_COUNT = 9;

/**
 * Заглушка панели ресурсов.
 * Ячейки нарочно некликабельные: сюда коллега может вставить квадратики предметов.
 */
export function ResourceStub() {
  const { t } = useSettings();

  return (
    <section className="res-stub" aria-label={t("resources")}>
      <p className="res-stub__title">{t("resources")}</p>
      <div className="res-stub__row">
        {Array.from({ length: SLOT_COUNT }, (_, index) => (
          <div key={index} className="res-stub__slot" aria-hidden="true" />
        ))}
      </div>
      <p className="res-stub__note">{t("resourcesStub")}</p>
    </section>
  );
}
