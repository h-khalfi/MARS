# MARS Design API 1.0 — Contrats des layouts

Les contrats ci-dessous constituent l'API stable de MARS Design API 1.0.

## Layouts fondamentaux

### `content`
Contenu libre. Optionnel : `.content-body`.

### `figure-right` / `figure-left`
```html
<div class="layout-grid">
  <div class="slide-content">...</div>
  <div class="slide-visual">...</div>
</div>
```
Modificateurs : `figure-small`, `figure-large`.

### `two-columns`
```html
<div class="columns">
  <div>...</div>
  <div>...</div>
</div>
```
Modificateurs : `cols-40-60`, `cols-60-40`.

### `comparison`
```html
<div class="comparison-grid">
  <div class="comparison-card">...</div>
  <div class="comparison-card accent">...</div>
</div>
```

### `diagram`
```html
<div class="diagram-intro">...</div>
<div class="diagram-flow">
  <div class="diagram-node">...</div>
  <div class="diagram-arrow">→</div>
  <div class="diagram-node learned">...</div>
</div>
<div class="diagram-takeaway">...</div>
```

### `figure-full`
```html
<div class="full-figure">IMAGE</div>
<div class="caption">...</div>
```

### `equation-focus`
```html
<div class="main-equation">EQUATION</div>
<div class="equation-notes">
  <div class="equation-note"><span class="equation-symbol">W</span><span>poids</span></div>
</div>
```

## Layouts spécialisés

### `architecture`
Pour des modèles composés de blocs : MLP, CNN, autoencodeur, Transformer, etc.
```html
<div class="architecture-canvas">
  <div class="architecture-flow">
    <div class="architecture-stage">...</div>
    <div class="architecture-arrow">→</div>
    <div class="architecture-stage learned">...</div>
  </div>
</div>
<div class="architecture-note">...</div>
```
Modificateur : `architecture-wide`.

### `algorithm`
```html
<div class="algorithm-box">
  <div class="algorithm-meta">...</div>
  ... étapes Markdown ...
  <div class="algorithm-update">...</div>
</div>
<div class="algorithm-note">...</div>
```
Modificateur : `algorithm-compact`.

### `math-derivation`
```html
<div class="derivation">
  <div class="derivation-step">
    <div class="derivation-index">1</div>
    <div class="derivation-body">...</div>
  </div>
  <div class="derivation-conclusion">...</div>
</div>
```

### `timeline`
```html
<div class="timeline-track">
  <div class="timeline-item">
    <span class="timeline-year">2012</span>
    <span class="timeline-title">AlexNet</span>
    ...
  </div>
</div>
```
Modificateur : `timeline-compact`.

### `gallery`
```html
<div class="gallery-grid">
  <div class="gallery-item">
    <img src="..." alt="..." />
    <h3>...</h3>
    <p>...</p>
  </div>
</div>
```
Modificateurs : `gallery-2`, `gallery-4`, `gallery-6`.

### `experiment`
```html
<div class="experiment-grid">
  <div class="experiment-figure">...</div>
  <div class="experiment-result">
    <div class="metric">...</div>
  </div>
</div>
```
Modificateur : `experiment-reverse`.

### `motivation`
```html
<div class="motivation-question">...</div>
<div class="motivation-context">...</div>
<div class="motivation-visual">...</div>
```

### `question`
```html
<div class="question-text">...</div>
<div class="question-hint">...</div>
```

### `intuition`
```html
<div class="intuition-grid">
  <div class="intuition-content">
    ...
    <div class="intuition-card">...</div>
  </div>
  <div class="intuition-visual">...</div>
</div>
```

### `take-home`
```html
<div class="take-home-grid">
  <div class="take-home-item">
    <span class="take-home-number">01</span>
    ...
  </div>
</div>
```
Modificateurs : `take-home-2`, `take-home-4`.

## Règle de conception

Un modificateur ajuste un layout existant. Un nouveau layout n'est créé que si la structure sémantique elle-même est nouvelle et réutilisable.
