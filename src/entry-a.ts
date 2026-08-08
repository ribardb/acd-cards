/**
 * Bundle A de la collection ACD : contrôles d'appareils.
 * Chaque bundle est autonome (sa propre copie de Lit) pour pouvoir être
 * publié comme une ressource de dashboard indépendante.
 */
import "./cards/light-card/acd-light-card";
import "./cards/light-card/acd-light-card-editor";
import "./cards/cover-card/acd-cover-card";
import "./cards/cover-card/acd-cover-card-editor";
import "./cards/climate-card/acd-climate-card";
import "./cards/climate-card/acd-climate-card-editor";
import "./cards/persons-card/acd-persons-card";
import "./cards/persons-card/acd-persons-card-editor";
import "./badges/acd-person-badge";
import "./badges/acd-person-badge-editor";

const VERSION = "0.18.0";

// eslint-disable-next-line no-console
console.info(
  `%c ACD-CARDS A %c v${VERSION} `,
  "background:#333d33;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:600",
  "background:#d5d8cf;color:#333d33;border-radius:0 4px 4px 0;padding:2px 6px;font-weight:600"
);
