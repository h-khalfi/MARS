# Mathématiques dans MARS

MARS utilise **MathJax** avec Marp. Les documents générés doivent garder `math: mathjax` dans le front matter.

## Règle principale

Les expressions mathématiques doivent rester dans des zones Markdown normales :

```markdown
La sortie du modèle est $\hat y$.

$$
f_\theta(x)=y
$$
```

Évitez d'enfouir du Markdown/LaTeX dans une balise HTML compacte :

```html
<div>$f_\theta(x)$</div>
```

Pour les composants MARS basés sur HTML, laissez des lignes vides et placez les équations comme du Markdown :

```html
<div class="academic-block definition">

### Définition

$$
f_\theta : \mathcal X \to \mathcal Y
$$

</div>
```

Pour les petits symboles intégrés dans des diagrammes HTML, préférez si possible Unicode (`θ`, `ŷ`, `σ`) ou du texte simple. Pour une vraie formule, utilisez MathJax hors des éléments HTML compacts.
