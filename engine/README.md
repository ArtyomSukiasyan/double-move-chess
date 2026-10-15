# Double-Move Chess Engine

Play double-move chess (every player makes **two moves per turn**) against a bot.
The game is based on [double-move chess](../double-move), the bot on the ideas of
[Chess-engine](https://github.com/ArtyomSukiasyan/Chess-engine): minimax with alpha-beta
pruning, the same piece values and piece-square tables.

## Rules

- White starts. Each turn a player makes two moves (the same piece may move twice).
- A move that gives **check ends the turn immediately**, even if it was the first move.
- The checked player gets **one move only**, and it must get out of check.
  After that the opponent plays a normal two-move turn again.
- **Checkmate** (in check with no legal move) ends the game.
- No legal move without being in check is **stalemate** (draw). Bare kings, or a single
  bishop or knight left, is a draw by insufficient material.
- If a player has no legal second move, that move is skipped.
- A pawn that made a double step can be taken en passant during the opponent's next turn
  (on either of their moves).
- Castling, promotion (with a piece picker) and all other standard rules work as usual.

## The bot

- Lives in `src/Chess/bot` and runs in a Web Worker, so the board never freezes.
- Searches single moves with alpha-beta; who moves next comes from the rules engine, so the
  two moves of a turn are two plies in a row for the same side, and a check ends the turn early.
  This lets it find double-move tactics like "capture, then retreat before the opponent replies".
- Iterative deepening with a transposition table (the two moves of a turn often transpose),
  capture-only quiescence search, MVV-LVA move ordering and random choice between equal moves.
- Evaluation: material + piece-square tables from Chess-engine, an endgame king table and a
  small bonus for the moves the side to move still has.
- Levels: Easy (2 moves deep), Medium (4 moves deep = one full turn each, 1.5 s per move),
  Hard (up to 8 moves deep, 4 s per move). You can play as White or Black.

## Stack

- React + TypeScript, built with Vite
- CSS modules, no chess libraries
- Rules engine as pure functions in `src/Chess/engine`, tested with Vitest

## Run

```sh
npm install
npm run dev     # start the dev server
npm test        # run the rules and bot tests
npm run build   # typecheck and build for production
```

Use the `<` / `>` buttons or the arrow keys to step through the game, or click a move in the list.
