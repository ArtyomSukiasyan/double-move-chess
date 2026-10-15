import styles from "../../Game.module.css";
import { pieceGlyph } from "../../constants/pieces";
import { Piece } from "../../engine/types";

interface SquareProps {
  value: Piece | null;
  color: string;
  cursor: string;
  showDot: boolean;
  onClick: () => void;
}

export default function Square({ value, color, cursor, showDot, onClick }: SquareProps) {
  return (
    <div className={`${styles.square} ${styles[color]} ${styles[cursor]}`} onClick={onClick}>
      {value && <span className={styles.piece}>{pieceGlyph(value)}</span>}
      {showDot && !value && <span className={styles.target_dot} />}
    </div>
  );
}
