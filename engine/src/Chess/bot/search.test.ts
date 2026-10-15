import { describe, expect, it } from "vitest";
import { parseSquare, squareName } from "../engine/board";
import { newGame, playMove } from "../engine/game";
import { allLegalMoves } from "../engine/moves";
import { Board, Color, GameState, PieceType } from "../engine/types";
import { evaluate } from "./evaluate";
import { PIECE_VALUES } from "./pieceSquareTables";
import { findBestMove } from "./search";

const TYPES: Record<string, PieceType> = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };

/** Builds a custom position from entries like { e1: "wK", e8: "bK" }. */
function position(pieces: Record<string, string>, turn: Color, movesLeft: number): GameState {
  const board: Board = Array(64).fill(null);
  for (const [square, code] of Object.entries(pieces)) {
    board[parseSquare(square)] = { color: code[0] === "w" ? "white" : "black", type: TYPES[code[1]] };
  }
  return {
    ...newGame(),
    board,
    turn,
    movesLeft,
    castling: {
      white: { kingSide: false, queenSide: false },
      black: { kingSide: false, queenSide: false },
    },
  };
}

const options = { maxDepth: 4, timeLimitMs: 10_000 };
const moveName = (move: { from: number; to: number } | null) =>
  move ? squareName(move.from) + squareName(move.to) : "none";

/** Lets the bot play for the side to move until the turn passes or the game ends. */
function botTurn(state: GameState): GameState {
  const mover = state.turn;
  while (state.status === "playing" && state.turn === mover) {
    state = playMove(state, findBestMove(state, options).move!);
  }
  return state;
}

describe("evaluation", () => {
  it("is balanced in the starting position apart from the tempo", () => {
    expect(evaluate(newGame())).toBe(30);
  });

  it("counts material", () => {
    const extraQueen = position({ e1: "wK", e8: "bK", d1: "wQ" }, "black", 2);
    expect(evaluate(extraQueen)).toBeGreaterThan(900);
  });
});

describe("bot", () => {
  it("plays a legal move from the starting position", () => {
    const game = newGame();
    const { move } = findBestMove(game, { maxDepth: 3, timeLimitMs: 5000 });
    expect(allLegalMoves(game).map(moveName)).toContain(moveName(move));
  });

  it("returns no move when the game is over", () => {
    const over = { ...newGame(), status: "checkmate" as const, winner: "white" as const };
    expect(findBestMove(over).move).toBeNull();
  });

  it("finds a mate in one", () => {
    const state = position({ e1: "wK", a1: "wR", h8: "bK", g7: "bP", h7: "bP" }, "white", 2);
    const result = findBestMove(state, options);
    expect(moveName(result.move)).toBe("a1a8");
    expect(result.score).toBeGreaterThan(90_000);
  });

  it("uses both moves of a turn to mate", () => {
    // The knight blocks the rook; moving it away (without check) opens Ra8#.
    const state = position({ e1: "wK", a1: "wR", a4: "wN", h8: "bK", g7: "bP", h7: "bP" }, "white", 2);
    expect(findBestMove(state, options).score).toBeGreaterThan(90_000);

    const after = botTurn(state);
    expect(after.status).toBe("checkmate");
    expect(after.winner).toBe("white");
  });

  it("plays as black and takes a hanging queen", () => {
    const state = position({ e1: "wK", d4: "wQ", e8: "bK", d8: "bR", a7: "bP" }, "black", 2);
    const after = botTurn(state);
    expect(after.board[parseSquare("d4")]).toEqual({ type: "rook", color: "black" });
  });

  it("sees that two moves in a row win a defended piece", () => {
    // In normal chess the knight is safe (Qxd5 exd5); here the queen can capture and then retreat.
    const state = position(
      { e1: "wK", d5: "wN", e4: "wP", a2: "wP", e8: "bK", d8: "bQ", h7: "bP" },
      "black",
      2
    );
    const result = findBestMove(state, options);
    expect(result.score).toBeLessThan(evaluate(state) - PIECE_VALUES.knight);
  });
});
