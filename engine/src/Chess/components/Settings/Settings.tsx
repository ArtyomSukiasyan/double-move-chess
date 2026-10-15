import styles from "../../Game.module.css";
import { Level } from "../../bot/useBot";
import { Color } from "../../engine/types";

interface SettingsProps {
  humanColor: Color;
  level: Level;
  onColorChange: (color: Color) => void;
  onLevelChange: (level: Level) => void;
}

export default function Settings({ humanColor, level, onColorChange, onLevelChange }: SettingsProps) {
  return (
    <div className={styles.settings}>
      <label>
        Play as
        <select
          className={styles.select}
          value={humanColor}
          onChange={(event) => onColorChange(event.target.value as Color)}
        >
          <option value="white">White</option>
          <option value="black">Black</option>
        </select>
      </label>
      <label>
        Bot level
        <select
          className={styles.select}
          value={level}
          onChange={(event) => onLevelChange(event.target.value as Level)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </label>
    </div>
  );
}
