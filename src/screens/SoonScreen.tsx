import { McButton } from "../components/McButton";
import "./TitleScreen.css";
import "./SoonScreen.css";

type SoonScreenProps = {
  onBack: () => void;
};

export function SoonScreen({ onBack }: SoonScreenProps) {
  return (
    <div className="title-screen">
      <div className="title-screen__dirt" />
      <div className="title-screen__shade" />

      <div className="title-screen__content soon">
        <p className="soon__label">Строим мир...</p>
        <p className="soon__text">
          Игровое поле ещё не готово. Пока это только меню.
        </p>
        <div className="soon__actions">
          <McButton wide onClick={onBack}>
            В меню
          </McButton>
        </div>
      </div>
    </div>
  );
}
