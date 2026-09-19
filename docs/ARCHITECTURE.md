# MARS architecture — v0.7

MARS is a global authoring tool. Presentation content remains outside the installation directory.

```text
~/Tools/MARS/                 tool, CLI, themes, templates
~/.local/bin/mars             stable launcher
~/.config/mars/               user config + registry
~/Presentations/              optional parked root
  deep-learning/              Stack
  ai-symposium/               Stack
```

## Content model

```text
STACK
 ├── BRICK
 │    ├── DECK
 │    │    ├── SLIDE
 │    │    └── SLIDE
 │    └── DECK
 └── BRICK
```

Only the Deck is directly a Marp document. A Deck stays ordinary Marp Markdown and remains usable without MARS.

## Manifests

- Stack: `mars.yml`
- Brick: `brick.yml`
- Deck: `deck.yml`
- Slide: represented directly inside `slides.md`

## Configuration cascade

MARS uses a simple conceptual inheritance model:

```text
Stack defaults
   ↓
Brick conventions
   ↓
Deck metadata
   ↓
Marp slide directives
```

## Presets

Presets create conventional Bricks but do not change the Core model.

Current built-in presets:

- `blank`
- `course`
- `conference`
- `workshop`
- `training`

## Registry

`mars park` records roots in `~/.config/mars/registry.json`. Each direct child containing `mars.yml` is discoverable as a Stack. Individual Stacks may also be registered with `mars link`.

Registry is not a content level. It is only local discovery infrastructure.
