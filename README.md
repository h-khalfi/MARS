# MARS v0.7.0

**MARS — Marp Authoring & Rendering Studio** is a local-first authoring environment for Marp presentations.

MARS 0.7 introduces a generic content model that is independent from courses:

```text
Stack → Brick → Deck → Slide
```

- **Stack**: a complete presentation product — course, conference, workshop, training, defense, etc.
- **Brick**: a coherent group of Decks.
- **Deck**: one autonomous Marp presentation (`slides.md`).
- **Slide**: one Marp slide inside a Deck.

A course is now only one preset of the generic model.

## Installation

```bash
cd ~/Tools
unzip MARS-v0.7.0.zip
mv MARS-v0.7.0 MARS
cd MARS
./install.sh
```

Then:

```bash
mars --version
mars doctor
```

## Console UX

`mars` no longer opens the large interactive menu. It prints a compact Artisan-style command index.

```bash
mars
mars help build
mars build --help
```

Use the compact interactive assistant only when wanted:

```bash
mars menu
```

## Creating content

```bash
mars make:stack
mars make:brick
mars make:deck
mars make:figure
```

Example:

```bash
mkdir -p ~/Presentations
cd ~/Presentations
mars make:stack "Deep Learning" --preset course
```

The `course` preset creates three Bricks:

```text
deep-learning/
├── mars.yml
├── lectures/
│   └── brick.yml
├── td/
│   └── brick.yml
├── tp/
│   └── brick.yml
├── assets/
├── figures/
└── dist/
```

Decks are created below a Brick:

```text
lectures/
└── 01-introduction/
    ├── deck.yml
    ├── slides.md
    └── assets/
```

## Daily workflow

```bash
mars dev
mars check
mars build
```

Build scopes:

```bash
mars build             # current/last Deck
mars build --brick     # one Brick
mars build --stack     # complete Stack
```

The course preset keeps the familiar filenames:

```text
Lectures 01 → DL_01.pdf
TD 01       → DL_TD01.pdf
TP 01       → DL_TP01.pdf
```

## Parked roots

MARS can register multiple directories containing Stacks, inspired by Laravel Valet's `park` workflow:

```bash
cd ~/Courses
mars park

cd ~/Conferences
mars park

mars paths
mars list
mars open deep-learning
```

`park` only manages discovery in v0.7. The local hostname/server layer is intentionally reserved for the next server-focused release.

## Migration from MARS 0.6

From the root of an existing course:

```bash
mars migrate
mars check
```

Migration is non-destructive:

- creates `mars.yml`;
- creates one `brick.yml` for `chapters/`, `td/`, `tp/`;
- creates `deck.yml` beside each existing `slides.md`;
- keeps `course.yml` for rollback;
- does not move or rewrite pedagogical Markdown.

## Scientific figures

Python remains optional. Figure scripts receive:

```text
MARS_STACK_ROOT
MARS_DECK_ROOT
MARS_FIGURE_OUT_DIR
```

Legacy `MARS_COURSE_ROOT` and `MARS_DOCUMENT_ROOT` variables are preserved during the 0.7 transition.

## Compatibility aliases

For migration comfort, `mars new ...` still works with a deprecation warning. Course-specific authoring shortcuts are also available when the corresponding Brick exists:

```bash
mars make:chapter
mars make:td
mars make:tp
```

The generic core remains `make:stack`, `make:brick`, `make:deck`.

## Versions

- MARS CLI: **0.7.0**
- Content model: **Stack / Brick / Deck / Slide**
- Design API: **1**
- Theme MARS: **1.0.0**
- Marp CLI: **4.5.1**
- Node.js: **>= 18**

## Tests

```bash
npm test
```

The v0.7.0 core suite contains 17 automated tests covering the generic hierarchy, migration, registry/park, output naming, figures, validation, state and console UX.
