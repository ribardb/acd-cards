/**
 * Bundle « layout » : les cartes de structure jamais publiées jusqu'ici.
 * Autonome (sa propre copie de Lit), publié comme ressource distincte.
 */
import "./cards/header-card/acd-header-card";
import "./cards/header-card/acd-header-card-editor";
import "./cards/search-card/acd-search-card";
import "./cards/search-card/acd-search-card-editor";
import "./cards/section-card/acd-section-card";
import "./cards/section-card/acd-section-card-editor";
import "./cards/stats-row-card/acd-stats-row-card";
import "./cards/stats-row-card/acd-stats-row-card-editor";

const VERSION = "0.17.0";

// eslint-disable-next-line no-console
console.info(
  `%c ACD-LAYOUT %c v${VERSION} `,
  "background:#333d33;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:600",
  "background:#d5d8cf;color:#333d33;border-radius:0 4px 4px 0;padding:2px 6px;font-weight:600"
);
