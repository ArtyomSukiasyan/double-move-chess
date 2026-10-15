import styles from "../../Game.module.css";
import { colorName } from "../../constants/pieces";
import { MOVES_PER_TURN } from "../../engine/game";
import { isInCheck } from "../../engine/moves";
import { GameState } from "../../engine/types";

interface StatusPanelProps {
  state: GameState;
  isLive: boolean;
}

function describe(state: GameState): { title: string; detail: string; alert: boolean } {
  const player = colorName(state.turn);

  switch (state.status) {
    case "checkmate":
      return { title: `Checkmate: ${colorName(state.winner!)} wins`, detail: "The game is over.", alert: true };
    case "stalemate":
      return { title: "Stalemate: draw", detail: `${player} has no legal move.`, alert: false };
    case "insufficient":
      return { title: "Draw", detail: "Neither side has enough material to mate.", alert: false };
  }

  if (isInCheck(state.board, state.turn)) {
    return { title: `${player} is in check`, detail: "One move only: escape the check.", alert: true };
  }
  const moveNumber = MOVES_PER_TURN - state.movesLeft + 1;
  return { title: `${player} to move`, detail: `Move ${moveNumber} of ${MOVES_PER_TURN}`, alert: false };
}

export default function StatusPanel({ state, isLive }: StatusPanelProps) {
  const { title, detail, alert } = describe(state);
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
