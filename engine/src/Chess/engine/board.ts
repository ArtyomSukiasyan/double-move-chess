import { Board, Color, PieceType } from "./types";

export const FILES = "abcdefgh";

export const rowOf = (square: number) => Math.floor(square / 8);
export const colOf = (square: number) => square % 8;
export const toSquare = (row: number, col: number) => row * 8 + col;
export const onBoard = (row: number, col: number) =>
  row >= 0 && row < 8 && col >= 0 && col < 8;

export const opposite = (color: Color): Color =>
  color === "white" ? "black" : "white";

export const squareName = (square: number) =>
  FILES[colOf(square)] + (8 - rowOf(square));

/** "e4" -> square index. */
export function parseSquare(name: string): number {
  const col = FILES.indexOf(name[0]);
  const rank = Number(name[1]);
  if (col === -1 || !(rank >= 1 && rank <= 8)) {
    throw new Error(`Invalid square: ${name}`);
  }
  return toSquare(8 - rank, col);
}

const BACK_RANK: PieceType[] = [
  "rook",
  "knight",
  "bishop",
  "queen",
  "king",
  "bishop",
  "knight",
  "rook",
];

export function initialBoard(): Board {
  const board: Board = Array(64).fill(null);

  for (let col = 0; col < 8; col++) {
    board[toSquare(0, col)] = { type: BACK_RANK[col], color: "black" };
    board[toSquare(1, col)] = { type: "pawn", color: "black" };
    board[toSquare(6, col)] = { type: "pawn", color: "white" };
    board[toSquare(7, col)] = { type: BACK_RANK[col], color: "white" };
  }

  return board;
}
