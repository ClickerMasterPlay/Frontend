import { useState } from "react";
import { SoonScreen } from "./screens/SoonScreen";
import { TitleScreen } from "./screens/TitleScreen";

export default function App() {
  const [screen, setScreen] = useState<"title" | "soon">(() =>
    window.location.hash === "#soon" ? "soon" : "title",
  );

  if (screen === "soon") {
    return <SoonScreen onBack={() => setScreen("title")} />;
  }

  return <TitleScreen onStart={() => setScreen("soon")} />;
}
