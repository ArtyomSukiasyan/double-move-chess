import { useEffect, useRef } from "react";
import { GameState, Move } from "../engine/types";
import type { BotRequest, BotResponse } from "./bot.worker";
import { SearchOptions } from "./search";

export type Level = "easy" | "medium" | "hard";

export const LEVELS: Record<Level, SearchOptions> = {
  easy: { maxDepth: 2, timeLimitMs: 300 },
  medium: { maxDepth: 4, timeLimitMs: 1500 },
  hard: { maxDepth: 8, timeLimitMs: 4000 },
};

/** Short pause before each bot move, so the two moves of its turn can be followed by eye. */
const MOVE_DELAY_MS = 400;

/**
 * Asks the bot for a move whenever `state` is a position it should play. Answers for a
 * position that is no longer current (restart, new move) are thrown away.
 */
export function useBot(state: GameState | null, level: Level, onMove: (move: Move) => void) {
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    const worker = new Worker(new URL("./bot.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<BotResponse>) => {
      const { id, move } = event.data;
      if (id === requestId.current && move) onMoveRef.current(move);
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    if (!state) return;

    const timer = setTimeout(() => {
      const request: BotRequest = { id, state, options: LEVELS[level] };
      workerRef.current?.postMessage(request);
    }, MOVE_DELAY_MS);

    // The next run bumps `requestId`, which also discards a search already in progress.
    return () => clearTimeout(timer);
  }, [state, level]);
}
