# MARS Design API 1.0 — Blocs académiques

Syntaxe commune :

```html
<div class="academic-block TYPE">

### Titre

Contenu Markdown / mathématique...

</div>
```

Types : `definition`, `theorem`, `property`, `proof`, `example`, `remark`, `exercise`, `takeaway`, `warning`.

Ajouter `compact` au bloc lorsqu'une slide contient plusieurs blocs courts :

```html
<div class="academic-block example compact">
...
</div>
```
