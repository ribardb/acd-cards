import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdChartCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  {
    name: "entity",
    required: true,
    selector: { entity: { domain: ["sensor", "counter", "input_number"] } },
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "title", selector: { text: {} } },
      { name: "unit", selector: { text: {} } },
      {
        name: "stat_type",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "sum", label: "Cumul par période (énergie, conso)" },
              { value: "mean", label: "Moyenne (température, humidité)" },
              { value: "max", label: "Maximum" },
              { value: "min", label: "Minimum" },
            ],
          },
        },
      },
      {
        name: "default_period",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "week", label: "Semaine / Week" },
              { value: "month", label: "Mois / Month" },
              { value: "year", label: "Année / Year" },
            ],
          },
        },
      },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "decimals",
        selector: { number: { min: 0, max: 3, step: 1, mode: "box" } },
      },
      {
        name: "height",
        selector: { number: { min: 90, max: 400, step: 10, mode: "box" } },
      },
      {
        name: "bar_radius",
        selector: { number: { min: 0, max: 24, step: 1, mode: "box" } },
      },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_selector", selector: { boolean: {} } },
      { name: "show_axis", selector: { boolean: {} } },
      { name: "highlight_max", selector: { boolean: {} } },
    ],
  },
];

const LABELS_FR: Record<string, string> = {
  entity: "Entité",
  title: "Titre (optionnel)",
  unit: "Unité (optionnelle)",
  stat_type: "Type de calcul",
  default_period: "Période par défaut",
  decimals: "Décimales",
  height: "Hauteur du graphique (px)",
  bar_radius: "Arrondi des barres (px)",
  show_selector: "Sélecteur de période",
  show_axis: "Axes et grille",
  highlight_max: "Mettre en avant la valeur max",
};

const LABELS_EN: Record<string, string> = {
  entity: "Entity",
  title: "Title (optional)",
  unit: "Unit (optional)",
  stat_type: "Calculation",
  default_period: "Default period",
  decimals: "Decimals",
  height: "Chart height (px)",
  bar_radius: "Bar radius (px)",
  show_selector: "Period selector",
  show_axis: "Axes and grid",
  highlight_max: "Highlight the max value",
};

export class AcdChartCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdChartCardConfig;

  public setConfig(config: AcdChartCardConfig): void {
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
      stat_type: "sum",
      default_period: "week",
      show_selector: true,
      show_axis: true,
      highlight_max: true,
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

safeDefine("acd-chart-card-editor", AcdChartCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-chart-card-editor": AcdChartCardEditor;
  }
}
