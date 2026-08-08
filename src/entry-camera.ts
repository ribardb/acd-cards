/**
 * Camera bundle, shipped as its own dashboard resource.
 * Kept apart from the others so the streaming card can be updated
 * without touching the rest of the collection.
 */
import "./cards/camera-card/acd-camera-card";
import "./cards/camera-card/acd-camera-card-editor";

const VERSION = "0.16.0";

// eslint-disable-next-line no-console
console.info(
  `%c ACD-CAMERA %c v${VERSION} `,
  "background:#333d33;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:600",
  "background:#d5d8cf;color:#333d33;border-radius:0 4px 4px 0;padding:2px 6px;font-weight:600"
);
