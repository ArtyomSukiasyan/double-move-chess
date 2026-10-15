import { advance } from "../engine/game";
import { allLegalMoves, isInCheck, isPromotion, legalCaptures } from "../engine/moves";
import { GameState, Move, PieceType } from "../engine/types";
import { evaluate } from "./evaluate";
import { PIECE_VALUES } from "./pieceSquareTables";

/**
 * Alpha-beta search over single moves. Because `advance` decides who moves next, the search
 * follows double-move turns naturally: a node is a max node whenever white is to move, so the
 * two moves of one turn are two max (or min) plies in a row, and a check cuts the turn short.
 */

export interface SearchOptions {
  /** Deepest iteration, counted in single moves (4 = one full turn for each side). */
  maxDepth: number;
  /** Iterative deepening stops starting new work after this many milliseconds. */
  timeLimitMs: number;
}

export interface SearchResult {
  move: Move | null;
  /** Centipawns from white's point of view. */
  score: number;
  /** Deepest fully searched iteration. */
  depth: number;
  nodes: number;
}

const MATE = 100_000;
const INFINITY = 1_000_000;
/** Scores beyond this are mates; they are stored in the table relative to the node. */
const MATE_BOUND = MATE - 1000;
const MAX_QUIESCENCE_PLY = 8;

type Bound = "exact" | "lower" | "upper";

interface TableEntry {
  depth: number;
  score: number;
  bound: Bound;
  move: Move | null;
}

class TimeUp extends Error {}

const LETTERS: Record<PieceType, string> = {
  pawn: "p",
  knight: "n",
  bishop: "b",
  rook: "r",
  queen: "q",
  king: "k",
};

function positionKey(state: GameState): string {
  let key = "";
  for (const piece of state.board) {
    if (!piece) key += ".";
    else key += piece.color === "white" ? LETTERS[piece.type].toUpperCase() : LETTERS[piece.type];
  }
  const { white, black } = state.castling;
  key += state.turn[0] + state.movesLeft;
  key += [white.kingSide, white.queenSide, black.kingSide, black.queenSide].map(Number).join("");
  key += state.enPassant.map((e) => e.target).join(",") + "|" + state.pendingEnPassant.map((e) => e.target).join(",");
  return key;
}

const sameMove = (a: Move | null, b: Move) =>
  a !== null && a.from === b.from && a.to === b.to && (a.promotion ?? "queen") === (b.promotion ?? "queen");

/** Legal moves, with promotions expanded to a queen and a knight (rook/bishop are never better). */
function generateMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (const move of allLegalMoves(state)) {
    if (isPromotion(state, move)) {
      moves.push({ ...move, promotion: "queen" }, { ...move, promotion: "knight" });
    } else {
      moves.push(move);
    }
  }
  return moves;
}

function isCapture(state: GameState, move: Move): boolean {
  if (state.board[move.to]) return true;
  // En passant: a pawn moving diagonally onto an empty square.
  return state.board[move.from]?.type === "pawn" && move.from % 8 !== move.to % 8;
}

/** Higher first: the table move, then captures by most valuable victim / least valuable attacker. */
function moveOrderScore(state: GameState, move: Move, tableMove: Move | null): number {
  if (sameMove(tableMove, move)) return 1_000_000;
  let score = 0;
  const victim = state.board[move.to];
  if (victim) {
    score += 10_000 + 10 * PIECE_VALUES[victim.type] - PIECE_VALUES[state.board[move.from]!.type] / 10;
  } else if (isCapture(state, move)) {
    score += 10_000 + 10 * PIECE_VALUES.pawn;
  }
  if (move.promotion) score += move.promotion === "queen" ? 9_000 : -1000;
  return score;
}

function orderMoves(state: GameState, moves: Move[], tableMove: Move | null): Move[] {
  const scored = moves.map((move) => ({ move, score: moveOrderScore(state, move, tableMove) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.move);
}

function terminalScore(state: GameState, ply: number): number | null {
  switch (state.status) {
    case "checkmate":
      return state.winner === "white" ? MATE - ply : -(MATE - ply);
    case "stalemate":
    case "insufficient":
      return 0;
    default:
      return null;
  }
}

const toTable = (score: number, ply: number) =>
  score > MATE_BOUND ? score + ply : score < -MATE_BOUND ? score - ply : score;
const fromTable = (score: number, ply: number) =>
  score > MATE_BOUND ? score - ply : score < -MATE_BOUND ? score + ply : score;

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function findBestMove(
  state: GameState,
  options: SearchOptions = { maxDepth: 4, timeLimitMs: 2000 }
): SearchResult {
  if (state.status !== "playing") return { move: null, score: 0, depth: 0, nodes: 0 };

  const table = new Map<string, TableEntry>();
  const deadline = Date.now() + options.timeLimitMs;
  let nodes = 0;

  const checkTime = () => {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) throw new TimeUp();
  };

  /** Only captures and promotions, so the evaluation is not taken in the middle of an exchange. */
  function quiesce(node: GameState, alpha: number, beta: number, ply: number, qPly: number): number {
    checkTime();
    const terminal = terminalScore(node, ply);
    if (terminal !== null) return terminal;

    const maximizing = node.turn === "white";
    const inCheck = isInCheck(node.board, node.turn);
    let best = inCheck ? (maximizing ? -INFINITY : INFINITY) : evaluate(node);

    if (!inCheck) {
      if (maximizing ? best >= beta : best <= alpha) return best;
      if (maximizing) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (qPly >= MAX_QUIESCENCE_PLY) return best;
    }

    const moves = inCheck
      ? generateMoves(node)
      : legalCaptures(node).map((m) => (isPromotion(node, m) ? { ...m, promotion: "queen" as const } : m));

    for (const move of orderMoves(node, moves, null)) {
      const score = quiesce(advance(node, move), alpha, beta, ply + 1, qPly + 1);
      if (maximizing) {
        if (score > best) best = score;
        if (best > alpha) alpha = best;
      } else {
        if (score < best) best = score;
        if (best < beta) beta = best;
      }
      if (alpha >= beta) break;
    }
    return best;
  }

  function search(node: GameState, depth: number, alpha: number, beta: number, ply: number): number {
    checkTime();
    const terminal = terminalScore(node, ply);
    if (terminal !== null) return terminal;
    if (depth <= 0) return quiesce(node, alpha, beta, ply, 0);

    const key = positionKey(node);
    const entry = table.get(key);
    if (entry && entry.depth >= depth) {
      const score = fromTable(entry.score, ply);
      if (entry.bound === "exact") return score;
      if (entry.bound === "lower" && score >= beta) return score;
      if (entry.bound === "upper" && score <= alpha) return score;
    }

    const maximizing = node.turn === "white";
    const alphaStart = alpha;
    const betaStart = beta;
    let best = maximizing ? -INFINITY : INFINITY;
    let bestMove: Move | null = null;

    for (const move of orderMoves(node, generateMoves(node), entry?.move ?? null)) {
      const score = search(advance(node, move), depth - 1, alpha, beta, ply + 1);
      if (maximizing ? score > best : score < best) {
        best = score;
        bestMove = move;
      }
      if (maximizing) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }

    const bound: Bound =
      best <= alphaStart ? "upper" : best >= betaStart ? "lower" : "exact";
    table.set(key, { depth, score: toTable(best, ply), bound, move: bestMove });
    return best;
  }

  // Shuffled once so equally good moves are picked at random, like the original bot.
  const rootMoves = shuffle(generateMoves(state));
  const maximizing = state.turn === "white";
  let result: SearchResult = { move: rootMoves[0] ?? null, score: 0, depth: 0, nodes: 0 };

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    try {
      let alpha = -INFINITY;
      let beta = INFINITY;
      let bestScore = maximizing ? -INFINITY : INFINITY;
      let bestMove: Move | null = null;

      for (const move of orderMoves(state, rootMoves, result.move)) {
        const score = search(advance(state, move), depth - 1, alpha, beta, 1);
        if (maximizing ? score > bestScore : score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
        if (maximizing) alpha = Math.max(alpha, bestScore);
        else beta = Math.min(beta, bestScore);
      }

      result = { move: bestMove, score: bestScore, depth, nodes };
      // A forced mate will not get any better with a deeper search.
      if (Math.abs(bestScore) > MATE_BOUND) break;
    } catch (error) {
      if (error instanceof TimeUp) break;
      throw error;
    }
    if (Date.now() > deadline) break;
  }

  return { ...result, nodes };
}
