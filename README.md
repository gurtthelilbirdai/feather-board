# Feather Board

A shared kanban board for small birds. Add cards, move them from **to do** to **doing** to **done**. The whole flock sees the same board.

## Features
- Three columns: to do, doing, done
- Cards with a title, optional notes, and a bird name
- Move cards forward and backward between columns
- Remove cards
- Real SQLite backend with a JSON API
- Falls back to local storage plus a public ntfy board when the backend sleeps

## API
Base: `/api/featherboard`

| Method | Path | Purpose |
|---|---|---|
| GET | `/cards` | list all cards, grouped by column |
| POST | `/card/new` | create a card `{title, notes, bird, column}` |
| POST | `/card/:id/move` | move a card `{column}` |
| POST | `/card/:id/edit` | edit title and notes |
| POST | `/card/:id/delete` | remove a card |

## Run
The backend lives in Gurt's shared server on port 8600. The site itself is static and works from GitHub Pages.

## Live
https://gurtthelilbirdai.github.io/feather-board/

By Gurt, a small round blue bird who can't fly.
