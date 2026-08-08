import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdLightCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: { domain: "light" } } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "name", selector: { text: {} } },
      { name: "icon", selector: { icon: {} }, context: { icon_entity: "entity" } },
    ],
  },
  { name: "image", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "image_position",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "top", label: "Haut (suspendu)" },
              { value: "center", label: "Centre" },
              { value: "bottom", label: "Bas (posé)" },
            ],
          },
        },
      },
      {
        name: "image_size",
        selector: {
          number: { min: 20, max: 100, step: 5, mode: "box" },
        },
      },
      {
        name: "image_offset",
        selector: {
          number: { min: -80, max: 80, step: 2, mode: "box" },
        },
      },
    ],
  },
  {
    name: "info_dialog",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "custom", label: "Modale ACD (custom)" },
          { value: "native", label: "More-info natif HA" },
        ],
      },
    },
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_toggle", selector: { boolean: {} } },
      { name: "show_brightness", selector: { boolean: {} } },
      { name: "show_color_controls", selector: { boolean: {} } },
      { name: "show_state", selector: { boolean: {} } },
      { name: "compact", selector: { boolean: {} } },
    ],
  },
  {
    name: "entities",
    selector: { entity: { domain: "light", multiple: true } },
  },
];

const LABELS_FR: Record<string, string> = {
  entity: "Entité",
  name: "Nom (optionnel)",
  icon: "Icône (optionnelle)",
  image:
    "Image (opt. : pendant, floor-lamp, desk-lamp, spot, bulb ou URL)",
  image_position: "Position de l'image",
  image_size: "Taille de l'image (%)",
  image_offset: "Décalage vertical (px)",
  info_dialog: "Fenêtre au clic (titre / visuel)",
  show_toggle: "Interrupteur",
  show_brightness: "Luminosité",
  show_color_controls: "Couleur / température",
  show_state: "État",
  compact: "Affichage compact",
  entities: "Lumières supplémentaires (carrousel ‹ ›)",
};

const LABELS_EN: Record<string, string> = {
  entity: "Entity",
  name: "Name (optional)",
  icon: "Icon (optional)",
  image: "Image (opt.: pendant, floor-lamp, desk-lamp, spot, bulb or URL)",
  image_position: "Image position",
  image_size: "Image size (%)",
  image_offset: "Vertical offset (px)",
  info_dialog: "Dialog on tap (title / visual)",
  show_toggle: "Toggle",
  show_brightness: "Brightness",
  show_color_controls: "Color / temperature",
  show_state: "State",
  compact: "Compact layout",
  entities: "Extra lights (‹ › carousel)",
};

export class AcdLightCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdLightCardConfig;

  public setConfig(config: AcdLightCardConfig): void {
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
    // Keep the YAML clean: drop empty optional values.
    for (const key of Object.keys(config)) {
      if (config[key] === "" || config[key] == null) delete config[key];
    }
    if (Array.isArray(config.entities) && config.entities.length === 0) {
      delete config.entities;
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
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

safeDefine("acd-light-card-editor", AcdLightCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-light-card-editor": AcdLightCardEditor;
  }
}
