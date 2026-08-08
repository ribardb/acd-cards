/**
 * Entrée autonome de la carte Date & météo.
 *
 * Livrée comme ressource Lovelace séparée : les bundles déjà déployés
 * (acd-a, acd-b, extras…) n'ont pas à être régénérés pour ajouter la carte.
 */
import "./cards/datetime-card/acd-datetime-card";
import "./cards/datetime-card/acd-datetime-card-editor";

const VERSION = "0.17.0";

// eslint-disable-next-line no-console
console.info(
  `%c ACD-DATETIME %c v${VERSION} `,
  "background:#333d33;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:600",
  "background:#d5d8cf;color:#333d33;border-radius:0 4px 4px 0;padding:2px 6px;font-weight:600"
);
