# Double-Move Chess

A two-player chess variant where every player makes **two moves per turn**.
Based on [react-ts-chess](https://github.com/ArtyomSukiasyan/react-ts-chess).

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

## Stack

- React + TypeScript, built with Vite
- CSS modules, no chess libraries
- Rules engine as pure functions in `src/Chess/engine`, tested with Vitest

## Run

```sh
npm install
npm run dev     # start the dev server
npm test        # run the rules tests
npm run build   # typecheck and build for production
```

Use the `<` / `>` buttons or the arrow keys to step through the game, or click a move in the list.
