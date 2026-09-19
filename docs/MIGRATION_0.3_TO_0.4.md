# Migration vers MARS v0.4.x

MARS v0.4 sépare l'outil des cours. Un cours v0.3 peut être déplacé hors du dossier MARS puis normalisé.

## Procédure recommandée

1. Copier/déplacer le cours vers son emplacement pédagogique, par exemple :

```text
~/Cours/2026-2027/deep-learning/
```

2. Entrer dans le cours :

```bash
cd ~/Cours/2026-2027/deep-learning
```

3. Lancer :

```bash
mars migrate
```

La commande :

- copie le branding dans `assets/branding/` ;
- synchronise `.mars/themes/` et `.vscode/` ;
- conserve le contenu pédagogique ;
- remplace les chemins v0.3 `../../../shared/branding/...` par `../../assets/branding/...` ;
- corrige aussi le chemin v0.4.0 `../../../assets/branding/...` vers `../../assets/branding/...`.

La commande peut être relancée sans danger.
