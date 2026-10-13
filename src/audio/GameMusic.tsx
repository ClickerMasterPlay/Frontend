import { useEffect, useRef } from "react";
import { useSettings } from "../settings/SettingsContext";

type GameMusicProps = {
  playing: boolean;
};

export function GameMusic({ playing }: GameMusicProps) {
  const { settings } = useSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("/audio/campfire-song.mp3");
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = settings.sound ? settings.volume / 10 : 0;
    if (playing && settings.sound && settings.volume > 0) {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [playing, settings.sound, settings.volume]);

  return null;
}
