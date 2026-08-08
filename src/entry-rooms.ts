/**
 * Bundle « rooms » : les cartes des pages de pièces et de domaine.
 * Autonome (sa propre copie de Lit), publié comme ressource distincte.
 */
import "./cards/page-header-card/acd-page-header-card";
import "./cards/page-header-card/acd-page-header-card-editor";
import "./cards/scenes-card/acd-scenes-card";
import "./cards/scenes-card/acd-scenes-card-editor";
import "./cards/devices-card/acd-devices-card";
import "./cards/devices-card/acd-devices-card-editor";
import "./cards/device-card/acd-device-card";
import "./cards/device-card/acd-device-card-editor";
import "./cards/room-summary-card/acd-room-summary-card";
import "./cards/room-summary-card/acd-room-summary-card-editor";

const VERSION = "0.21.0";

// eslint-disable-next-line no-console
console.info(
  `%c ACD-ROOMS %c v${VERSION} `,
  "background:#333d33;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:600",
  "background:#d5d8cf;color:#333d33;border-radius:0 4px 4px 0;padding:2px 6px;font-weight:600"
);
