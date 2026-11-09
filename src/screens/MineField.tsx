import { useEffect, useRef, useState, type MouseEvent } from "react";
import { sendClickBatch } from "../api/backend";
import { BackendError } from "../api/client";
import {
  CLICK_BATCH_LIMIT,
  CLICK_RATE_MS,
  DEFAULT_BLOCK,
  type BlockState,
} from "../api/types";
import { rewardPerClick, toolMultiplierFor } from "../game/clickRewards";
import { clickReward, formatStones, pieceCount, stoneKind } from "../game/levels";
import { tierValue } from "../game/upgrades";
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
    serverClickPower,
    active,
    upgrades,
    equippedToolCode,
  } = useWallet();
  const [block, setBlock] = useState<BlockState>(DEFAULT_BLOCK);
  const [hit, setHit] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const mineRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef(0);
  const flushTimer = useRef<number | null>(null);
  const lastFlush = useRef(0);
  const floaterId = useRef(0);

  const autoRate =
    active.includes("auto") && upgrades.auto > 0 ? tierValue("auto", upgrades.auto) : 0;

  const spawnFloater = (x: number, y: number, text: string) => {
    const id = ++floaterId.current;
    setFloaters((current) => [
      ...current.slice(-12),
      {
        id,
        x,
        y,
        text,
      },
    ]);
    window.setTimeout(() => {
      setFloaters((current) => current.filter((item) => item.id !== id));
    }, 700);
  };

  const spawnFloaterAtClient = (clientX: number, clientY: number, root: DOMRect, text: string) => {
    spawnFloater(clientX - root.left, clientY - root.top, text);
  };

  const spawnAutoFloater = (amount: number) => {
    const root = mineRef.current?.getBoundingClientRect();
    if (!root) {
      return;
    }
    const jitterX = (Math.random() - 0.5) * 48;
    const jitterY = (Math.random() - 0.5) * 36;
    spawnFloater(
      root.width / 2 + jitterX,
      root.height / 2 + jitterY,
      `+${formatStones(amount, settings.language === "ru")}`,
    );
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

  useEffect(() => {
    if (autoRate <= 0) {
      return;
    }
    const amount = Math.round(autoRate);
    const tick = () => {
      spawnAutoFloater(amount);
    };
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [autoRate, settings.language]);

  const onMine = (event: MouseEvent<HTMLButtonElement>) => {
    const root = event.currentTarget.getBoundingClientRect();
    const onlineMode = status === "online" && Boolean(session);
    // Online: same formula as backend GameService (base * clickPower * tool).
    const reward = onlineMode
      ? rewardPerClick({
          blockType: block.type,
          maxHp: block.maxHp,
          toolMultiplier: toolMultiplierFor(upgrades, active, equippedToolCode),
          clickPower: serverClickPower,
        })
      : clickReward(stoneIndex) * power;
    spawnFloaterAtClient(
      event.clientX,
      event.clientY,
      root,
      `+${formatStones(reward, settings.language === "ru")}`,
    );
    rewardClick(reward);
    setHit(true);
    window.setTimeout(() => setHit(false), 120);

    if (onlineMode && session) {
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
      return;
    }

    applyLocalHit();
  };

  return (
    <div className="mine" ref={mineRef}>
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
