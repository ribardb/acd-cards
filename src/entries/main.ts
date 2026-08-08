/**
 * Deployment entry — "main" bundle.
 *
 * Covers every card EXCEPT the ones already shipped as their own Home
 * Assistant inline resources (`acd-camera-card`, `acd-chart-card`,
 * `acd-vacuum-card`). A custom element must be defined by exactly one
 * resource: whichever loads first wins, and the others are silently ignored.
 *
 * Inline dashboard resources cap at roughly 128 KB of source, which is why
 * the deployment is split at all.
 */
import "../cards/light-card/acd-light-card";
import "../cards/light-card/acd-light-card-editor";
import "../cards/cover-card/acd-cover-card";
import "../cards/cover-card/acd-cover-card-editor";
import "../cards/stat-card/acd-stat-card";
import "../cards/stat-card/acd-stat-card-editor";
import "../cards/climate-card/acd-climate-card";
import "../cards/climate-card/acd-climate-card-editor";
import "../cards/persons-card/acd-persons-card";
import "../cards/persons-card/acd-persons-card-editor";
import "../cards/rooms-card/acd-rooms-card";
import "../cards/rooms-card/acd-rooms-card-editor";
import "../cards/sidebar-card/acd-sidebar-card";
import "../cards/sidebar-card/acd-sidebar-card-editor";
import "../cards/header-card/acd-header-card";
import "../cards/header-card/acd-header-card-editor";
import "../cards/search-card/acd-search-card";
import "../cards/search-card/acd-search-card-editor";
import "../cards/section-card/acd-section-card";
import "../cards/section-card/acd-section-card-editor";
import "../cards/stats-row-card/acd-stats-row-card";
import "../cards/stats-row-card/acd-stats-row-card-editor";
import "../badges/acd-person-badge";
import "../badges/acd-person-badge-editor";

const VERSION = "0.16.0-main";

// eslint-disable-next-line no-console
console.info(
  `%c ACD-CARDS %c ${VERSION} `,
  "background:#333d33;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:600",
  "background:#d5d8cf;color:#333d33;border-radius:0 4px 4px 0;padding:2px 6px;font-weight:600"
);
