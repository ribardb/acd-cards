import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdStatsRowCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "entities", selector: { entity: { multiple: true } } },
  { name: "title", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "link_text", selector: { text: {} } },
      { name: "link_path", selector: { navigation: {} } },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "tile_width",
        selector: { number: { min: 90, max: 280, step: 2, mode: "box" } },
      },
      {
        name: "decimals",
        selector: { number: { min: 0, max: 3, step: 1, mode: "box" } },
      },
      {
        name: "graph_hours",
        selector: { number: { min: 1, max: 720, step: 1, mode: "box" } },
      },
      { name: "trend_label", selector: { text: {} } },
      { name: "show_trend", selector: { boolean: {} } },
      { name: "snap", selector: { boolean: {} } },
    ],
  },
];

const LABELS_FR: Record<string, string> = {
  entities: "Entités (ordre conservé)",
  title: "Titre de section (optionnel)",
  link_text: "Texte du lien (ex. « Voir tout »)",
  link_path: "Vue cible du lien",
  tile_width: "Largeur des tuiles (px)",
  decimals: "Décimales",
  graph_hours: "Fenêtre de comparaison (h ; 168 = 1 semaine)",
  trend_label: "Libellé de tendance (défaut selon la fenêtre)",
  show_trend: "Tendance vs période précédente",
  snap: "Alignement au relâchement (snap)",
};

const LABELS_EN: Record<string, string> = {
  entities: "Entities (order preserved)",
  title: "Section title (optional)",
  link_text: 'Link text (e.g. "See all")',
  link_path: "Link target view",
  tile_width: "Tile width (px)",
  decimals: "Decimals",
  graph_hours: "Comparison window (h; 168 = 1 week)",
  trend_label: "Trend label (default from window)",
  show_trend: "Trend vs previous period",
  snap: "Snap on release",
};

export class AcdStatsRowCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdStatsRowCardConfig;

  public setConfig(config: AcdStatsRowCardConfig): void {
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
    // Per-entity overrides stay YAML-only; the visual editor keeps the
    // simple string form so it never destroys a hand-written object.
    const data = {
      show_trend: true,
      graph_hours: 168,
      tile_width: 132,
      decimals: 1,
      ...this._config,
      entities: (this._config.entities ?? []).map((e) =>
        typeof e === "string" ? e : e.entity
      ),
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

safeDefine("acd-stats-row-card-editor", AcdStatsRowCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-stats-row-card-editor": AcdStatsRowCardEditor;
  }
}
