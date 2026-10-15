import { useEffect, useMemo, useState } from "react";
import styles from "./Game.module.css";
import Board from "./components/Board/Board";
import MatchInfo from "./components/MatchInfo/MatchInfo";
import MoveList from "./components/MoveList/MoveList";
import PromotionPicker from "./components/PromotionPicker/PromotionPicker";
import StatusPanel from "./components/StatusPanel/StatusPanel";
import { MOVES_PER_TURN, newGame, playAndRecord } from "./engine/game";
import { findKing, isInCheck, isPromotion, legalMovesFrom } from "./engine/moves";
import { GameState, Move, MoveRecord, PromotionType } from "./engine/types";

interface History {
  /** states[0] is the starting position, states[i] the position after i moves. */
  states: GameState[];
  records: MoveRecord[];
}

const freshHistory = (): History => ({ states: [newGame()], records: [] });

export default function Game() {
  const [history, setHistory] = useState<History>(freshHistory);
  const [viewIndex, setViewIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<Move | null>(null);
  const [flipped, setFlipped] = useState(false);

  const lastIndex = history.states.length - 1;
  const current = history.states[lastIndex];
  const viewed = history.states[viewIndex];
  const isLive = viewIndex === lastIndex;
  const canPlay = isLive && current.status === "playing" && pendingPromotion === null;

  const legalTargets = useMemo(
    () => (selected === null ? [] : legalMovesFrom(current, selected)),
    [current, selected]
  );
  const targetSet = useMemo(() => new Set(legalTargets.map((m) => m.to)), [legalTargets]);

  // Highlight the moves of the turn that produced the viewed position (up to two).
  const lastMove = useMemo(() => {
    const squares = new Set<number>();
    const latest = history.records[viewIndex - 1];
    for (let i = viewIndex - 1, count = 0; i >= 0 && count < MOVES_PER_TURN; i--, count++) {
      const record = history.records[i];
      if (record.color !== latest.color) break;
      squares.add(record.from).add(record.to);
    }
    return squares;
  }, [history.records, viewIndex]);

  const checkSquare = isInCheck(viewed.board, viewed.turn) ? findKing(viewed.board, viewed.turn) : null;

  const navigate = (index: number) => {
    setViewIndex(Math.max(0, Math.min(lastIndex, index)));
    setSelected(null);
    setPendingPromotion(null);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") navigate(viewIndex - 1);
      if (event.key === "ArrowRight") navigate(viewIndex + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const play = (move: Move) => {
    const { state, record } = playAndRecord(current, move);
    setHistory({ states: [...history.states, state], records: [...history.records, record] });
    setViewIndex(lastIndex + 1);
    setSelected(null);
    setPendingPromotion(null);
  };

  const handleSquareClick = (square: number) => {
    if (!canPlay) return;

    if (selected !== null && targetSet.has(square)) {
      const move = { from: selected, to: square };
      if (isPromotion(current, move)) setPendingPromotion(move);
      else play(move);
      return;
    }

    const isOwnPiece = current.board[square]?.color === current.turn;
    setSelected(isOwnPiece && square !== selected ? square : null);
  };

  const isClickable = (square: number) =>
    canPlay && (current.board[square]?.color === current.turn || targetSet.has(square));

  const restart = () => {
    setHistory(freshHistory());
    setViewIndex(0);
    setSelected(null);
    setPendingPromotion(null);
  };

  const pickPromotion = (type: PromotionType) => {
    if (pendingPromotion) play({ ...pendingPromotion, promotion: type });
  };

  return (
    <div className={styles.game}>
      <Board
        board={viewed.board}
        flipped={flipped}
        selected={isLive ? selected : null}
        targets={isLive ? targetSet : new Set()}
        lastMove={lastMove}
        checkSquare={checkSquare}
        isClickable={isClickable}
        onSquareClick={handleSquareClick}
      >
        {pendingPromotion && (
          <PromotionPicker
            color={current.turn}
            onPick={pickPromotion}
            onCancel={() => {
              setPendingPromotion(null);
              setSelected(null);
            }}
          />
        )}
      </Board>

      <div className={styles.side_box}>
        <StatusPanel state={viewed} isLive={isLive} />
        <MatchInfo viewIndex={viewIndex} lastIndex={lastIndex} onNavigate={navigate} onRestart={restart} />
        <MoveList records={history.records} viewIndex={viewIndex} onSelect={navigate} />
        <button className={styles.button} onClick={() => setFlipped(!flipped)}>
          Flip board
        </button>
        <details className={styles.rules}>
          <summary>Rules</summary>
          <ul>
            <li>Each player makes two moves per turn.</li>
            <li>A move that gives check ends the turn at once, even if it was the first move.</li>
            <li>The checked player gets a single move, and it must escape the check.</li>
            <li>Checkmate ends the game. Stalemate is a draw.</li>
            <li>A pawn that made a double step can be taken en passant during the opponent's next turn.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
