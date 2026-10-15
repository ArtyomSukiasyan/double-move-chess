export type Color = "white" | "black";

export type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

export type PromotionType = "queen" | "rook" | "bishop" | "knight";

export interface Piece {
  type: PieceType;
  color: Color;
}

/** 64 squares, index 0 = a8, 7 = h8, 56 = a1, 63 = h1. */
export type Board = (Piece | null)[];

export interface Move {
  from: number;
  to: number;
  promotion?: PromotionType;
}

export interface CastlingSide {
  kingSide: boolean;
  queenSide: boolean;
}

export type CastlingRights = Record<Color, CastlingSide>;

/** A pawn that just made a double step and can be captured en passant. */
export interface EnPassantEntry {
  /** The square the pawn passed over (where the capturing pawn lands). */
  target: number;
  /** The square the pawn stands on (the piece that gets removed). */
  pawn: number;
}

/** Everything needed to generate legal moves. */
export interface Position {
  board: Board;
  turn: Color;
  castling: CastlingRights;
  /** Double steps made by the opponent in their last turn, capturable by `turn`. */
  enPassant: EnPassantEntry[];
}

export type GameStatus = "playing" | "checkmate" | "stalemate" | "insufficient";

export interface GameState extends Position {
  /** Moves `turn` still has in the current turn: 2 normally, 1 for the second move or a check reply. */
  movesLeft: number;
  /** Double steps made by `turn` during the current turn; handed to the opponent when the turn passes. */
  pendingEnPassant: EnPassantEntry[];
  status: GameStatus;
  winner: Color | null;
}

export interface MoveRecord {
  color: Color;
  from: number;
  to: number;
  san: string;
}
