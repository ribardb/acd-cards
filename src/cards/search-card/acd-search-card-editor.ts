import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdSearchCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "placeholder", selector: { text: {} } },
  { name: "navigation_path", selector: { text: {} } },
  {
    name: "domains",
    selector: {
      select: {
        multiple: true,
        custom_value: true,
        options: [
          "light",
          "switch",
          "cover",
          "climate",
          "sensor",
          "binary_sensor",
          "media_player",
          "camera",
          "fan",
          "lock",
          "scene",
          "script",
          "vacuum",
        ],
      },
    },
  },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "max_results",
        selector: { number: { min: 3, max: 30, step: 1, mode: "box" } },
      },
      { name: "include_areas", selector: { boolean: {} } },
      { name: "include_entities", selector: { boolean: {} } },
    ],
  },
];

const LABELS_FR: Record<string, string> = {
  placeholder: "Texte d'invite",
  navigation_path:
    "Navigation pièce (défaut : vue {slug} du dashboard courant ; {area}/{slug})",
  domains: "Domaines d'entités (toutes par défaut)",
  max_results: "Nombre de résultats",
  include_areas: "Chercher les pièces",
  include_entities: "Chercher les appareils",
};

const LABELS_EN: Record<string, string> = {
  placeholder: "Placeholder text",
  navigation_path:
    "Room navigation (default: {slug} view of current dashboard; {area}/{slug})",
  domains: "Entity domains (all by default)",
  max_results: "Result count",
  include_areas: "Search rooms",
  include_entities: "Search devices",
};

export class AcdSearchCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdSearchCardConfig;

  public setConfig(config: AcdSearchCardConfig): void {
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
    if (Array.isArray(config.domains) && config.domains.length === 0) {
      delete config.domains;
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
      include_areas: true,
      include_entities: true,
      max_results: 8,
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

safeDefine("acd-search-card-editor", AcdSearchCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-search-card-editor": AcdSearchCardEditor;
  }
}
