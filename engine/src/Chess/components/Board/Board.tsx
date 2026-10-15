import { ReactNode } from "react";
import styles from "../../Game.module.css";
import { FILES, toSquare } from "../../engine/board";
import { Board as BoardData } from "../../engine/types";
import Square from "../Squares/Squares";

interface BoardProps {
  board: BoardData;
  flipped: boolean;
  selected: number | null;
  targets: Set<number>;
  lastMove: Set<number>;
  checkSquare: number | null;
  isClickable: (square: number) => boolean;
  onSquareClick: (square: number) => void;
  children?: ReactNode;
}

const INDEXES = [0, 1, 2, 3, 4, 5, 6, 7];

export default function Board({
  board,
  flipped,
  selected,
  targets,
  lastMove,
  checkSquare,
  isClickable,
  onSquareClick,
  children,
}: BoardProps) {
  const order = flipped ? [...INDEXES].reverse() : INDEXES;

  const squareColor = (square: number, row: number, col: number) => {
    if (square === checkSquare) return "in_check_square";
    if (square === selected) return "selected_square";
    if (targets.has(square)) return "highlighted_square";
    if (lastMove.has(square)) return "last_move_square";
    return (row + col) % 2 === 0 ? "white_square" : "black_square";
  };

  return (
    <div className={styles.board}>
      <div className={styles.row_label}>
        {order.map((row) => (
          <span key={row} className={styles.label}>
            {8 - row}
          </span>
        ))}
      </div>
      <div>
        <div className={styles.table}>
          {order.flatMap((row) =>
            order.map((col) => {
              const square = toSquare(row, col);
              return (
                <Square
                  key={square}
                  value={board[square]}
                  color={squareColor(square, row, col)}
                  cursor={isClickable(square) ? "pointer" : "default"}
                  showDot={targets.has(square)}
                  onClick={() => onSquareClick(square)}
                />
              );
            })
          )}
          {children}
        </div>
        <div className={styles.col_label}>
          {order.map((col) => (
            <span key={col} className={styles.label}>
              {FILES[col].toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
