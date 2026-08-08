import { unsafeCSS, type CSSResult } from "lit";

/**
 * Densité responsive des cartes.
 *
 * C'est la largeur de la CARTE qui décide, pas celle de l'écran : chaque
 * carte se déclare conteneur (`container-type: inline-size`), si bien qu'une
 * colonne étroite sur grand écran se densifie comme sur téléphone.
 *
 * Deux paliers : « dense » resserre marges, polices et visuels ; « minimal »
 * retire les visuels décoratifs et les informations secondaires pour ne
 * garder que le nom, l'état et la commande principale.
 *
 * L'option `density` d'une carte force un palier — le pilotage se fait par
 * l'attribut `data-density` posé sur l'hôte par AcdBaseCard. En mode "auto"
 * (défaut) l'attribut est absent, ce qui active les container queries ;
 * `full` le pose sans règle associée et désactive donc toute adaptation.
 */
export const DENSE_MAX = 360;
export const MINIMAL_MAX = 240;

/** Préfixe chaque règle d'un bloc CSS par un sélecteur d'hôte. */
function scope(rules: string, host: string): string {
  return rules.replace(
    /([^{}]+)\{([^{}]*)\}/g,
    (_match, selectors: string, body: string) =>
      selectors
        .split(",")
        .map((part) => `${host} ${part.trim()}`)
        .join(",") + `{${body}}`
  );
}

/**
 * Construit le bloc de styles responsive d'une carte.
 * `dense` et `minimal` sont des suites de règles CSS brutes ciblant des
 * descendants du shadow root (`.body{...}.name{...}`).
 */
export function densityStyles(dense: string, minimal = ""): CSSResult {
  const both = dense + minimal;
  return unsafeCSS(
    // Le conteneur n'existe qu'en mode auto : une surcharge explicite doit
    // neutraliser les paliers automatiques.
    ":host(:not([data-density])){container-type:inline-size}" +
      `@container (max-width:${DENSE_MAX}px){${dense}}` +
      `@container (max-width:${MINIMAL_MAX}px){${both}}` +
      scope(dense, ':host([data-density="dense"])') +
      scope(both, ':host([data-density="minimal"])')
  );
}
