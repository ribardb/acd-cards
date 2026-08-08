import { css } from "lit";

/**
 * ACD design tokens — extracted from the reference design.
 * Every token can be overridden from a Home Assistant theme
 * (e.g. `acd-accent-color: "#333d33"`).
 */
export const tokens = css`
  :host {
    /* Palette figée sur la maquette — indépendante du thème HA actif.
       Chaque valeur reste surchargeable via les variables --acd-*. */
    --acd-bg: var(--acd-card-background, #fcfcfa);
    --acd-bg-active: var(--acd-card-background-active, #d5d8cc);
    --acd-accent: var(--acd-accent-color, #333a2d);
    --acd-on-accent: var(--acd-on-accent-color, #ffffff);
    --acd-text: var(--acd-text-color, #1f211c);
    --acd-text-secondary: var(--acd-text-secondary-color, #9a9c95);
    --acd-border: var(--acd-border-color, #ebeae5);
    --acd-radius: var(--acd-card-radius, 20px);
    --acd-radius-inner: var(--acd-card-radius-inner, 14px);
    --acd-pill: var(--acd-pill-color, #ffffff);
    --acd-track: var(--acd-track-color, rgba(31, 33, 28, 0.08));
    --acd-muted: var(--acd-muted-color, #a9b3a5);
    --acd-success: var(--acd-success-color, #3e9e6b);
    --acd-danger: var(--acd-danger-color, #c26a5a);
    --acd-live: var(--acd-live-color, #e05b5b);
    --acd-shadow: 0 1px 3px rgba(20, 24, 18, 0.05);
    --acd-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
  }
`;
