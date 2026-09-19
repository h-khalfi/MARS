---
marp: true
theme: mars
paginate: true
size: 16:9
lang: fr
math: mathjax
footer: "MARS v0.7.0 · Marp Authoring & Rendering Studio"
---

<!-- _class: title-academic institutional-cover -->

<img class="logo-ensak" src="../profiles/ensak-usms/ensak-logo.png" alt="ENSA Khouribga" />
<img class="logo-usms" src="../profiles/ensak-usms/usms-logo.png" alt="Université Sultan Moulay Slimane" />

<div class="cover-title-block">
<div class="title">MARS v0.7.0</div>
<div class="subtitle">Marp Authoring & Rendering Studio</div>
</div>

<div class="cover-meta">
<div class="author">Design system et environnement auteur pour Marp</div>
<div class="organization">ENSA Khouribga · Université Sultan Moulay Slimane</div>
<div class="date">Catalogue de référence</div>
</div>

---

<!-- _class: chapter -->

# Blocs académiques

## Une sémantique stable sur tous les Decks

---

<!-- _class: content -->

# Définition et exemple

<div class="academic-block definition">

### Définition — Apprentissage supervisé

L'**apprentissage supervisé** consiste à apprendre une fonction

$$
f_\theta : \mathcal X \rightarrow \mathcal Y
$$

à partir d'exemples étiquetés.

</div>

<div class="academic-block example">

### Exemple

Reconnaître la classe d'une image à partir d'exemples annotés.

</div>

---

<!-- _class: content -->

# Théorème, propriété et preuve

<div class="academic-block theorem compact">

### Théorème

Énoncé d'un résultat mathématique central.

</div>

<div class="academic-block property compact">

### Propriété

Une propriété utile du modèle ou de l'algorithme.

</div>

<div class="academic-block proof compact">

### Preuve

On applique la règle de chaîne : $\frac{dy}{dx}=\frac{dy}{dz}\frac{dz}{dx}$.

</div>

---

<!-- _class: content -->

# Remarque, exercice et synthèse

<div class="academic-block remark compact">

### Remarque

Cette hypothèse n'est pas nécessaire dans le cas général.

</div>

<div class="academic-block exercise compact">

### Exercice

Calculer la sortie pour $x=(1,2)$, $w=(0.5,-1)$ et $b=1$.

</div>

<div class="academic-block takeaway compact">

### À retenir

Le **layout** organise la slide ; le **bloc** exprime son rôle pédagogique.

</div>

---

<!-- _class: content -->

# Avertissement

<div class="academic-block warning">

### Attention

Ne pas confondre **fonction d'activation** et **fonction de perte** : elles n'ont ni le même rôle ni la même place dans le modèle.

</div>

<div class="academic-block remark">

### Remarque

Le bloc `warning` signale un piège conceptuel ou une erreur fréquente ; il ne remplace pas un bloc `remark`.

</div>

---

<!-- _class: chapter -->

# Layouts fondamentaux

## Huit structures reproductibles en v0.3.0

---

<!-- _class: figure-right -->

# Figure à droite

<div class="layout-grid">

<div class="slide-content">

Une slide `figure-right` réserve davantage d'espace au texte tout en garantissant une zone visuelle stable.

<div class="academic-block takeaway">

### À retenir

Aucun ajustement CSS par slide.

</div>

</div>

<div class="slide-visual">

![Réseau](network.svg)

<div class="caption">Exemple de représentation d'un réseau.</div>

</div>

</div>

---

<!-- _class: figure-left -->

# Figure à gauche

<div class="layout-grid">

<div class="slide-content">

Le même contrat HTML est utilisé. Seule la classe de la slide change.

- structure stable ;
- image dimensionnée automatiquement ;
- texte libre à droite.

</div>

<div class="slide-visual">

![Réseau](network.svg)

</div>

</div>

---

<!-- _class: two-columns -->

# Deux colonnes

<div class="columns">

<div>

## Apprentissage

- données
- fonction de perte
- optimisation

</div>

<div>

## Inférence

- nouvelle observation
- passage avant
- prédiction

</div>

</div>

---

<!-- _class: comparison -->

# Machine Learning traditionnel vs Deep Learning

<div class="comparison-grid">

<div class="comparison-card">

## Traditionnel

- caractéristiques conçues à la main ;
- classifieur appris ;
- pipeline fragmenté.

</div>

<div class="comparison-card accent">

## Deep Learning

- représentations apprises ;
- classifieur appris ;
- entraînement end-to-end.

</div>

</div>

---

<!-- _class: diagram -->

# Pipeline

<div class="diagram-intro">Un diagramme exprime une succession d'étapes ou une architecture simple.</div>

<div class="diagram-flow">

<div class="diagram-node">
<div class="diagram-label">Entrée</div>
Image
</div>
<div class="diagram-arrow">→</div>
<div class="diagram-node">
<div class="diagram-label">Conçu manuellement</div>
Caractéristiques
</div>
<div class="diagram-arrow">→</div>
<div class="diagram-node learned">
<div class="diagram-label learned">Appris</div>
Classifieur
</div>

</div>

<div class="diagram-takeaway">Le message final est séparé du pipeline pour rester lisible à distance.</div>

---

<!-- _class: figure-full -->

# Figure dominante

<div class="full-figure">

![Courbe](chart.svg)

</div>

<div class="caption">Utiliser ce layout quand la figure porte l'essentiel du message.</div>

---

<!-- _class: equation-focus -->

# Équation centrale

<div class="main-equation">

$$
y = \sigma(Wx+b)
$$

</div>

<div class="equation-notes">
<div class="equation-note"><span class="equation-symbol">W</span><span>poids appris</span></div>
<div class="equation-note"><span class="equation-symbol">b</span><span>biais</span></div>
<div class="equation-note accent"><span class="equation-symbol">σ</span><span>activation</span></div>
</div>


---

<!-- _class: chapter -->

# Layouts spécialisés

## Dix structures supplémentaires en v0.3.0

---

<!-- _class: architecture -->

# Architecture

<div class="architecture-canvas">
<div class="architecture-flow">

<div class="architecture-stage">
<strong>Entrée</strong>
Pixels
</div>
<div class="architecture-arrow">→</div>
<div class="architecture-stage feature">
<strong>Conv + ReLU</strong>
Caractéristiques locales
</div>
<div class="architecture-arrow">→</div>
<div class="architecture-stage learned">
<strong>Représentation</strong>
Caractéristiques de haut niveau
</div>
<div class="architecture-arrow">→</div>
<div class="architecture-stage output">
<strong>Sortie</strong>
Classe prédite
</div>

</div>
</div>

<div class="architecture-note">Pour CNN, MLP, autoencodeurs, Transformers ou tout modèle composé de blocs.</div>

---

<!-- _class: algorithm -->

# Algorithme

<div class="algorithm-box">

<div class="algorithm-meta">
<div><strong>Entrée :</strong> données D, taux η</div>
<div><strong>Sortie :</strong> paramètres θ</div>
</div>

1. Initialiser $\theta$.
2. Calculer la perte $L(\theta)$.
3. Calculer $\nabla_\theta L$.
4. Mettre à jour les paramètres.

<div class="algorithm-update">

$$
\theta \leftarrow \theta - \eta\nabla_\theta L
$$

</div>

</div>

<div class="algorithm-note">Séparer la procédure de ses hypothèses, propriétés de convergence ou remarques d'implémentation.</div>

---

<!-- _class: math-derivation -->

# Dérivation mathématique

<div class="derivation">

<div class="derivation-step">
<div class="derivation-index">1</div>
<div class="derivation-body">

Composition : $y=f(g(x))$.

</div>
</div>

<div class="derivation-step">
<div class="derivation-index">2</div>
<div class="derivation-body">

Règle de chaîne :

$$
\frac{dy}{dx}=\frac{df}{dg}\frac{dg}{dx}.
$$

</div>
</div>

<div class="derivation-step">
<div class="derivation-index">3</div>
<div class="derivation-body">

On applique la relation couche par couche dans le réseau.

</div>
</div>

<div class="derivation-conclusion">La rétropropagation est une application structurée de la règle de chaîne.</div>

</div>

---

<!-- _class: timeline -->

# Frise chronologique

<div class="timeline-track">
<div class="timeline-item"><span class="timeline-year">1943</span><span class="timeline-title">McCulloch–Pitts</span>Neurone formel</div>
<div class="timeline-item"><span class="timeline-year">1958</span><span class="timeline-title">Perceptron</span>Rosenblatt</div>
<div class="timeline-item"><span class="timeline-year">1986</span><span class="timeline-title">Backprop</span>Renaissance des MLP</div>
<div class="timeline-item"><span class="timeline-year">1998</span><span class="timeline-title">LeNet</span>CNN pour les chiffres</div>
<div class="timeline-item accent"><span class="timeline-year">2012</span><span class="timeline-title">AlexNet</span>Rupture ImageNet</div>
</div>

---

<!-- _class: gallery gallery-4 -->

# Galerie d'applications

<div class="gallery-grid">

<div class="gallery-item">
<img src="vision.svg" alt="Vision" />
<h3>Vision</h3>
<p>Classification, détection, segmentation</p>
</div>

<div class="gallery-item">
<img src="text.svg" alt="Texte" />
<h3>Langage</h3>
<p>Compréhension et génération</p>
</div>

<div class="gallery-item">
<img src="audio.svg" alt="Audio" />
<h3>Audio</h3>
<p>Reconnaissance de la parole</p>
</div>

<div class="gallery-item">
<img src="generation.svg" alt="Génération" />
<h3>Génération</h3>
<p>Images et représentations apprises</p>
</div>

</div>

---

<!-- _class: experiment -->

# Résultat expérimental

<div class="experiment-grid">

<div class="experiment-figure">

![Courbe de performance](chart.svg)

<div class="caption">Une figure principale, lisible à distance.</div>

</div>

<div class="experiment-result">

## Observation

<div class="metric">+18 %<small>gain relatif sur la métrique étudiée</small></div>

Le panneau latéral sert à exprimer **le résultat**, pas à répéter le graphique.

</div>

</div>

---

<!-- _class: motivation -->

# Motivation

<div class="motivation-question">

Et si, au lieu d'écrire toutes les règles, nous pouvions **les apprendre à partir des données** ?

</div>

<div class="motivation-context">

Une slide de motivation introduit le problème avant le vocabulaire et le formalisme.

</div>

---

<!-- _class: question -->

# Question

<div class="question-text">

Pourquoi la **profondeur** peut-elle améliorer les représentations apprises ?

</div>

<div class="question-hint">Utiliser cette slide comme rupture pédagogique avant une nouvelle notion.</div>

---

<!-- _class: intuition -->

# Intuition avant formalisme

<div class="intuition-grid">

<div class="intuition-content">

La descente de gradient ressemble à une marche sur un paysage dont on ne connaît que la **pente locale**.

<div class="intuition-card">

On choisit une direction qui réduit localement la fonction objectif, puis on recommence.

</div>

</div>

<div class="intuition-visual">

![Paysage d'optimisation](landscape.svg)

</div>

</div>

---

<!-- _class: take-home -->

# À retenir

<div class="take-home-grid">

<div class="take-home-item"><span class="take-home-number">01</span>Un <strong>layout</strong> fixe la géométrie de la slide.</div>
<div class="take-home-item"><span class="take-home-number">02</span>Un <strong>bloc</strong> encode le rôle pédagogique du contenu.</div>
<div class="take-home-item"><span class="take-home-number">03</span>Le CSS spécifique reste réservé aux besoins réellement nouveaux.</div>

</div>

---

<!-- _class: content -->

# Crédit de source

Une source directement utilisée sur une slide peut être indiquée discrètement sans surcharger le contenu.

<div class="slide-source">Adapté de : Auteur, titre du cours ou de la publication.</div>

---

<!-- _class: references -->

# Références

<div class="references-list">

<div class="reference-entry"><strong>Yann LeCun & Alfredo Canziani</strong><br>Deep Learning, NYU Center for Data Science.</div>

<div class="reference-entry"><strong>Charles Deledalle</strong><br>Machine Learning for Image Processing, UCSD ECE 285.</div>

<div class="reference-entry"><strong>Sebastian Raschka</strong><br>STAT 453 — Introduction to Deep Learning.</div>

</div>

---

<!-- _class: content -->

# Règle de conception

<div class="academic-block takeaway">

### Principe MARS

Une nouvelle slide doit d'abord utiliser un **layout existant** et des **blocs existants**.

On ne crée un nouveau CSS que lorsqu'un besoin réellement nouveau devient **réutilisable**.

</div>
