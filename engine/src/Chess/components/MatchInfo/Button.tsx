import styles from "../../Game.module.css";

interface ButtonProps {
  text: string;
  title: string;
  disabled?: boolean;
  onClick: () => void;
}

export default function Button({ text, title, disabled, onClick }: ButtonProps) {
  return (
    <button className={styles.button} title={title} disabled={disabled} onClick={onClick}>
      {text}
    </button>
  );
}
