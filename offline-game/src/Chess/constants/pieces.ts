import { Color, Piece, PieceType, PromotionType } from "../engine/types";

const GLYPHS: Record<Color, Record<PieceType, string>> = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
};

/** U+FE0E forces the text glyph; without it some systems draw ♟ as an emoji. */
export const pieceGlyph = (piece: Piece) => GLYPHS[piece.color][piece.type] + "︎";

export const PROMOTION_CHOICES: PromotionType[] = ["queen", "rook", "bishop", "knight"];

export const colorName = (color: Color) => (color === "white" ? "White" : "Black");
