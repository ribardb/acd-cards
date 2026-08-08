import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdStatCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "name", selector: { text: {} } },
      {
        name: "icon",
        selector: { icon: {} },
        context: { icon_entity: "entity" },
      },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "unit", selector: { text: {} } },
      {
        name: "decimals",
        selector: { number: { min: 0, max: 3, step: 1, mode: "box" } },
      },
      {
        name: "value_size",
        selector: { number: { min: 14, max: 64, step: 1, mode: "box" } },
      },
      {
        name: "graph_hours",
        selector: { number: { min: 1, max: 168, step: 1, mode: "box" } },
      },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_icon", selector: { boolean: {} } },
      { name: "show_graph", selector: { boolean: {} } },
      { name: "show_trend", selector: { boolean: {} } },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "state_on", selector: { text: {} } },
      { name: "state_off", selector: { text: {} } },
    ],
  },
];

const LABELS_FR: Record<string, string> = {
  entity: "Entité",
  name: "Nom (optionnel)",
  icon: "Icône (optionnelle)",
  unit: "Unité (optionnelle)",
  decimals: "Décimales",
  value_size: "Taille de la valeur (px)",
  graph_hours: "Fenêtre (heures)",
  show_icon: "Icône",
  show_graph: "Mini-graphique",
  show_trend: "Tendance ↑↓",
  state_on: "Texte état actif (binaire)",
  state_off: "Texte état inactif (binaire)",
};

const LABELS_EN: Record<string, string> = {
  entity: "Entity",
  name: "Name (optional)",
  icon: "Icon (optional)",
  unit: "Unit (optional)",
  decimals: "Decimals",
  value_size: "Value size (px)",
  graph_hours: "Window (hours)",
  show_icon: "Icon",
  show_graph: "Sparkline",
  show_trend: "Trend ↑↓",
  state_on: "On text (binary)",
  state_off: "Off text (binary)",
};

export class AcdStatCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdStatCardConfig;

  public setConfig(config: AcdStatCardConfig): void {
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

safeDefine("acd-stat-card-editor", AcdStatCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-stat-card-editor": AcdStatCardEditor;
  }
}
