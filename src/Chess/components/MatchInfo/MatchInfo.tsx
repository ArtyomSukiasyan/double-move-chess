import styles from "../../Game.module.css";
import Button from "./Button";

interface MatchInfoProps {
  viewIndex: number;
  lastIndex: number;
  onNavigate: (index: number) => void;
  onRestart: () => void;
}

export default function MatchInfo({ viewIndex, lastIndex, onNavigate, onRestart }: MatchInfoProps) {
  const atStart = viewIndex === 0;
  const atEnd = viewIndex === lastIndex;

  return (
    <div className={styles.button_wrapper}>
      <Button text="<<" title="First position" disabled={atStart} onClick={() => onNavigate(0)} />
      <Button text="<" title="Previous move" disabled={atStart} onClick={() => onNavigate(viewIndex - 1)} />
      <Button text="Restart" title="New game" onClick={onRestart} />
      <Button text=">" title="Next move" disabled={atEnd} onClick={() => onNavigate(viewIndex + 1)} />
      <Button text=">>" title="Current position" disabled={atEnd} onClick={() => onNavigate(lastIndex)} />
    </div>
  );
}
