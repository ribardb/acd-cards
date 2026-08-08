import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdCameraCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "entity", selector: { entity: { domain: "camera" } } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "name", selector: { text: {} } },
      { name: "area", selector: { text: {} } },
    ],
  },
  { name: "caption", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "live_text", selector: { text: {} } },
      { name: "aspect_ratio", selector: { text: {} } },
      {
        name: "height",
        selector: { number: { min: 80, max: 500, step: 4, mode: "box" } },
      },
      {
        name: "refresh_interval",
        selector: { number: { min: 2, max: 120, step: 1, mode: "box" } },
      },
      { name: "stream", selector: { boolean: {} } },
      { name: "show_live_badge", selector: { boolean: {} } },
      { name: "show_caption", selector: { boolean: {} } },
    ],
  },
  { name: "image", selector: { text: {} } },
];

const LABELS_FR: Record<string, string> = {
  entity: "Caméra",
  name: "Nom (défaut : nom de l'entité)",
  area: "Pièce (défaut : pièce de l'entité)",
  caption: "Légende complète (remplace pièce · nom)",
  live_text: "Texte du badge (défaut « Live »)",
  aspect_ratio: "Format (ex. 16/9)",
  height: "Hauteur fixe (px, remplace le format)",
  refresh_interval: "Rafraîchissement de l'aperçu (s)",
  stream: "Flux vidéo au lieu de l'aperçu",
  show_live_badge: "Badge « Live »",
  show_caption: "Légende",
  image: "Image statique (URL, remplace la caméra)",
};

const LABELS_EN: Record<string, string> = {
  entity: "Camera",
  name: "Name (default: entity name)",
  area: "Room (default: entity area)",
  caption: "Full caption (replaces room · name)",
  live_text: 'Badge text (default "Live")',
  aspect_ratio: "Aspect ratio (e.g. 16/9)",
  height: "Fixed height (px, overrides ratio)",
  refresh_interval: "Snapshot refresh (s)",
  stream: "Video stream instead of snapshot",
  show_live_badge: '"Live" badge',
  show_caption: "Caption",
  image: "Static image (URL, replaces the camera)",
};

export class AcdCameraCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdCameraCardConfig;

  public setConfig(config: AcdCameraCardConfig): void {
    this._config = config;
  }

  private _computeLabel = (schema: { name: string }): string => {
    const labels = this.hass?.language?.startsWith("fr")
      ? LABELS_FR
      : LABELS_EN;
    return labels[schema.name] ?? schema.name;
  };

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const config = { ...ev.detail.value };
    for (const key of Object.keys(config)) {
      if (config[key] === "" || config[key] == null) delete config[key];
    }
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected override render() {
    if (!this.hass || !this._config) return nothing;
    const data = {
      show_live_badge: true,
      show_caption: true,
      aspect_ratio: "16/9",
      refresh_interval: 10,
      stream: false,
      ...this._config,
    };
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

safeDefine("acd-camera-card-editor", AcdCameraCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-camera-card-editor": AcdCameraCardEditor;
  }
}
