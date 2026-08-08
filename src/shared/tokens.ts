import { css } from "lit";

/**
 * ACD design tokens — extracted from the reference design.
 * Every token can be overridden from a Home Assistant theme
 * (e.g. `acd-accent-color: "#333d33"`).
 *
 * Scales below (spacing/radius/motion/icon/font-size) are documented in
 * DESIGN-SYSTEM.md — they codify values already dominant across existing
 * cards. Adding them here does not change any existing card: nothing
 * consumes them yet, they're additive for new widgets to build on.
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
    --acd-radius-pill: var(--acd-card-radius-pill, 999px);
    --acd-pill: var(--acd-pill-color, #ffffff);
    --acd-track: var(--acd-track-color, rgba(31, 33, 28, 0.08));
    --acd-muted: var(--acd-muted-color, #a9b3a5);
    --acd-success: var(--acd-success-color, #3e9e6b);
    --acd-danger: var(--acd-danger-color, #c26a5a);
    --acd-live: var(--acd-live-color, #e05b5b);
    --acd-shadow: 0 1px 3px rgba(20, 24, 18, 0.05);
    --acd-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;

    /* Échelle d'espacement — grille de 2px, voir DESIGN-SYSTEM.md#spacing. */
    --acd-space-1: 2px;
    --acd-space-2: 4px;
    --acd-space-3: 6px;
    --acd-space-4: 8px;
    --acd-space-5: 10px;
    --acd-space-6: 12px;
    --acd-space-7: 14px;
    --acd-space-8: 16px;
    --acd-space-9: 20px;

    /* Échelle typographique — voir DESIGN-SYSTEM.md#typography. */
    --acd-font-3xs: 10px;
    --acd-font-2xs: 11px;
    --acd-font-xs: 12px;
    --acd-font-sm: 13px;
    --acd-font-md: 14px;
    --acd-font-lg: 16px;
    --acd-font-xl: 18px;
    --acd-font-2xl: 20px;
    --acd-font-3xl: 26px;

    /* Échelle d'icônes (--mdc-icon-size) — voir DESIGN-SYSTEM.md#icon-sizes. */
    --acd-icon-xs: 14px;
    --acd-icon-sm: 18px;
    --acd-icon-md: 20px;
    --acd-icon-lg: 26px;
    --acd-icon-hero: 72px;

    /* Durées de transition — voir DESIGN-SYSTEM.md#motion. */
    --acd-motion-fast: 150ms ease;
    --acd-motion: 180ms ease;
  }
`;
