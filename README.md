# ACD Cards

Collection de cartes custom pour Home Assistant au design doux et minimal (crème / vert olive), inspirée d'un dashboard "smart home" épuré.

**Cartes disponibles :**

| Carte | Type | Description |
|---|---|---|
| Light | `custom:acd-light-card` | Lumière : interrupteur, luminosité, couleur & température (panneau dépliable) |
| Cover | `custom:acd-cover-card` | Volet / store : boutons, position, carrousel |
| Climate | `custom:acd-climate-card` | Thermostat : cadran de consigne, modes, température actuelle |
| Stat | `custom:acd-stat-card` | Tuile KPI : grande valeur, sparkline 24 h, tendance |
| Stats Row | `custom:acd-stats-row-card` | Rangée de tuiles KPI en **scroll horizontal** + tendance vs période précédente |
| Rooms | `custom:acd-rooms-card` | Pièces (areas HA) : liste sur desktop, **pastilles en scroll horizontal** sur mobile |
| Camera | `custom:acd-camera-card` | Tuile caméra : aperçu ou flux, badge « Live », légende `pièce · nom` |
| Persons | `custom:acd-persons-card` | Avatars des personnes présentes / absentes |
| Header | `custom:acd-header-card` | En-tête mobile : salutation selon l'heure, nom, cloche, avatar |
| Search | `custom:acd-search-card` | Barre de recherche pièces & appareils |
| Section | `custom:acd-section-card` | Titre de section + lien d'action (« Tout gérer ») |
| Sidebar | `custom:acd-sidebar-card` | Navigation : rail d'icônes à gauche, **tab bar en bas sur mobile** |
| Date & météo | `custom:acd-datetime-card` | Heure qui tourne, date du jour et météo courante, **redimensionnable** |

## Installation

### HACS (recommandé)

1. HACS → menu ⋮ → **Dépôts personnalisés**.
2. Dépôt : `https://github.com/ribardb/acd-cards` — catégorie : **Lovelace**.
3. Ouvrir « ACD Cards » → **Télécharger**.
4. Rafraîchir le navigateur (Ctrl+F5).

HACS enregistre la ressource `/hacsfiles/acd-cards/acd-cards.js` et signale
chaque nouvelle release. Le bundle n'est pas versionné dans le dépôt : il est
construit par la CI et attaché à la release (voir `.github/workflows/`).

### Manuelle

1. Récupérer `acd-cards.js` depuis la dernière release, ou le construire avec
   `npm ci && npm run build`.
2. Le copier dans `config/www/` de votre instance Home Assistant.
3. Paramètres → Tableaux de bord → ⋮ → **Ressources** → Ajouter :
   - URL : `/local/acd-cards.js?v=0.17.0`
   - Type : **Module JavaScript**
4. Rafraîchir le navigateur (Ctrl+F5).

Le paramètre `?v=` casse le cache du navigateur à chaque livraison.

## Publier une version

```bash
npm version 0.18.0 --no-git-tag-version   # met à jour package.json
git commit -am "v0.18.0"
git tag v0.18.0
git push origin main --tags
```

Le tag déclenche `release.yml` : typecheck, build, puis publication de la
release avec `dist/acd-cards.js` en pièce jointe. HACS proposera la mise à
jour dans la foulée.

## `acd-light-card`

Toutes les options sont **optionnelles** sauf `entity`. La carte est configurable via l'**éditeur visuel** (aucun YAML requis).

```yaml
type: custom:acd-light-card
entity: light.salon
```

Exemple complet :

```yaml
type: custom:acd-light-card
entity: light.salon
name: ES light
icon: mdi:ceiling-light            # optionnel
image: /local/images/lamp.png      # optionnel, remplace l'icône
show_toggle: true                  # défaut : true
show_brightness: true              # défaut : true
show_color_controls: true          # défaut : true (panneau dépliable)
show_state: true                   # défaut : true
entities:                          # optionnel : carrousel ‹ › entre plusieurs lumières
  - light.salon
  - light.cuisine
  - light.chambre
```

### Comportement

- **Interrupteur** en haut à droite → `light.toggle`.
- **Barre de luminosité** en bas (pastille blanche + %), glisser pour régler ; 0 % éteint la lumière.
- **Appui sur l'icône/image** → déplie les curseurs **température de couleur** (dégradé chaud → froid, bornes kelvin de l'entité) et **teinte** (dégradé arc-en-ciel), affichés uniquement si l'entité les supporte.
- **Appui sur le nom** → fenêtre *more-info* native.
- **Fond de carte** teinté vert-gris quand la lumière est allumée (fidèle à la maquette).
- Groupes de lumières : l'état secondaire affiche `N appareil(s) · 36%`.
- Libellés FR/EN automatiques selon la langue de l'utilisateur HA.

## Mobile : scroll horizontal et bascule automatique

Deux cartes changent de disposition selon la place disponible, ce qui permet de garder **un seul dashboard** pour desktop et mobile.

### `acd-rooms-card`

```yaml
type: custom:acd-rooms-card
title: Pièces
link_text: Voir tout            # lien à droite du titre (optionnel)
link_path: /eso-home/pieces
layout: auto                    # auto (défaut) | horizontal | list
breakpoint: 450                 # largeur de carte sous laquelle auto passe en horizontal
pill_width: 124                 # largeur mini d'une pastille
show_counts: true               # « 5 appareils »
show_icons: false               # défaut : off en horizontal, on en liste
snap: false                     # true = alignement de la pastille au relâchement
areas:                          # ordre imposé (défaut : toutes, alphabétique)
  - salon
  - cuisine
  - chambre
```

- `layout: auto` mesure la **largeur de la carte** (pas celle de l'écran) : la même carte reste en liste dans une section desktop et passe en pastilles sur téléphone.
- En horizontal, la pièce active prend le fond accent et son sous-titre devient `5 appareils · actif`.
- Le scroll est **libre** (pas de snap), scrollbar masquée, dégradé de fondu sur le bord qui a encore du contenu, et les pastilles suivantes restent partiellement visibles.
- Un appui navigue vers `/<dashboard>/<slug-de-la-pièce>`, surchargeable via `navigation_path` (`{area}` = id, `{slug}` = nom slugifié).

### `acd-stats-row-card`

```yaml
type: custom:acd-stats-row-card
entities:
  - sensor.temperature_interieure
  - sensor.temperature_exterieure
  - entity: sensor.humidite       # forme objet pour surcharger une tuile
    name: Humidité
    decimals: 0
tile_width: 132
graph_hours: 168                  # fenêtre de comparaison (168 h = 1 semaine)
show_trend: true                  # ▲ +1°C vs. sem. dern.
trend_label: vs. sem. dern.       # défaut déduit de la fenêtre
```

L'historique des trois entités est récupéré en **un seul appel** à l'API `history`, rafraîchi toutes les 5 minutes.

### `acd-sidebar-card` en tab bar

```yaml
type: custom:acd-sidebar-card
mode: auto                        # auto (défaut) | rail | tabbar
breakpoint: 870                   # largeur de fenêtre sous laquelle auto passe en tab bar
tabbar_labels: true               # libellés sous les icônes en tab bar
logo: ES                          # rail uniquement
items:
  - { icon: mdi:home-variant-outline, label: Accueil, path: /eso-home/accueil }
  - { icon: mdi:lightning-bolt-outline, label: Énergie, path: /eso-home/energie }
  - { icon: mdi:video-outline, label: Caméras, path: /eso-home/cameras }
  - { icon: mdi:palette-outline, label: Scènes, path: /eso-home/scenes }
  - { icon: mdi:cog-outline, label: Réglages, path: /eso-home/reglages }
```

En tab bar : barre fixe en bas, onglets répartis, onglet courant en accent (pas de pastille pleine), `env(safe-area-inset-bottom)` pris en compte pour l'indicateur d'accueil iOS, et la vue reçoit le padding bas correspondant.

## Autres cartes de l'accueil mobile

```yaml
# En-tête
type: custom:acd-header-card
person_entity: person.alisha        # nom + photo (défaut : utilisateur HA)
notification_entity: sensor.notifications   # compteur > 0 ou « on » → point vert
notification_path: /eso-home/notifications
avatar_size: 34

# Recherche
type: custom:acd-search-card
placeholder: Rechercher une pièce, un appareil…
domains: [light, cover, climate, camera]    # défaut : tous
max_results: 8

# Caméra
type: custom:acd-camera-card
entity: camera.salon
aspect_ratio: "16/9"                # ou height: 140
refresh_interval: 10                # rafraîchissement de l'aperçu, en secondes
stream: false                       # true = flux vidéo si HA l'a chargé, sinon aperçu

# Titre de section
type: custom:acd-section-card
title: Appareils
link_text: Tout gérer
link_path: /eso-home/appareils
```

## Exemple : dashboard mobile complet

```yaml
views:
  - title: Accueil
    path: accueil
    type: sections
    max_columns: 2
    sections:
      - type: grid
        cards:
          - type: custom:acd-sidebar-card
            items:
              - { icon: mdi:home-variant-outline, label: Accueil, path: /eso-home/accueil }
              - { icon: mdi:lightning-bolt-outline, label: Énergie, path: /eso-home/energie }
              - { icon: mdi:video-outline, label: Caméras, path: /eso-home/cameras }
              - { icon: mdi:palette-outline, label: Scènes, path: /eso-home/scenes }
              - { icon: mdi:cog-outline, label: Réglages, path: /eso-home/reglages }

          - type: custom:acd-header-card
            person_entity: person.alisha

          - type: custom:acd-search-card

          - type: custom:acd-stats-row-card
            entities:
              - sensor.temperature_interieure
              - sensor.temperature_exterieure
              - sensor.humidite

          - type: custom:acd-camera-card
            entity: camera.salon
            height: 140

          - type: custom:acd-rooms-card
            title: Pièces
            link_text: Voir tout
            link_path: /eso-home/pieces

          - type: custom:acd-section-card
            title: Appareils
            link_text: Tout gérer
            link_path: /eso-home/appareils

          - type: custom:acd-climate-card
            entity: climate.salon
          - type: custom:acd-light-card
            entity: light.salon
```

## `acd-datetime-card`

```yaml
type: custom:acd-datetime-card
weather_entity: weather.forecast_maison   # défaut
show_weather: true        # bloc météo à droite
show_range: true          # min / max du jour (weather.get_forecasts)
show_greeting: true       # « Bonjour » / « Bon après-midi » / « Bonsoir »
show_seconds: false
```

- L'horloge tourne sur un timer interne : aucun capteur d'heure n'est requis.
- **Toute la typographie est en unités de conteneur** (`cqi` / `cqh`, bornées
  par `clamp`) : la carte reste équilibrée à n'importe quelle taille, du petit
  bandeau de 4 colonnes à la grande tuile de 12 × 12.
- `getGridOptions` déclare des bornes larges (`min_columns: 4`, `min_rows: 2`,
  `max_rows: 12`) pour laisser les poignées de redimensionnement respirer.
- Aux paliers de densité, la salutation disparaît en premier, puis la condition
  et les min/max — l'heure et la date restent toujours lisibles.

> Une carte placée dans une `vertical-stack` **n'est pas redimensionnable
> individuellement** : seule la pile l'est. Pour profiter des poignées, poser
> la carte directement dans la section.

## Personnalisation du style (thème)

Tous les tokens sont surchargeables depuis un thème HA :

```yaml
acd-theme:
  acd-accent-color: "#333d33"
  acd-card-background: "#fdfdfb"
  acd-card-background-active: "#d5d8cf"
  acd-card-radius: "20px"
  acd-text-secondary-color: "#94978f"
  acd-border-color: "#ecece9"
  acd-muted-color: "#a9b3a5"      # avatars, fonds secondaires
  acd-success-color: "#3e9e6b"    # tendances à la hausse, point de notification
  acd-danger-color: "#c26a5a"     # tendances à la baisse
  acd-live-color: "#e05b5b"       # point du badge « Live »
```

## Développement

```bash
npm install
npm run build      # → dist/acd-cards.js
npm run watch      # rebuild à chaque modification
npm run typecheck
```

Architecture : `src/shared/` + `src/cards/<carte>/` (carte + éditeur). Chaque nouvelle carte hérite de `AcdBaseCard` et réutilise les briques partagées.

Briques de `src/shared/` :

| Fichier | Rôle |
|---|---|
| `tokens.ts` | variables CSS `--acd-*`, surchargeables par thème HA |
| `base-card.ts` | `AcdBaseCard` : hass/config, accès entités, events, helper FR/EN |
| `acd-slider.ts` | curseur réutilisable (luminosité, position, teinte) |
| `scroll-row.ts` | `acd-scroll-row` : scroll horizontal, scrollbar masquée, fondu de bord dynamique, snap optionnel |
| `width-controller.ts` | `WidthController` : mesure la largeur de la carte (ResizeObserver) pour les bascules `layout: auto` |
| `register.ts` | `safeDefine`, `registerCard`, `registerBadge` |

Pour rendre une nouvelle carte responsive : instancier `new WidthController(this)` puis tester `this._width.isNarrow(breakpoint)`. Pour une rangée scrollable : envelopper les enfants dans `<acd-scroll-row>` et régler `--acd-scroll-gap`, `--acd-scroll-inset`, `--acd-scroll-fade`.
