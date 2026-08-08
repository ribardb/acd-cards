/**
 * Second bundle of the collection: cards added after v0.13.
 * Shipped as its own dashboard resource so the main bundle stays small
 * enough to be updated independently.
 */
import "./cards/chart-card/acd-chart-card";
import "./cards/chart-card/acd-chart-card-editor";
import "./cards/vacuum-card/acd-vacuum-card";
import "./cards/vacuum-card/acd-vacuum-card-editor";

const VERSION = "0.16.0";

// eslint-disable-next-line no-console
console.info(
  `%c ACD-CARDS+ %c v${VERSION} `,
  "background:#333d33;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:600",
  "background:#d5d8cf;color:#333d33;border-radius:0 4px 4px 0;padding:2px 6px;font-weight:600"
);
