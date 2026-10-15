import styles from "../../Game.module.css";
import { PROMOTION_CHOICES, pieceGlyph } from "../../constants/pieces";
import { Color, PromotionType } from "../../engine/types";

interface PromotionPickerProps {
  color: Color;
  onPick: (type: PromotionType) => void;
  onCancel: () => void;
}

export default function PromotionPicker({ color, onPick, onCancel }: PromotionPickerProps) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.picker} onClick={(e) => e.stopPropagation()}>
        <div>Promote to</div>
        <div className={styles.picker_choices}>
          {PROMOTION_CHOICES.map((type) => (
            <button key={type} className={styles.picker_choice} title={type} onClick={() => onPick(type)}>
              <span className={styles.piece}>{pieceGlyph({ type, color })}</span>
            </button>
          ))}
        </div>
        <button className={styles.button} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
