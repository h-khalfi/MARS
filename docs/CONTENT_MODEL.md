# MARS content model

MARS 0.7 uses exactly four content levels.

```text
Stack → Brick → Deck → Slide
```

## Stack

The complete presentation product. Examples: a university course, conference package, workshop, training program, defense, seminar series.

Manifest: `mars.yml`.

## Brick

A coherent group of Decks inside a Stack. Examples: Lectures, Tutorials, Labs, Keynotes, Track A, Modules, Exercises.

Manifest: `brick.yml`.

A Brick owns conventions such as Deck label, numbering/output pattern and semantic kind.

## Deck

An autonomous presentation that can be previewed and built independently.

Files:

```text
01-introduction/
├── deck.yml
├── slides.md
└── assets/
```

`slides.md` remains ordinary Marp Markdown.

## Slide

The atomic visual unit. Slides are delimited by Marp's normal Markdown `---` separator. MARS does not introduce a custom slide syntax.

## Design rule

The hierarchy is intentionally fixed. MARS does not add Module/Submodule/Collection levels between these concepts. Cross-cutting organization should later be implemented through metadata or views, not deeper nesting.
