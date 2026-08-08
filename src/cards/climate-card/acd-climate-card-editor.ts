import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdClimateCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: { domain: "climate" } } },
  { name: "name", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "min",
        selector: { number: { min: 0, max: 40, step: 0.5, mode: "box" } },
      },
      {
        name: "max",
        selector: { number: { min: 0, max: 40, step: 0.5, mode: "box" } },
      },
      {
        name: "step",
        selector: { number: { min: 0.1, max: 5, step: 0.1, mode: "box" } },
      },
      { name: "unit", selector: { text: {} } },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_toggle", selector: { boolean: {} } },
      { name: "show_modes", selector: { boolean: {} } },
      { name: "show_current", selector: { boolean: {} } },
      { name: "compact", selector: { boolean: {} } },
    ],
  },
];

const LABELS_FR: Record<string, string> = {
  entity: "Entité",
  name: "Nom (optionnel)",
  min: "Temp. min (optionnel)",
  max: "Temp. max (optionnel)",
  step: "Pas (optionnel)",
  unit: "Unité (défaut °C)",
  show_toggle: "Interrupteur",
  show_modes: "Mode (pied de carte)",
  show_current: "Température actuelle",
  compact: "Affichage compact",
};

const LABELS_EN: Record<string, string> = {
  entity: "Entity",
  name: "Name (optional)",
  min: "Min temp (optional)",
  max: "Max temp (optional)",
  step: "Step (optional)",
  unit: "Unit (default °C)",
  show_toggle: "Toggle",
  show_modes: "Mode (footer)",
  show_current: "Current temperature",
  compact: "Compact layout",
};

export class AcdClimateCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdClimateCardConfig;

  public setConfig(config: AcdClimateCardConfig): void {
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
      show_toggle: true,
      show_modes: true,
      show_current: true,
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

safeDefine("acd-climate-card-editor", AcdClimateCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-climate-card-editor": AcdClimateCardEditor;
  }
}
