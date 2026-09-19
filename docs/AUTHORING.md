# Authoring workflow — MARS v0.7

MARS uses a generic hierarchy:

```text
Stack → Brick → Deck → Slide
```

The normal daily workflow is intentionally small:

```bash
cd <stack>
mars dev
mars check
mars build
```

## Creating content

```bash
mars make:stack
mars make:brick
mars make:deck
mars make:figure
```

When a command lacks required information, MARS asks interactively. When all information is supplied as arguments/options, it behaves like a normal CLI command.

## Context detection

MARS walks upward from the current directory to detect:

1. `mars.yml` → Stack
2. `brick.yml` → Brick
3. `deck.yml` / `slides.md` → Deck

This means commands work from the Stack root, a Brick, a Deck, or a nested assets directory.

## Last Deck

The last authored Deck is stored in `.mars/state.json`. Running `mars dev` or `mars build` from the Stack root can resume it automatically.

## Compact interactive menu

The default `mars` command prints help. If an assisted interface is preferred:

```bash
mars menu
```

The menu intentionally exposes only a few top-level groups: Author, Preview & Build, Stack and Tools.
