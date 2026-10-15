import { colOf, FILES, initialBoard, opposite, rowOf, squareName } from "./board";
import {
  allLegalMoves,
  applyMove,
  hasLegalMove,
  isInCheck,
  isInsufficientMaterial,
  isPromotion,
  legalMovesFrom,
} from "./moves";
import { GameState, Move, MoveRecord, PieceType } from "./types";

export const MOVES_PER_TURN = 2;

export function newGame(): GameState {
  return {
    board: initialBoard(),
    turn: "white",
    castling: {
      white: { kingSide: true, queenSide: true },
      black: { kingSide: true, queenSide: true },
    },
    enPassant: [],
    pendingEnPassant: [],
    movesLeft: MOVES_PER_TURN,
    status: "playing",
    winner: null,
  };
}

/** Works out whether the player who is now to move can move at all. */
function withStatus(state: GameState): GameState {
  if (isInsufficientMaterial(state.board)) {
    return { ...state, status: "insufficient" };
  }
  if (hasLegalMove(state)) return state;

  return isInCheck(state.board, state.turn)
    ? { ...state, status: "checkmate", winner: opposite(state.turn) }
    : { ...state, status: "stalemate" };
}

/** Hands the move to the opponent: one move if they are in check, otherwise a full turn. */
function passTurn(state: GameState): GameState {
  const mover = state.turn;
  const next = opposite(mover);

  // Only double steps whose pawn is still standing there can be taken en passant.
  const enPassant = state.pendingEnPassant.filter((entry) => {
    const pawn = state.board[entry.pawn];
    return pawn?.type === "pawn" && pawn.color === mover;
  });

  return withStatus({
    ...state,
    turn: next,
    movesLeft: isInCheck(state.board, next) ? 1 : MOVES_PER_TURN,
    enPassant,
    pendingEnPassant: [],
  });
}

/**
 * Plays one move and decides who moves next:
 * - a move that gives check ends the turn at once, and the checked side gets a single move;
 * - otherwise the mover continues until their moves for this turn are used up.
 */
export function playMove(state: GameState, move: Move): GameState {
  if (state.status !== "playing") throw new Error("The game is over");

  const isLegal = legalMovesFrom(state, move.from).some((m) => m.to === move.to);
  if (!isLegal) throw new Error("Illegal move");

  return advance(state, move);
}

/** Same as `playMove` but trusts the move to be legal (used by the bot's search). */
export function advance(state: GameState, move: Move): GameState {
  const effects = applyMove(state, move);
  const afterMove: GameState = {
    ...state,
    board: effects.board,
    castling: effects.castling,
    pendingEnPassant: effects.doubleStep
      ? [...state.pendingEnPassant, effects.doubleStep]
      : state.pendingEnPassant,
  };

  const givesCheck = isInCheck(afterMove.board, opposite(state.turn));
  if (!givesCheck && state.movesLeft > 1) {
    const continued = { ...afterMove, movesLeft: state.movesLeft - 1 };
    // A player left without a legal follow-up move simply skips it.
    if (hasLegalMove(continued)) return continued;
  }

  return passTurn(afterMove);
}

const PIECE_LETTERS: Record<PieceType, string> = {
  king: "K",
  queen: "Q",
  rook: "R",
  bishop: "B",
  knight: "N",
  pawn: "",
};

/** Standard algebraic notation for a move played from `before`, resulting in `after`. */
export function toSan(before: GameState, move: Move, after: GameState): string {
  const piece = before.board[move.from]!;
  const isCastling = piece.type === "king" && Math.abs(colOf(move.to) - colOf(move.from)) === 2;
  let san: string;

  if (isCastling) {
    san = colOf(move.to) === 6 ? "O-O" : "O-O-O";
  } else if (piece.type === "pawn") {
    const isCapture = colOf(move.from) !== colOf(move.to);
    san = (isCapture ? FILES[colOf(move.from)] + "x" : "") + squareName(move.to);
    if (isPromotion(before, move)) {
      san += "=" + PIECE_LETTERS[move.promotion ?? "queen"];
    }
  } else {
    const rivals = allLegalMoves(before).filter(
      (m) =>
        m.to === move.to &&
        m.from !== move.from &&
        before.board[m.from]?.type === piece.type
    );
    let disambiguation = "";
    if (rivals.length > 0) {
      const name = squareName(move.from);
      if (!rivals.some((m) => colOf(m.from) === colOf(move.from))) {
        disambiguation = name[0];
      } else if (!rivals.some((m) => rowOf(m.from) === rowOf(move.from))) {
        disambiguation = name[1];
      } else {
        disambiguation = name;
      }
    }
    const isCapture = before.board[move.to] !== null;
    san = PIECE_LETTERS[piece.type] + disambiguation + (isCapture ? "x" : "") + squareName(move.to);
  }

  if (after.status === "checkmate") return san + "#";
  if (isInCheck(after.board, opposite(piece.color))) return san + "+";
  return san;
}

export function playAndRecord(
  state: GameState,
  move: Move
): { state: GameState; record: MoveRecord } {
  const next = playMove(state, move);
  return {
    state: next,
    record: {
      color: state.turn,
      from: move.from,
      to: move.to,
      san: toSan(state, move, next),
    },
  };
}
