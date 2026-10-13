import { McModal } from "../components/McModal";
import { useSettings } from "../settings/SettingsContext";
import { ShopBoard } from "./ShopBoard";

type ShopModalProps = {
  onClose: () => void;
};

export function ShopModal({ onClose }: ShopModalProps) {
  const { t } = useSettings();

  return (
    <McModal title={t("shop")} closeLabel={t("close")} wide onClose={onClose}>
      <ShopBoard />
    </McModal>
  );
}
