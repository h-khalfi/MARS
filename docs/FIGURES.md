# Scientific figures — MARS v0.7

Figures are optional and generic. MARS manages execution, output paths and freshness; scientific semantics remain in the user's Python code.

Create a source:

```bash
mars make:figure
```

Engines offered by the authoring helper:

- Matplotlib
- Plotly
- blank Python

Run figures:

```bash
mars figures
mars build --figures
```

Environment variables:

```text
MARS_STACK_ROOT
MARS_DECK_ROOT
MARS_FIGURE_OUT_DIR
```

MARS tracks every script independently with SHA-256 state in `.mars/figures-state.json`.
