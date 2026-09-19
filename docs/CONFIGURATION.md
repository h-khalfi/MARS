# MARS configuration — v0.7

## `mars.yml`

```yaml
mars.schema: 1
mars.compatibility: 0.7
stack.title: Deep Learning
stack.slug: deep-learning
stack.short_title: DL
stack.preset: course
stack.language: fr
academic.year: 2026-2027
author.full: Pr. Hamza Khalfi
institution.profile: ensak-usms
theme.name: mars
```

Nested scalar YAML remains accepted by the MARS parser as well.

## `brick.yml`

```yaml
brick.title: Tutorials
brick.slug: td
brick.short_title: TD
brick.kind: tutorials
brick.order: 2
deck.label: TD
output.pattern: "{stack.short}_{brick.short}{deck.number}.pdf"
```

Available output tokens:

```text
{stack.short}
{stack.slug}
{brick.short}
{brick.slug}
{deck.number}
{deck.slug}
```

## `deck.yml`

```yaml
deck.title: Backpropagation
deck.slug: backpropagation
deck.number: 02
deck.kind: chapter
deck.subtitle: ""
```

`slides.md` remains standard Marp Markdown and is the source of truth for the slides themselves.
