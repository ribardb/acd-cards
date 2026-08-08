import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdDevicesCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "area", selector: { area: {} } },
  { name: "title", selector: { text: {} } },
  { name: "entities", selector: { entity: { multiple: true } } },
  { name: "domains", selector: { select: { multiple: true, custom_value: true, options: ["light","cover","climate","media_player","switch","fan","vacuum","lock","humidifier","camera"] } } },
  { name: "exclude", selector: { entity: { multiple: true } } },
  { name: "priority", selector: { entity: { multiple: true } } },
  { name: "min_tile_width", selector: { number: { min: 120, max: 400, step: 10, mode: "box" } } },
  { name: "show_header", selector: { boolean: {} } },
  { name: "show_filters", selector: { boolean: {} } },
  { name: "show_count", selector: { boolean: {} } },
  { name: "show_add_button", selector: { boolean: {} } },
];

const LABELS_FR: Record<string, string> = {
  area: "Pièce",
  title: "Titre (défaut : Appareils)",
  entities: "Entités (prioritaire sur la pièce)",
  domains: "Domaines retenus",
  exclude: "Entités à masquer",
  priority: "Entités mises en tête",
  min_tile_width: "Largeur mini des tuiles (px)",
  show_header: "En-tête",
  show_filters: "Onglets de filtre",
  show_count: "Compteur",
  show_add_button: "Bouton « Ajouter un appareil »",
};

const LABELS_EN: Record<string, string> = {
  area: "Area",
  title: "Title (default: Devices)",
  entities: "Entities (overrides area)",
  domains: "Kept domains",
  exclude: "Hidden entities",
  priority: "Pinned entities",
  min_tile_width: "Min tile width (px)",
  show_header: "Header",
  show_filters: "Filter tabs",
  show_count: "Count",
  show_add_button: "\"Add a device\" button",
};

export class AcdDevicesCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdDevicesCardConfig;

  public setConfig(config: AcdDevicesCardConfig): void {
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
      const value = config[key];
      if (value === "" || value == null) delete config[key];
      if (Array.isArray(value) && value.length === 0) delete config[key];
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
    const data = { ...{ show_header: true, show_filters: true, show_count: true, min_tile_width: 190 }, ...this._config };
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

safeDefine("acd-devices-card-editor", AcdDevicesCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-devices-card-editor": AcdDevicesCardEditor;
  }
}
