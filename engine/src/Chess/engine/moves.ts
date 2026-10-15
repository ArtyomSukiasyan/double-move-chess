import { colOf, onBoard, opposite, rowOf, toSquare } from "./board";
import {
  Board,
  CastlingRights,
  Color,
  EnPassantEntry,
  Move,
  PieceType,
  Position,
} from "./types";

type Direction = readonly [number, number];

const ORTHOGONAL: Direction[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const DIAGONAL: Direction[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const KING_STEPS: Direction[] = [...ORTHOGONAL, ...DIAGONAL];
const KNIGHT_JUMPS: Direction[] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

const ROOK_CORNERS: { square: number; color: Color; side: "kingSide" | "queenSide" }[] = [
  { square: 0, color: "black", side: "queenSide" },
  { square: 7, color: "black", side: "kingSide" },
  { square: 56, color: "white", side: "queenSide" },
  { square: 63, color: "white", side: "kingSide" },
];

/** Row delta of a pawn move: white moves up the board (towards row 0). */
export const pawnDirection = (color: Color) => (color === "white" ? -1 : 1);
const pawnStartRow = (color: Color) => (color === "white" ? 6 : 1);
export const promotionRow = (color: Color) => (color === "white" ? 0 : 7);
const homeRow = (color: Color) => (color === "white" ? 7 : 0);

function hasPiece(
  board: Board,
  row: number,
  col: number,
  color: Color,
  type: PieceType
): boolean {
  if (!onBoard(row, col)) return false;
  const piece = board[toSquare(row, col)];
  return piece !== null && piece.color === color && piece.type === type;
}

function slidingAttack(
  board: Board,
  row: number,
  col: number,
  directions: Direction[],
  by: Color,
  type: "rook" | "bishop"
): boolean {
  for (const [dr, dc] of directions) {
    let r = row + dr;
    let c = col + dc;
    while (onBoard(r, c)) {
      const piece = board[toSquare(r, c)];
      if (piece) {
        if (piece.color === by && (piece.type === type || piece.type === "queen")) {
          return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return false;
}

export function isSquareAttacked(board: Board, square: number, by: Color): boolean {
  const row = rowOf(square);
  const col = colOf(square);

  const pawnRow = row - pawnDirection(by);
  if (hasPiece(board, pawnRow, col - 1, by, "pawn")) return true;
  if (hasPiece(board, pawnRow, col + 1, by, "pawn")) return true;

  for (const [dr, dc] of KNIGHT_JUMPS) {
    if (hasPiece(board, row + dr, col + dc, by, "knight")) return true;
  }
  for (const [dr, dc] of KING_STEPS) {
    if (hasPiece(board, row + dr, col + dc, by, "king")) return true;
  }

  return (
    slidingAttack(board, row, col, ORTHOGONAL, by, "rook") ||
    slidingAttack(board, row, col, DIAGONAL, by, "bishop")
  );
}

export function findKing(board: Board, color: Color): number {
  return board.findIndex((piece) => piece?.type === "king" && piece.color === color);
}

export function isInCheck(board: Board, color: Color): boolean {
  const king = findKing(board, color);
  return king !== -1 && isSquareAttacked(board, king, opposite(color));
}

/** Square of the pawn that would be captured by moving a pawn of `turn` to `target`, if any. */
export function enPassantVictim(position: Position, target: number): number | null {
  const entry = position.enPassant.find((e) => e.target === target);
  if (!entry) return null;

  const victim = position.board[entry.pawn];
  const isEnemyPawn = victim?.type === "pawn" && victim.color !== position.turn;
  return isEnemyPawn ? entry.pawn : null;
}

function castlingMoves(position: Position, from: number): Move[] {
  const { board, turn } = position;
  const row = homeRow(turn);
  if (from !== toSquare(row, 4) || isInCheck(board, turn)) return [];

  const enemy = opposite(turn);
  const rights = position.castling[turn];
  const isEmpty = (col: number) => board[toSquare(row, col)] === null;
  const isSafe = (col: number) => !isSquareAttacked(board, toSquare(row, col), enemy);
  const hasRook = (col: number) => hasPiece(board, row, col, turn, "rook");
  const moves: Move[] = [];

  // The destination square itself is checked by the general king-safety filter.
  if (rights.kingSide && hasRook(7) && isEmpty(5) && isEmpty(6) && isSafe(5)) {
    moves.push({ from, to: toSquare(row, 6) });
  }
  if (
    rights.queenSide &&
    hasRook(0) &&
    isEmpty(1) &&
    isEmpty(2) &&
    isEmpty(3) &&
    isSafe(3)
  ) {
    moves.push({ from, to: toSquare(row, 2) });
  }

  return moves;
}

/** Moves that follow the piece's movement rules, ignoring whether they leave the own king in check. */
function pseudoLegalMoves(position: Position, from: number): Move[] {
  const { board, turn } = position;
  const piece = board[from];
  if (!piece || piece.color !== turn) return [];

  const row = rowOf(from);
  const col = colOf(from);
  const moves: Move[] = [];
  const canLandOn = (r: number, c: number) =>
    onBoard(r, c) && board[toSquare(r, c)]?.color !== turn;

  const step = (directions: Direction[]) => {
    for (const [dr, dc] of directions) {
      if (canLandOn(row + dr, col + dc)) {
        moves.push({ from, to: toSquare(row + dr, col + dc) });
      }
    }
  };

  const slide = (directions: Direction[]) => {
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (onBoard(r, c)) {
        const target = board[toSquare(r, c)];
        if (target?.color === turn) break;
        moves.push({ from, to: toSquare(r, c) });
        if (target) break;
        r += dr;
        c += dc;
      }
    }
  };

  switch (piece.type) {
    case "pawn": {
      const forward = row + pawnDirection(turn);
      if (onBoard(forward, col) && board[toSquare(forward, col)] === null) {
        moves.push({ from, to: toSquare(forward, col) });

        const doubleForward = forward + pawnDirection(turn);
        if (row === pawnStartRow(turn) && board[toSquare(doubleForward, col)] === null) {
          moves.push({ from, to: toSquare(doubleForward, col) });
        }
      }
      for (const c of [col - 1, col + 1]) {
        if (!onBoard(forward, c)) continue;
        const to = toSquare(forward, c);
        const target = board[to];
        if (target ? target.color !== turn : enPassantVictim(position, to) !== null) {
          moves.push({ from, to });
        }
      }
      break;
    }
    case "knight":
      step(KNIGHT_JUMPS);
      break;
    case "bishop":
      slide(DIAGONAL);
      break;
    case "rook":
      slide(ORTHOGONAL);
      break;
    case "queen":
      slide(KING_STEPS);
      break;
    case "king":
      step(KING_STEPS);
      moves.push(...castlingMoves(position, from));
      break;
  }

  return moves;
}

export interface MoveEffects {
  board: Board;
  castling: CastlingRights;
  /** Set when the move was a pawn double step. */
  doubleStep: EnPassantEntry | null;
}

function updateCastling(castling: CastlingRights, move: Move, board: Board): CastlingRights {
  const next: CastlingRights = {
    white: { ...castling.white },
    black: { ...castling.black },
  };

  const piece = board[move.from];
  if (piece?.type === "king") {
    next[piece.color] = { kingSide: false, queenSide: false };
  }

  // A rook leaving its corner, or anything being captured there, ends that castling right.
  for (const corner of ROOK_CORNERS) {
    if (move.from === corner.square || move.to === corner.square) {
      next[corner.color][corner.side] = false;
    }
  }

  return next;
}

/** Applies a move to the board without any legality checks. */
export function applyMove(position: Position, move: Move): MoveEffects {
  const board = position.board.slice();
  const piece = board[move.from];
  if (!piece) throw new Error("No piece on the starting square");

  let doubleStep: EnPassantEntry | null = null;

  if (piece.type === "pawn") {
    const isDiagonal = colOf(move.from) !== colOf(move.to);
    if (isDiagonal && board[move.to] === null) {
      const victim = enPassantVictim(position, move.to);
      if (victim !== null) board[victim] = null;
    }
    if (Math.abs(rowOf(move.to) - rowOf(move.from)) === 2) {
      doubleStep = { target: (move.from + move.to) / 2, pawn: move.to };
    }
  }

  if (piece.type === "king" && Math.abs(colOf(move.to) - colOf(move.from)) === 2) {
    const row = rowOf(move.from);
    const kingSide = colOf(move.to) === 6;
    const rookFrom = toSquare(row, kingSide ? 7 : 0);
    const rookTo = toSquare(row, kingSide ? 5 : 3);
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }

  const promotes = piece.type === "pawn" && rowOf(move.to) === promotionRow(piece.color);
  board[move.to] = promotes
    ? { type: move.promotion ?? "queen", color: piece.color }
    : piece;
  board[move.from] = null;

  return {
    board,
    castling: updateCastling(position.castling, move, position.board),
    doubleStep,
  };
}

export function legalMovesFrom(position: Position, from: number): Move[] {
  return pseudoLegalMoves(position, from).filter(
    (move) => !isInCheck(applyMove(position, move).board, position.turn)
  );
}

/** Legal captures (en passant included) and promotions only; used by the bot's quiescence search. */
export function legalCaptures(position: Position): Move[] {
  const moves: Move[] = [];
  for (let square = 0; square < 64; square++) {
    for (const move of pseudoLegalMoves(position, square)) {
      const isEnPassant =
        position.board[square]!.type === "pawn" && colOf(move.from) !== colOf(move.to);
      const isTactical =
        position.board[move.to] !== null || isEnPassant || isPromotion(position, move);
      if (isTactical && !isInCheck(applyMove(position, move).board, position.turn)) {
        moves.push(move);
      }
    }
  }
  return moves;
}

export function allLegalMoves(position: Position): Move[] {
  const moves: Move[] = [];
  for (let square = 0; square < 64; square++) {
    moves.push(...legalMovesFrom(position, square));
  }
  return moves;
}

export function hasLegalMove(position: Position): boolean {
  for (let square = 0; square < 64; square++) {
    if (legalMovesFrom(position, square).length > 0) return true;
  }
  return false;
}

export function isPromotion(position: Position, move: Move): boolean {
  const piece = position.board[move.from];
  return piece?.type === "pawn" && rowOf(move.to) === promotionRow(piece.color);
}

/** Neither side can ever give mate: bare kings, or a single minor piece left. */
export function isInsufficientMaterial(board: Board): boolean {
  const others = board.filter((piece) => piece !== null && piece.type !== "king");
  if (others.length === 0) return true;
  return (
    others.length === 1 && (others[0]!.type === "bishop" || others[0]!.type === "knight")
  );
}
