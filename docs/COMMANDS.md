# MARS commands — v0.7

## Core

| Command | Purpose |
|---|---|
| `mars` | compact Artisan-style command index |
| `mars dev` | live preview of current/last Deck |
| `mars build` | build current/last Deck |
| `mars build --brick` | build a Brick |
| `mars build --stack` | build the complete Stack |
| `mars check` | validate Stack/Brick/Deck structure and assets |
| `mars status` | show detected Stack, Brick and Deck |

## Make

| Command | Purpose |
|---|---|
| `mars make:stack` | create a Stack |
| `mars make:brick` | create a Brick |
| `mars make:deck` | create a Deck |
| `mars make:figure` | create a generic Python figure source |
| `mars make:chapter` | course-preset alias to Lectures Brick |
| `mars make:td` | course-preset alias to Tutorials Brick |
| `mars make:tp` | course-preset alias to Labs Brick |

## Registry

| Command | Purpose |
|---|---|
| `mars park [path]` | register a directory containing Stacks |
| `mars unpark [path]` | remove a parked root |
| `mars paths` | list parked roots and linked Stacks |
| `mars link [alias]` | register current Stack individually |
| `mars unlink [alias]` | remove a link |
| `mars list` | list known Stacks |
| `mars open [stack]` | open a Stack |

## Tools

| Command | Purpose |
|---|---|
| `mars figures` | generate scientific figures |
| `mars sync` | synchronize themes/editor metadata/lock |
| `mars clean [--all]` | remove generated outputs |
| `mars migrate` | migrate a MARS 0.6 course into Stack/Brick/Deck manifests |
| `mars doctor [--fix]` | diagnose installation |
| `mars guide` | show MARS design guide |
| `mars completion zsh|bash|fish` | emit shell completion script |
| `mars menu` | open compact interactive menu |
