/// <reference lib="webworker" />
import { GameState, Move } from "../engine/types";
import { findBestMove, SearchOptions } from "./search";

export interface BotRequest {
  id: number;
  state: GameState;
  options: SearchOptions;
}

export interface BotResponse {
  id: number;
  move: Move | null;
}

/** Runs the search off the main thread so the board stays responsive while the bot thinks. */
self.onmessage = (event: MessageEvent<BotRequest>) => {
  const { id, state, options } = event.data;
  const { move } = findBestMove(state, options);
  self.postMessage({ id, move } satisfies BotResponse);
};
