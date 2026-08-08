/**
 * Deployment entry B — mobile dashboard cards.
 *
 * See `core.ts` for why the bundle is split. Every element below is defined
 * ONLY here; nothing in this list may also appear in `core.ts`.
 *
 * `acd-sidebar-card` is here because the tab bar mode is what the mobile
 * dashboard needs, and `acd-rooms-card` is here because its horizontal
 * layout depends on `scroll-row` / `width-controller`, shipped alongside.
 */
import "../cards/rooms-card/acd-rooms-card";
import "../cards/rooms-card/acd-rooms-card-editor";
import "../cards/header-card/acd-header-card";
import "../cards/header-card/acd-header-card-editor";
import "../cards/search-card/acd-search-card";
import "../cards/search-card/acd-search-card-editor";
import "../cards/camera-card/acd-camera-card";
import "../cards/camera-card/acd-camera-card-editor";
import "../cards/section-card/acd-section-card";
import "../cards/section-card/acd-section-card-editor";
import "../cards/stats-row-card/acd-stats-row-card";
import "../cards/stats-row-card/acd-stats-row-card-editor";
import "../cards/sidebar-card/acd-sidebar-card";
import "../cards/sidebar-card/acd-sidebar-card-editor";
import "../badges/acd-person-badge";
import "../badges/acd-person-badge-editor";

const VERSION = "0.15.0-mobile";

// eslint-disable-next-line no-console
console.info(
  `%c ACD-CARDS %c ${VERSION} `,
  "background:#333d33;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:600",
  "background:#d5d8cf;color:#333d33;border-radius:0 4px 4px 0;padding:2px 6px;font-weight:600"
);
