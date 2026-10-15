import styles from "../../Game.module.css";
import { colorName } from "../../constants/pieces";
import { MOVES_PER_TURN } from "../../engine/game";
import { isInCheck } from "../../engine/moves";
import { Color, GameState } from "../../engine/types";

interface StatusPanelProps {
  state: GameState;
  isLive: boolean;
  botColor: Color;
}

function describe(state: GameState, botColor: Color): { title: string; detail: string; alert: boolean } {
  const isBot = state.turn === botColor;
  const player = colorName(state.turn) + (isBot ? " (bot)" : "");

  switch (state.status) {
    case "checkmate":
      return { title: `Checkmate: ${colorName(state.winner!)} wins`, detail: "The game is over.", alert: true };
    case "stalemate":
      return { title: "Stalemate: draw", detail: `${player} has no legal move.`, alert: false };
    case "insufficient":
      return { title: "Draw", detail: "Neither side has enough material to mate.", alert: false };
  }

  if (isInCheck(state.board, state.turn)) {
    const detail = isBot ? "The bot is thinking..." : "One move only: escape the check.";
    return { title: `${player} is in check`, detail, alert: true };
  }
  const moveNumber = MOVES_PER_TURN - state.movesLeft + 1;
  const detail = `Move ${moveNumber} of ${MOVES_PER_TURN}` + (isBot ? ". The bot is thinking..." : "");
  return { title: `${player} to move`, detail, alert: false };
}

export default function StatusPanel({ state, isLive, botColor }: StatusPanelProps) {
  const { title, detail, alert } = describe(state, botColor);
  const showPips = state.status === "playing";
  const total = isInCheck(state.board, state.turn) ? 1 : MOVES_PER_TURN;

  return (
    <div>
      <div className={`${styles.status_title} ${alert ? styles.alert : ""}`}>{title}</div>
      <div className={styles.status_detail}>
        {isLive ? detail : "Viewing an earlier position. Press >> to return to the game."}
      </div>
      {showPips && (
        <div className={styles.pips} aria-label={`${state.movesLeft} moves left`}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`${styles.pip} ${i < state.movesLeft ? styles.pip_full : ""}`} />
          ))}
        </div>
      )}
    </div>
  );
}
