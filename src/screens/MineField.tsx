import { useEffect, useRef, useState, type MouseEvent } from "react";
import { sendClickBatch } from "../api/backend";
import { BackendError } from "../api/client";
import {
  CLICK_BATCH_LIMIT,
  CLICK_RATE_MS,
  DEFAULT_BLOCK,
  type BlockState,
} from "../api/types";
import { clickReward, formatStones, pieceCount, stoneKind } from "../game/levels";
import { useSession } from "../session/SessionContext";
import { useSettings } from "../settings/SettingsContext";
import { useWallet } from "../wallet/WalletContext";
import { StonePile } from "./StonePile";
import "./MineField.css";

type Floater = {
  id: number;
  x: number;
  y: number;
  text: string;
};

type MineFieldProps = {
  onBreak?: () => void;
};

export function MineField({ onBreak }: MineFieldProps) {
  const { session, status } = useSession();
  const { settings } = useSettings();
  const {
    applyClickResult,
    stoneIndex,
    rewardClick,
    advanceStone,
    power,
  } = useWallet();
  const [, setBlock] = useState<BlockState>(DEFAULT_BLOCK);
  const [hit, setHit] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const pendingRef = useRef(0);
  const flushTimer = useRef<number | null>(null);
  const lastFlush = useRef(0);
  const floaterId = useRef(0);

  const spawnFloater = (clientX: number, clientY: number, root: DOMRect, text: string) => {
    const id = ++floaterId.current;
    setFloaters((current) => [
      ...current.slice(-12),
      {
        id,
        x: clientX - root.left,
        y: clientY - root.top,
        text,
      },
    ]);
    window.setTimeout(() => {
      setFloaters((current) => current.filter((item) => item.id !== id));
    }, 700);
  };

  const applyLocalHit = () => {
    setBlock((current) => {
      const nextHp = current.currentHp - 1;
      if (nextHp > 0) {
        return { ...current, currentHp: nextHp };
      }
      onBreak?.();
      return { ...DEFAULT_BLOCK };
    });
  };

  const flushClicks = async () => {
    const clicks = Math.min(pendingRef.current, CLICK_BATCH_LIMIT);
    if (clicks < 1 || !session || status !== "online") {
      return;
    }
    try {
      const result = await sendClickBatch(session.userId, clicks);
      pendingRef.current = Math.max(0, pendingRef.current - clicks);
      lastFlush.current = Date.now();
      applyClickResult(result);
      setBlock(result.block);
      if (result.destroyed) {
        onBreak?.();
      }
    } catch (err) {
      if (err instanceof BackendError && err.status === 429) {
        window.setTimeout(() => {
          void flushClicks();
        }, CLICK_RATE_MS);
        return;
      }
      pendingRef.current = 0;
      setBlock((current) => {
        if (current.currentHp > 0) {
          return current;
        }
        onBreak?.();
        return { ...DEFAULT_BLOCK };
      });
    }
    if (pendingRef.current > 0) {
      scheduleFlush();
    }
  };

  const scheduleFlush = () => {
    if (flushTimer.current !== null) {
      return;
    }
    const wait = Math.max(0, CLICK_RATE_MS - (Date.now() - lastFlush.current));
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null;
      void flushClicks();
    }, wait);
  };

  useEffect(() => {
    return () => {
      if (flushTimer.current !== null) {
        window.clearTimeout(flushTimer.current);
      }
    };
  }, []);

  const onMine = (event: MouseEvent<HTMLButtonElement>) => {
    const root = event.currentTarget.getBoundingClientRect();
    const reward = clickReward(stoneIndex) * power;
    const text = `+${formatStones(reward, settings.language === "ru")}`;
    spawnFloater(event.clientX, event.clientY, root, text);
    rewardClick(reward);
    setHit(true);
    window.setTimeout(() => setHit(false), 120);
    if (status !== "online" || !session) {
      applyLocalHit();
      return;
    }
    pendingRef.current += 1;
    setBlock((current) => ({
      ...current,
      currentHp: Math.max(0, current.currentHp - 1),
    }));
    if (pendingRef.current >= CLICK_BATCH_LIMIT) {
      if (flushTimer.current !== null) {
        window.clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      void flushClicks();
      return;
    }
    scheduleFlush();
  };

  return (
    <div className="mine">
      <StonePile
        key={stoneIndex}
        kind={stoneKind(stoneIndex)}
        pieceCount={pieceCount(stoneIndex)}
        power={power}
        shaking={hit}
        onMine={onMine}
        onBreak={advanceStone}
      >
        {floaters.map((item) => (
          <span
            key={item.id}
            className="mine__floater"
            style={{ left: item.x, top: item.y }}
            aria-hidden="true"
          >
            <b>{item.text}</b>
          </span>
        ))}
      </StonePile>
    </div>
  );
}
