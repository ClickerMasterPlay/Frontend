import { useEffect, useRef, useState, type MouseEvent } from "react";
import { sendClickBatch } from "../api/backend";
import { BackendError } from "../api/client";
import {
  CLICK_BATCH_LIMIT,
  CLICK_RATE_MS,
  DEFAULT_BLOCK,
  type BlockState,
} from "../api/types";
import { useSession } from "../session/SessionContext";
import { useWallet } from "../wallet/WalletContext";
import { effectiveClickPower, toolMultiplier } from "../wallet/wallet";
import "./MineField.css";

type Floater = {
  id: number;
  x: number;
  y: number;
};

type MineFieldProps = {
  onBreak?: () => void;
};

export function MineField({ onBreak }: MineFieldProps) {
  const { session, status } = useSession();
  const {
    active,
    clickPower,
    equippedToolCode,
    applyClickResult,
    rewardMineLocal,
  } = useWallet();
  const [, setBlock] = useState<BlockState>(DEFAULT_BLOCK);
  const [hit, setHit] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const pendingRef = useRef(0);
  const flushTimer = useRef<number | null>(null);
  const lastFlush = useRef(0);
  const floaterId = useRef(0);

  const damage = Math.max(
    1,
    Math.ceil(
      effectiveClickPower(clickPower, active) * toolMultiplier(active, equippedToolCode),
    ),
  );

  const spawnFloater = (clientX: number, clientY: number, root: DOMRect) => {
    const id = ++floaterId.current;
    setFloaters((current) => [
      ...current.slice(-12),
      {
        id,
        x: clientX - root.left,
        y: clientY - root.top,
      },
    ]);
    window.setTimeout(() => {
      setFloaters((current) => current.filter((item) => item.id !== id));
    }, 700);
  };

  const applyLocalHit = () => {
    setBlock((current) => {
      const nextHp = current.currentHp - damage;
      if (nextHp > 0) {
        return { ...current, currentHp: nextHp };
      }
      rewardMineLocal(1, current.type || "stone", 1);
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
        rewardMineLocal(1, current.type || "stone", 1);
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
    spawnFloater(event.clientX, event.clientY, root);
    setHit(true);
    window.setTimeout(() => setHit(false), 120);
    if (status !== "online" || !session) {
      applyLocalHit();
      return;
    }
    pendingRef.current += 1;
    setBlock((current) => ({
      ...current,
      currentHp: Math.max(0, current.currentHp - damage),
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
      <button
        type="button"
        className={hit ? "mine__block mine__block--hit" : "mine__block"}
        onClick={onMine}
        aria-label="stone"
      >
        <span className="mine__stone" aria-hidden="true">
          <span className="mine__crack mine__crack--a" />
          <span className="mine__crack mine__crack--b" />
          <span className="mine__moss" />
        </span>
        {floaters.map((item) => (
          <span
            key={item.id}
            className="mine__floater"
            style={{ left: item.x, top: item.y }}
            aria-hidden="true"
          >
            <span className="mine__floater-stone" />
            <b>+1</b>
          </span>
        ))}
      </button>
    </div>
  );
}
