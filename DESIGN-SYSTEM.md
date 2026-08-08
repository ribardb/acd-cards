# ACD Design System

Référence commune pour toutes les cartes ACD — existantes et futures. Ce
document formalise ce qui existe déjà dans le code (`src/shared/tokens.ts` et
les ~30 cartes de `src/cards/`) : il ne réinvente pas un style, il **le rend
explicite** pour qu'une nouvelle carte reste cohérente avec les autres sans
avoir à ouvrir dix fichiers existants pour deviner les conventions.

**Portée actuelle :** ce document décrit l'état réel du code au 2026-08-08 et
les échelles ajoutées à `tokens.ts` pour les widgets futurs. **Aucune carte
existante n'a été modifiée** — les dérives listées en fin de document
(§ [Dérives connues](#dérives-connues)) restent en l'état, à corriger dans un
futur passage volontaire.

---

## Principes

- **Doux et minimal** : fond crème, accent vert olive, pas de gris neutre
  générique — la palette entière est dérivée d'une seule maquette de
  référence, pas du thème Material par défaut de HA.
- **Indépendant du thème HA actif** : les couleurs sont figées par défaut
  (voir `tokens.ts`) mais chaque token reste surchargeable via un thème HA
  (`acd-theme: { acd-accent-color: ... }`), jamais codé en dur dans une carte.
- **La carte décide, pas l'écran** : la densité (§ [Densité
  responsive](#densité-responsive)) réagit à la largeur réellement allouée à
  la carte (container queries), pas à la largeur du viewport — une carte
  étroite sur desktop se comporte comme sur mobile.
- **Bilingue FR/EN sans fichier i18n** : chaque carte traduit ses propres
  chaînes via `this.t(fr, en)` (voir `AcdBaseCard`), piloté par
  `hass.language`.
- **Redimensionnable et condensable, sans exception** : toute carte doit
  déclarer `getGridOptions()` avec des contraintes cohérentes (voir
  [Redimensionnement](#redimensionnement-getgridoptions)) et fournir une
  vraie version condensée pour mobile via `densityStyles(dense, minimal)`
  (voir [Densité responsive](#densité-responsive)) — pas seulement un
  palier `dense`, un palier `minimal` aussi, même succinct.

---

## Tokens existants (`tokens.ts`)

| Token | Valeur par défaut | Rôle |
|---|---|---|
| `--acd-bg` | `#fcfcfa` | Fond de carte |
| `--acd-bg-active` | `#d5d8cc` | Fond d'un état actif/sélectionné |
| `--acd-accent` | `#333a2d` | Couleur d'accent (vert olive) |
| `--acd-on-accent` | `#ffffff` | Texte/icône sur fond accent |
| `--acd-text` | `#1f211c` | Texte principal |
| `--acd-text-secondary` | `#9a9c95` | Texte secondaire, libellés, icônes discrètes |
| `--acd-border` | `#ebeae5` | Bordures |
| `--acd-radius` | `20px` | Radius de la carte (`ha-card`) |
| `--acd-radius-inner` | `14px` | Radius des éléments internes (tuiles, lignes) |
| `--acd-radius-pill` *(nouveau)* | `999px` | Radius des contrôles en pilule (boutons, tags) |
| `--acd-pill` | `#ffffff` | Fond des pilules/tuiles internes |
| `--acd-track` | `rgba(31,33,28,0.08)` | Fond de piste (sliders, barres de progression) |
| `--acd-muted` | `#a9b3a5` | Fonds secondaires, avatars |
| `--acd-success` | `#3e9e6b` | Tendance positive, succès |
| `--acd-danger` | `#c26a5a` | Tendance négative, erreur douce |
| `--acd-live` | `#e05b5b` | Badge « Live » (caméra) |
| `--acd-shadow` | `0 1px 3px rgba(20,24,18,0.05)` | Ombre portée standard |
| `--acd-font` | pile système | Police |

## Échelles ajoutées pour les futurs widgets

Ces tokens sont **nouveaux** (ajoutés à `tokens.ts` le 2026-08-08). Aucune
carte existante ne les consomme encore — ils n'ont donc aucun effet sur
l'existant. Une nouvelle carte doit les utiliser plutôt que des valeurs en
dur.

### Spacing

Grille de 2px, dérivée des `gap`/`padding` déjà majoritaires dans le code
(ex. `gap: 8px` apparaît 34 fois, `gap: 10px` 13 fois) :

| Token | Valeur |
|---|---|
| `--acd-space-1` | 2px |
| `--acd-space-2` | 4px |
| `--acd-space-3` | 6px |
| `--acd-space-4` | 8px — le plus courant, gap par défaut entre éléments d'un groupe |
| `--acd-space-5` | 10px |
| `--acd-space-6` | 12px — padding par défaut d'une tuile |
| `--acd-space-7` | 14px |
| `--acd-space-8` | 16px — padding par défaut d'une `ha-card` pleine taille |
| `--acd-space-9` | 20px |

> Exception acceptée, pas une dérive : plusieurs cartes ajustent un padding
> de ±1px (ex. `9px`, `11px`, `13px`) pour un alignement optique fin
> (icône/texte). C'est un réglage volontaire, pas une valeur à bannir — mais
> il doit rester l'exception, pas la base.

### Typography

Échelle à 9 paliers dérivée des pics observés (`13px` et `14px` sont les
tailles de corps de texte les plus fréquentes) :

| Token | Valeur | Usage typique |
|---|---|---|
| `--acd-font-3xs` | 10px | Micro-légendes (mode densité minimale) |
| `--acd-font-2xs` | 11px | Texte secondaire, métadonnées |
| `--acd-font-xs` | 12px | Petits libellés |
| `--acd-font-sm` | 13px | **Corps de texte / libellé par défaut** |
| `--acd-font-md` | 14px | Nom d'entité, texte mis en avant |
| `--acd-font-lg` | 16px | Sous-titre |
| `--acd-font-xl` | 18px | Petit titre / grande valeur en mode dense |
| `--acd-font-2xl` | 20px | Titre |
| `--acd-font-3xl` | 26px | Valeur héroïque (ex. le gros chiffre d'`acd-stat-card`) |

Poids de police déjà cohérents dans le code, à réutiliser tels quels (pas de
token dédié, ce sont des entiers CSS standard sans ambiguïté) :

| Poids | Usage |
|---|---|
| 400 | Texte courant rare (la plupart des textes sont ≥500) |
| 500 | Texte secondaire, unités |
| 600 | Libellés, noms — **le plus courant** |
| 700 | Valeurs, titres |
| 800 | Rare, réservé aux très grandes valeurs |

### Radius

Trois paliers seulement — ne pas en inventer un quatrième sans mettre à jour
ce document :

| Token | Valeur | Usage |
|---|---|---|
| `--acd-radius-inner` | 14px | Tuiles, lignes, éléments internes |
| `--acd-radius` | 20px | `ha-card` (conteneur racine d'une carte) |
| `--acd-radius-pill` | 999px | Boutons, tags, contrôles en pilule |

### Icon sizes

Appliqué via `--mdc-icon-size` sur `ha-icon` :

| Token | Valeur | Usage |
|---|---|---|
| `--acd-icon-xs` | 14px | Icône inline dans un libellé dense |
| `--acd-icon-sm` | 18px | Icône secondaire (label, ligne de liste) |
| `--acd-icon-md` | 20px | Icône d'action principale |
| `--acd-icon-lg` | 26px | Icône mise en avant (en-tête de carte) |
| `--acd-icon-hero` | 72px | Illustration d'état vide / grande icône décorative |

### Motion

Deux vitesses seulement, observées de façon quasi systématique dans le code
existant :

| Token | Valeur | Usage |
|---|---|---|
| `--acd-motion-fast` | `150ms ease` | Changements de couleur, opacité, `border-color` |
| `--acd-motion` | `180ms ease` | `transform`, `background` — la transition par défaut d'une carte |

---

## Palette d'illustration (SVG intégrées)

`src/shared/assets.ts` (lampes, robot aspirateur, base de charge) utilise une
**micro-palette séparée**, propre aux illustrations : blanc → crème
(`#ffffff` → `#deddd5`, dégradé radial) et un olive foncé (`#2c2d29`) pour les
traits. C'est volontaire et ne doit **pas** être unifié avec les tokens UI :
ces SVG sont encodés en `data:` URI et affichés via `<img>`, donc ils ne
peuvent pas hériter des variables CSS de la page — leur palette doit rester
autoporteuse. Toute nouvelle illustration doit réutiliser ce même dégradé et
ce même olive plutôt qu'improviser une nouvelle teinte.

---

## Anatomie d'une carte

Chaque carte vit dans `src/cards/<nom>/` avec deux fichiers :
`acd-<nom>-card.ts` (la carte) et `acd-<nom>-card-editor.ts` (son éditeur
visuel dans l'UI Lovelace).

### Squelette de la carte

```ts
import { css, html, nothing, type TemplateResult } from "lit";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { Acd<Nom>CardConfig } from "../../types";

const CARD_TYPE = "acd-<nom>-card";

export class Acd<Nom>Card extends AcdBaseCard<Acd<Nom>CardConfig> {
  protected override defaults(): Partial<Acd<Nom>CardConfig> { return {}; }

  public override setConfig(config: Acd<Nom>CardConfig): void {
    if (!config.entity) throw new Error("Please define an entity (`entity`).");
    super.setConfig(config);
  }

  public static getStubConfig(hass: { states: Record<string, unknown> }) { /* … */ }
  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-<nom>-card-editor");
  }
  public getGridOptions() { return { columns: 6, rows: 3 }; }
  public override getCardSize(): number { return 2; }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const stateObj = this.getEntity(this._config.entity);
    if (!stateObj) {
      return html`<ha-card class="error">
        ${this.t("Entité introuvable :", "Entity not found:")} ${this._config.entity}
      </ha-card>`;
    }
    // ...
  }

  static override styles = [
    tokens,
    css`/* styles propres à la carte, tous en var(--acd-*) */`,
    densityStyles("/* règles resserrées ≤360px */", "/* règles minimales ≤240px */"),
  ];
}

safeDefine(CARD_TYPE, Acd<Nom>Card);
registerCard({ type: CARD_TYPE, name: "ACD <Nom> Card", description: "…" });

declare global {
  interface HTMLElementTagNameMap { "acd-<nom>-card": Acd<Nom>Card; }
}
```

Points non négociables :

- Hérite de `AcdBaseCard<Config>` — jamais de `LitElement` nu pour une carte
  (l'éditeur, lui, hérite de `LitElement` directement, voir plus bas).
- `setConfig` valide les champs requis en levant une `Error` explicite.
- Le premier élément de `render()` est toujours le garde `!this._config ||
  !this.hass → nothing`.
- `styles` est **toujours** un tableau `[tokens, css\`...\`, densityStyles(...)]`
  — jamais de couleur/radius/police en dur, toujours `var(--acd-*)`.
- Le tag est enregistré via `safeDefine` + `registerCard` (jamais
  `customElements.define` directement — `safeDefine` évite les erreurs de
  double-enregistrement en HMR/dev).

### États : erreur, vide, chargement

Conventions identiques dans les ~10 cartes qui en ont besoin — à reproduire
littéralement, pas à réinventer :

```ts
// Entité manquante — présent dans toutes les cartes à entité unique.
html`<ha-card class="error">
  ${this.t("Entité introuvable :", "Entity not found:")} ${entity}
</ha-card>`

// Liste vide — cartes à collection (rooms, persons, devices, search).
html`<div class="empty">${this.t("Aucune pièce configurée", "No areas configured")}</div>`

// Chargement — cartes avec fetch asynchrone (historique, graphes).
html`${this.t("Chargement…", "Loading…")}`
```

`.error` en CSS : `color: var(--error-color, #b3261e)` — c'est la **seule**
place où cette couleur d'erreur Material est légitime (fallback natif HA),
elle ne doit jamais apparaître ailleurs dans une carte (voir
[Dérives connues](#dérives-connues)).

### Localisation

Pas de fichier i18n : chaque chaîne passe par `this.t("Texte FR", "English
text")`, hérité de `AcdBaseCard`. Un éditeur définit ses propres
`LABELS_FR`/`LABELS_EN` (voir plus bas) — même logique, pas de fichier
partagé, pour garder chaque carte autonome et déplaçable.

### Interaction

- Un tap sur la carte ouvre le dialogue « plus d'infos » HA :
  `@click=${() => this.moreInfo(entity)}`.
- Un événement custom sortant utilise `this.fire(type, detail)` (bulles +
  composed, défini dans `AcdBaseCard`) — jamais de
  `dispatchEvent(new CustomEvent(...))` répété à la main dans chaque carte.

### Redimensionnement (`getGridOptions`)

Toute carte doit implémenter `getGridOptions()` (vue « sections », le mode
par défaut des dashboards HA récents) pour rester redimensionnable à la main
par l'utilisateur, avec des contraintes qui l'empêchent de casser son
contenu :

```ts
public getGridOptions() {
  return { columns: 4, rows: "auto", min_columns: 3 };
}
```

- `columns`/`rows` : taille par défaut à la pose. `rows: "auto"` pour un
  contenu à hauteur variable (la grande majorité des cartes) ; une valeur
  fixe (`rows: 1`) seulement pour un contenu qui ne doit jamais s'étirer
  verticalement (ex. `acd-section-card`, un simple titre).
- `min_columns` (et `max_rows` si pertinent, voir `acd-stat-card`) : borne
  la réduction pour qu'un texte ou un contrôle ne devienne pas illisible ou
  ne se chevauche pas. **Toujours en poser un**, sauf pour les cartes
  pleine-largeur sans grille interne (`columns: "full"`, ex. les en-têtes).
- `getCardSize()` reste nécessaire en complément (compatibilité vue
  « masonry » historique) mais ne gère pas le redimensionnement manuel — ne
  pas le considérer comme suffisant à lui seul.

Audit 2026-08-08 : les 19 cartes existantes déclarent déjà `getGridOptions`
avec des contraintes cohérentes — aucun gap à corriger sur ce point, à
maintenir pour toute nouvelle carte.

### Densité responsive

`src/shared/density.ts` fournit `densityStyles(dense, minimal)` : deux
chaînes de règles CSS brutes (ciblant des classes du shadow root), appliquées
automatiquement par **container query** sur la largeur réelle de la carte —
`≤360px` déclenche `dense`, `≤240px` déclenche `dense + minimal`. L'option de
config `density` (`auto` / `dense` / `minimal` / `full`) permet de forcer un
palier via l'attribut `data-density`, géré par `AcdBaseCard.setConfig`.

Règle **non négociable** : `dense` resserre marges/polices/visuels ;
`minimal` retire le décoratif et le secondaire pour ne garder que nom + état
+ commande principale. **Toute carte appelle `densityStyles` avec ses deux
arguments** — un `minimal` vide (`densityStyles(dense)` sans second
argument) n'est pas acceptable, même pour une carte déjà simple : au minimum,
masquer un élément secondaire (légende, sous-texte, icône décorative) ou
réduire encore une taille de police/hauteur. Le mode `full` (config
explicite) reste la seule façon légitime de désactiver l'adaptation.

Audit 2026-08-08 : `acd-search-card` était la seule carte sans second
argument (`minimal` vide) — corrigé (masque le sous-texte `.r-sub` des
résultats de recherche).

Quand une décision de layout ne peut pas être prise en CSS pur (ex. bascule
`layout: auto` entre liste et grille), utiliser `WidthController` :
`new WidthController(this)` puis `this._width.isNarrow(breakpoint)` dans
`render()`. Ne pas lire `window.innerWidth` ni écouter un `resize` global —
ça mesure le viewport, pas la carte.

### Éditeur (`ha-form`)

```ts
const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
  { type: "grid", name: "", schema: [
    { name: "name", selector: { text: {} } },
    { name: "icon", selector: { icon: {} }, context: { icon_entity: "entity" } },
  ] },
];
const LABELS_FR: Record<string, string> = { entity: "Entité", name: "Nom (optionnel)" };
const LABELS_EN: Record<string, string> = { entity: "Entity", name: "Name (optional)" };

export class Acd<Nom>CardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: Acd<Nom>CardConfig;

  public setConfig(config: Acd<Nom>CardConfig): void { this._config = config; }

  private _computeLabel = (schema: { name: string }): string =>
    (this.hass?.language?.startsWith("fr") ? LABELS_FR : LABELS_EN)[schema.name] ?? schema.name;

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const config = { ...ev.detail.value };
    for (const key of Object.keys(config)) {
      if (config[key] === "" || config[key] == null) delete config[key];
    }
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  protected override render() {
    if (!this.hass || !this._config) return nothing;
    return html`<ha-form .hass=${this.hass} .data=${this._config} .schema=${SCHEMA}
      .computeLabel=${this._computeLabel} @value-changed=${this._valueChanged}></ha-form>`;
  }
}
```

Toujours : `ha-form` déclaratif via `SCHEMA`, jamais de champs de formulaire
faits main. `_valueChanged` supprime systématiquement les valeurs vides pour
ne pas polluer la config YAML sauvegardée.

### Primitives partagées

Ne pas dupliquer ces comportements dans une nouvelle carte — les réutiliser :

| Brique | Rôle |
|---|---|
| `AcdBaseCard` | hass/config, `getEntity`, `t()`, `fire()`, `moreInfo()`, gestion `density` |
| `tokens` | variables CSS `--acd-*` (voir ci-dessus) |
| `densityStyles` | container queries `dense`/`minimal` |
| `WidthController` | largeur réelle de la carte (ResizeObserver), pour les décisions de layout en JS |
| `AcdScrollRow` (`<acd-scroll-row>`) | rangée à scroll horizontal, scrollbar masquée, fondu de bord dynamique, snap optionnel — piloté par `--acd-scroll-gap` / `--acd-scroll-inset` / `--acd-scroll-fade` |
| `AcdSlider` (`acd-slider.ts`) | curseur réutilisable (luminosité, position, teinte) |
| `resolveImage` (`assets.ts`) | résout une clé d'illustration intégrée (`pendant`, `bulb`, `robot`, …) ou une URL passée telle quelle |
| `safeDefine` / `registerCard` / `registerBadge` | enregistrement idempotent des custom elements |

---

## Checklist — créer une nouvelle carte

1. Dossier `src/cards/<nom>/` avec `acd-<nom>-card.ts` + `acd-<nom>-card-editor.ts`.
2. La carte hérite de `AcdBaseCard<Config>` ; l'éditeur de `LitElement`.
3. `styles = [tokens, css\`...\`, densityStyles(dense, minimal)]` — toute
   couleur/radius/font-size/espacement en `var(--acd-*)`, en piochant dans
   les échelles ci-dessus plutôt qu'une valeur en dur.
4. États erreur/vide/chargement conformes aux exemples ci-dessus, bilingues
   via `this.t()`.
5. Interaction : `moreInfo()` sur clic, `fire()` pour un événement sortant.
6. `getGridOptions()` défini avec `min_columns` (et `max_rows` si pertinent).
   Densité : `densityStyles(dense, minimal)` avec les **deux** arguments
   renseignés, jamais un `minimal` vide.
7. Éditeur en `ha-form` + `SCHEMA` + `LABELS_FR`/`LABELS_EN`.
8. Enregistrement via `safeDefine` + `registerCard`, `declare global` pour
   `HTMLElementTagNameMap`.
9. Entrée ajoutée dans `src/entries/` selon le bundle cible (voir
   `src/entries/README.md`) et dans le tableau « Cartes disponibles » du
   `README.md`.

---

## Dérives connues

Constatées en auditant le code existant (2026-08-08), **non corrigées** —
scope volontairement limité à la documentation pour cette passe. À traiter
dans un futur passage explicite « aligner les cartes existantes sur le
design system ».

- **Deux rouges d'erreur concurrents** : `--acd-danger` (`#c26a5a`, tendances
  à la baisse) et `#b3261e` (rouge Material, codé en dur dans 8 cartes pour
  l'état `.error` et les icônes d'alerte). Ce ne sont pas la même sémantique
  (tendance vs. erreur bloquante), donc **pas un token unique** à cibler —
  mais `#b3261e` devrait devenir un token `--acd-error` explicite plutôt que
  rester une valeur en dur répétée 8 fois.
- **Deux verts de succès concurrents** : `--acd-success` (`#3e9e6b`) et
  `#4c9a5f` (codé en dur dans `stat-card`, `persons-card`, `acd-slider`,
  `assets.ts`). Contrairement au rouge, ceux-ci semblent être la même
  intention (succès/positif) avec une valeur qui a divergé — bon candidat
  pour une unification vers le token au prochain passage.
- **Couleurs de texte dupliquées en dur** : `#9a9c95` (= `--acd-text-secondary`)
  et `#1f211c` (= `--acd-text`) réécrits en toutes lettres dans plusieurs
  cartes au lieu du token.
- **Radius hors échelle** : 11 valeurs en dehors des 3 paliers canoniques
  (2px, 3px, 4px, 8px, 10px, 11px, 12px, 13px, 15px, 21px, 24px) — souvent
  des ajustements ponctuels d'un composant interne (badge, vignette).
- **Font-size hors échelle** : usage quasi continu entre 8.5px et 22px par
  pas de 0.5px, signe d'un réglage au pixel plutôt qu'une échelle partagée.
  Les 9 paliers ci-dessus couvrent les valeurs déjà les plus fréquentes ;
  les valeurs à mi-pas (`10.5px`, `11.5px`, `12.5px`, `13.5px`) sont les
  meilleures candidates de fusion vers le palier voisin.
- **Icon-size hors échelle** : même sprawl que les font-size (12 à 84px),
  les 5 paliers ci-dessus couvrent les usages fréquents mais pas les
  valeurs isolées (13px, 21px, etc.).

---

*Document maintenu manuellement — mettre à jour cette page en même temps que
`tokens.ts` si un token est ajouté, renommé ou retiré.*
