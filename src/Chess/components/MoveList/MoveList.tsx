import { useEffect, useRef } from "react";
import styles from "../../Game.module.css";
import { MoveRecord } from "../../engine/types";

interface MoveListProps {
  /** records[i] is the move that led to history position i + 1. */
  records: MoveRecord[];
  viewIndex: number;
  onSelect: (index: number) => void;
}

interface Entry {
  record: MoveRecord;
  index: number;
}

/** Splits the moves into turns: consecutive moves by the same player form one turn. */
function groupTurns(records: MoveRecord[]): Entry[][] {
  const turns: Entry[][] = [];
  records.forEach((record, i) => {
    const last = turns[turns.length - 1];
    const entry = { record, index: i + 1 };
    if (last && last[0].record.color === record.color) last.push(entry);
    else turns.push([entry]);
  });
  return turns;
}

export default function MoveList({ records, viewIndex, onSelect }: MoveListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const turns = groupTurns(records);
  const rows: Entry[][][] = [];
  for (let i = 0; i < turns.length; i += 2) {
    rows.push([turns[i], turns[i + 1] ?? []]);
  }

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [records.length]);

  const renderTurn = (entries: Entry[]) => (
    <span>
      {entries.map(({ record, index }) => (
        <button
          key={index}
          className={`${styles.move} ${index === viewIndex ? styles.move_current : ""}`}
          onClick={() => onSelect(index)}
        >
          {record.san}
        </button>
      ))}
    </span>
  );

  return (
    <div className={styles.move_list} ref={listRef}>
      {rows.length === 0 && <div className={styles.move_list_empty}>No moves yet</div>}
      {rows.map(([white, black], i) => (
        <div key={i} className={styles.move_row}>
          <span className={styles.move_number}>{i + 1}.</span>
          {renderTurn(white)}
          {renderTurn(black)}
        </div>
      ))}
    </div>
  );
}
