/**
 * Deployment entry A — "core" cards.
 *
 * Split exists because Home Assistant inline dashboard resources cap at
 * roughly 128 KB of source: the full bundle no longer fits in one. Each entry
 * carries its own copy of Lit, which is harmless (no shared module state is
 * required, and `safeDefine` guards against duplicate registration).
 *
 * Rule: a custom element must be defined by EXACTLY ONE entry, otherwise
 * whichever resource loads first wins and the other version is silently
 * ignored. `acd-rooms-card` therefore lives in `mobile.ts`, not here.
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

const VERSION = "0.15.0-core";

// eslint-disable-next-line no-console
console.info(
  `%c ACD-CARDS %c ${VERSION} `,
  "background:#333d33;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:600",
  "background:#d5d8cf;color:#333d33;border-radius:0 4px 4px 0;padding:2px 6px;font-weight:600"
);
