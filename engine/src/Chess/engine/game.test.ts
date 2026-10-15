import { describe, expect, it } from "vitest";
import { parseSquare, squareName } from "./board";
import { newGame, playAndRecord, playMove } from "./game";
import { allLegalMoves, isInCheck, legalMovesFrom } from "./moves";
import { Board, Color, GameState, PieceType, PromotionType } from "./types";

/** Plays moves written as "e2e4" (optionally "e7e8n" for a promotion). */
function play(state: GameState, ...moves: string[]): GameState {
  return moves.reduce((current, text) => {
    const promotions: Record<string, PromotionType> = { q: "queen", r: "rook", b: "bishop", n: "knight" };
    return playMove(current, {
      from: parseSquare(text.slice(0, 2)),
      to: parseSquare(text.slice(2, 4)),
      promotion: promotions[text[4]],
    });
  }, state);
}

function targets(state: GameState, from: string): string[] {
  return legalMovesFrom(state, parseSquare(from)).map((m) => squareName(m.to)).sort();
}

const TYPES: Record<string, PieceType> = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };

/** Builds a custom position from entries like { e1: "wK", e8: "bK" }. */
function position(
  pieces: Record<string, string>,
  turn: Color,
  movesLeft: number
): GameState {
  const board: Board = Array(64).fill(null);
  for (const [square, code] of Object.entries(pieces)) {
    board[parseSquare(square)] = {
      color: code[0] === "w" ? "white" : "black",
      type: TYPES[code[1]],
    };
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

describe("double-move turns", () => {
  it("starts with white having two moves", () => {
    const game = newGame();
    expect(game.turn).toBe("white");
    expect(game.movesLeft).toBe(2);
    expect(allLegalMoves(game)).toHaveLength(20);
  });

  it("gives each side two moves per turn", () => {
    let game = play(newGame(), "e2e4");
    expect(game.turn).toBe("white");
    expect(game.movesLeft).toBe(1);

    game = play(game, "d2d4");
    expect(game.turn).toBe("black");
    expect(game.movesLeft).toBe(2);

    game = play(game, "e7e5", "d7d5");
    expect(game.turn).toBe("white");
    expect(game.movesLeft).toBe(2);
  });

  it("lets a pawn move twice in one turn", () => {
    const game = play(newGame(), "e2e4", "e4e5");
    expect(game.board[parseSquare("e5")]).toEqual({ type: "pawn", color: "white" });
  });

  it("ends the turn immediately when the first move gives check", () => {
    let game = play(newGame(), "d2d3", "h2h3", "e7e6", "a7a6", "h3h4", "g2g3");
    game = play(game, "f8b4"); // Bb4+ on black's first move
    expect(game.turn).toBe("white");
    expect(game.movesLeft).toBe(1);
    expect(isInCheck(game.board, "white")).toBe(true);
  });

  it("gives the checked side a single move that must escape check", () => {
    let game = play(newGame(), "d2d3", "h2h3", "e7e6", "a7a6", "h3h4", "g2g3", "f8b4");

    for (const move of allLegalMoves(game)) {
      const after = playMove(game, move);
      expect(isInCheck(after.board, "white")).toBe(false);
    }
    expect(targets(game, "a2")).toEqual([]); // a3 doesn't block the check
    expect(targets(game, "c2")).toEqual(["c3"]);

    game = play(game, "b1c3");
    expect(game.turn).toBe("black");
    expect(game.movesLeft).toBe(2);
  });

  it("gives the checker's opponent a full turn again after a check on the second move", () => {
    let game = play(newGame(), "d2d3", "h2h3", "e7e6");
    game = play(game, "f8b4"); // check on the second move
    expect(game.turn).toBe("white");
    expect(game.movesLeft).toBe(1);

    game = play(game, "c2c3");
    expect(game.turn).toBe("black");
    expect(game.movesLeft).toBe(2);
  });

  it("forbids moves that leave the own king in check", () => {
    const game = play(newGame(), "e2e4", "d1h5", "a7a6");
    expect(targets(game, "f7")).toEqual([]); // f6/f5 would open the h5-e8 diagonal
  });

  it("forbids a move that hands the opponent a check on your own king, even on the first move", () => {
    const game = play(newGame(), "e2e4", "d1h5");
    expect(targets(game, "f7")).toEqual([]);
  });
});

describe("game end", () => {
  it("ends the game on checkmate", () => {
    const game = play(newGame(), "e2e4", "f1c4", "a7a6", "a6a5", "d1h5", "h5f7");
    expect(game.status).toBe("checkmate");
    expect(game.winner).toBe("white");
    expect(() => play(game, "a5a4")).toThrow("The game is over");
  });

  it("declares stalemate when the side to move has no legal move", () => {
    const start = position({ a8: "bK", b6: "wK", d7: "wQ" }, "white", 1);
    const game = play(start, "d7c7");
    expect(game.status).toBe("stalemate");
    expect(game.winner).toBeNull();
  });

  it("declares a draw when only kings are left", () => {
    const start = position({ a8: "bK", h1: "wK", b8: "wN" }, "black", 1);
    const game = play(start, "a8b8");
    expect(game.status).toBe("insufficient");
  });

  it("skips the second move when the mover has no legal follow-up", () => {
    // After h3-h4 the pawn is blocked and the king is boxed in, so the turn passes to black.
    const start = position({ a1: "wK", h3: "wP", g8: "bK", b8: "bR", c2: "bR", h5: "bP" }, "white", 2);
    const game = play(start, "h3h4");
    expect(game.turn).toBe("black");
    expect(game.movesLeft).toBe(2);
  });
});

describe("special moves", () => {
  it("allows castling and moves the rook", () => {
    const game = play(newGame(), "e2e4", "g1f3", "a7a6", "a6a5", "f1e2", "e1g1");
    expect(game.board[parseSquare("g1")]?.type).toBe("king");
    expect(game.board[parseSquare("f1")]?.type).toBe("rook");
    expect(game.board[parseSquare("h1")]).toBeNull();
  });

  it("does not castle queenside through a piece on b1", () => {
    let game = play(newGame(), "d2d4", "c1f4", "a7a6", "h7h6", "d1d2");
    expect(targets(game, "e1")).not.toContain("c1");

    game = play(game, "b1c3", "a6a5", "h6h5");
    expect(targets(game, "e1")).toContain("c1");
  });

  it("does not castle through an attacked square", () => {
    const start = position({ e1: "wK", h1: "wR", f8: "bR", a8: "bK" }, "white", 2);
    start.castling.white.kingSide = true;
    expect(targets(start, "e1")).not.toContain("g1");
  });

  it("allows en passant during the turn right after the double step", () => {
    let game = play(newGame(), "e2e4", "e4e5", "d7d5", "a7a6");
    expect(targets(game, "e5")).toContain("d6");

    game = play(game, "h2h3", "e5d6"); // still allowed on the second move
    expect(game.board[parseSquare("d5")]).toBeNull();
    expect(game.board[parseSquare("d6")]).toEqual({ type: "pawn", color: "white" });
  });

  it("does not allow en passant a turn later", () => {
    const game = play(newGame(), "e2e4", "e4e5", "d7d5", "a7a6", "h2h3", "h3h4", "a6a5", "b7b6");
    expect(targets(game, "e5")).not.toContain("d6");
  });

  it("promotes to the chosen piece", () => {
    const start = position({ a7: "wP", h1: "wK", h8: "bK" }, "white", 1);
    const game = play(start, "a7a8n");
    expect(game.board[parseSquare("a8")]).toEqual({ type: "knight", color: "white" });
  });
});

describe("notation", () => {
  it("records checks, captures and mates", () => {
    const sans: string[] = [];
    let game = newGame();
    for (const text of ["e2e4", "f1c4", "a7a6", "a6a5", "d1h5", "h5f7"]) {
      const result = playAndRecord(game, {
        from: parseSquare(text.slice(0, 2)),
        to: parseSquare(text.slice(2, 4)),
      });
      sans.push(result.record.san);
      game = result.state;
    }
    expect(sans).toEqual(["e4", "Bc4", "a6", "a5", "Qh5", "Qxf7#"]);
  });

  it("disambiguates between two knights", () => {
    const game = play(newGame(), "g1f3", "b1c3", "a7a6", "a6a5", "f3d4");
    expect(playAndRecord(game, { from: parseSquare("c3"), to: parseSquare("a4") }).record.san).toBe("Na4");
    expect(playAndRecord(game, { from: parseSquare("c3"), to: parseSquare("b5") }).record.san).toBe("Ncb5");

    const after = play(game, "e2e3", "a5a4", "h7h6");
    const both = playAndRecord(after, { from: parseSquare("d4"), to: parseSquare("e2") });
    expect(both.record.san).toBe("Nde2");
  });
});
