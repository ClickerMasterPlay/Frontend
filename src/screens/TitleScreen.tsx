import { useMemo } from "react";
import { McButton } from "../components/McButton";
import "./TitleScreen.css";

const SPLASHES = [
  "Копай глубже!",
  "Кирки нет!",
  "Гость копает!",
  "Осторожно, гравий!",
  "С верстака!",
  "Кликай чаще!",
  "Дерево руками!",
  "Не стой под песком!",
];

type TitleScreenProps = {
  onStart: () => void;
};

export function TitleScreen({ onStart }: TitleScreenProps) {
  const splash = useMemo(
    () => SPLASHES[Math.floor(Math.random() * SPLASHES.length)],
    [],
  );

  return (
    <div className="title-screen">
      <div className="title-screen__dirt" />
      <div className="title-screen__shade" />

      <div className="title-screen__content">
        <header className="logo">
          <h1 className="logo__title">
            <span className="logo__line">КРАФТ</span>
            <span className="logo__line logo__line--big">КЛИКЕР</span>
          </h1>
          <p className="logo__splash">{splash}</p>
        </header>

        <nav className="menu" aria-label="Главное меню">
          <McButton wide onClick={onStart}>
            Начать игру
          </McButton>
          <div className="menu__row">
            <McButton disabled>Настройки</McButton>
            <McButton disabled>Выход</McButton>
          </div>
        </nav>
      </div>

      <footer className="title-screen__bar">
        <span>Крафт кликер 0.1.0</span>
        <span>Учебный проект. Не связано с Mojang.</span>
      </footer>
    </div>
  );
}
