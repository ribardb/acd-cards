/**
 * Bundle B de la collection ACD : structure du tableau de bord.
 * Autonome, publié comme une ressource de dashboard distincte.
 */
import "./cards/rooms-card/acd-rooms-card";
import "./cards/rooms-card/acd-rooms-card-editor";
import "./cards/stat-card/acd-stat-card";
import "./cards/stat-card/acd-stat-card-editor";
import "./cards/stats-row-card/acd-stats-row-card";
import "./cards/stats-row-card/acd-stats-row-card-editor";
import "./cards/section-card/acd-section-card";
import "./cards/section-card/acd-section-card-editor";
import "./cards/sidebar-card/acd-sidebar-card";
import "./cards/sidebar-card/acd-sidebar-card-editor";
import "./cards/header-card/acd-header-card";
import "./cards/header-card/acd-header-card-editor";
import "./cards/search-card/acd-search-card";
import "./cards/search-card/acd-search-card-editor";

const VERSION = "0.17.0";

// eslint-disable-next-line no-console
console.info(
  `%c ACD-CARDS B %c v${VERSION} `,
  "background:#333d33;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:600",
  "background:#d5d8cf;color:#333d33;border-radius:0 4px 4px 0;padding:2px 6px;font-weight:600"
);
