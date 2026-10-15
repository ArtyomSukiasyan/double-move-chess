import { colOf, rowOf } from "../engine/board";
import { GameState } from "../engine/types";
import { kingEndgame, PIECE_VALUES, TABLES } from "./pieceSquareTables";

/** Bonus per move the side to move still has: two moves in a row is a big initiative in this variant. */
const TEMPO_PER_MOVE = 15;

/** Non-pawn material (both sides) below which kings use the endgame table. */
const ENDGAME_MATERIAL = 2 * PIECE_VALUES.rook + 2 * PIECE_VALUES.knight;

/** Static evaluation in centipawns from white's point of view (positive = white is better). */
export function evaluate(state: GameState): number {
  const { board } = state;
  let score = 0;
  let nonPawnMaterial = 0;

  for (const piece of board) {
    if (piece && piece.type !== "pawn" && piece.type !== "king") {
      nonPawnMaterial += PIECE_VALUES[piece.type];
    }
  }
  const isEndgame = nonPawnMaterial <= ENDGAME_MATERIAL;

  for (let square = 0; square < 64; square++) {
    const piece = board[square];
    if (!piece) continue;

    // Black reads the white tables upside down.
    const row = piece.color === "white" ? rowOf(square) : 7 - rowOf(square);
    const table = piece.type === "king" && isEndgame ? kingEndgame : TABLES[piece.type];
    const value = PIECE_VALUES[piece.type] + 10 * table[row][colOf(square)];

    score += piece.color === "white" ? value : -value;
  }

  const tempo = TEMPO_PER_MOVE * state.movesLeft;
  return score + (state.turn === "white" ? tempo : -tempo);
}
