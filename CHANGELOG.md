# Changelog

## 0.7.0 — Stack Model & Console UX

### Rebrand

- **MARS** now means **Marp Authoring & Rendering Studio**.
- The Core is no longer course-specific.

### Generic content model

- Introduces the public hierarchy **Stack → Brick → Deck → Slide**.
- `mars.yml` is the Stack manifest.
- `brick.yml` describes Brick conventions and output patterns.
- `deck.yml` describes Deck metadata while `slides.md` remains standard Marp Markdown.
- Built-in presets: `blank`, `course`, `conference`, `workshop`, `training`.
- Course is now a preset, not a Core type.

### Console UX

- `mars` now prints a compact Artisan-style command index instead of the large interactive menu.
- Adds semantic ANSI colors with `NO_COLOR` and `--no-ansi` support.
- Adds per-command help: `mars help <command>` and `mars <command> --help`.
- Adds `mars menu` as an optional compact assisted UI.
- Adds shell completion output for zsh, bash and fish.

### Authoring commands

- `mars make:stack`
- `mars make:brick`
- `mars make:deck`
- `mars make:figure`
- Course aliases: `make:chapter`, `make:td`, `make:tp`.

### Registry

- Adds `mars park` and `mars unpark`.
- Multiple parked roots are stored in `~/.config/mars/registry.json`.
- Adds `mars paths`, `mars list`, `mars open`, `mars link`, `mars unlink`.
- Local `.localhost` serving is deliberately deferred to the server-focused release.

### Migration

- `mars migrate` converts a 0.6 course non-destructively into the Stack/Brick/Deck manifest model.
- Existing `slides.md` files are not moved or rewritten.
- Legacy `course.yml` is retained for rollback.

### Scientific figures

- Figure pipeline now uses `MARS_STACK_ROOT` and `MARS_DECK_ROOT`.
- Legacy figure environment variables remain available during 0.7.

### Tests

- 17 automated tests cover hierarchy, presets, migration, park/registry, output naming, validation, figures, state, safety and console UX.
