import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdRoomSummaryCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "area", selector: { area: {} } },
  { name: "title", selector: { text: {} } },
  { name: "entities", selector: { entity: { multiple: true } } },
  { name: "exclude", selector: { entity: { multiple: true } } },
  { name: "add_path", selector: { navigation: {} } },
  { name: "show_counts", selector: { boolean: {} } },
  { name: "show_master", selector: { boolean: {} } },
  { name: "show_add_button", selector: { boolean: {} } },
];

const LABELS_FR: Record<string, string> = {
  area: "Pièce",
  title: "Titre (défaut : nom de la pièce)",
  entities: "Entités (prioritaire sur la pièce)",
  exclude: "Entités à masquer",
  add_path: "Cible du bouton d'ajout",
  show_counts: "Compteurs par état",
  show_master: "Bloc « Tout éteindre »",
  show_add_button: "Bouton d'ajout",
};

const LABELS_EN: Record<string, string> = {
  area: "Area",
  title: "Title (default: area name)",
  entities: "Entities (overrides area)",
  exclude: "Hidden entities",
  add_path: "Add button target",
  show_counts: "Counts by state",
  show_master: "\"Turn everything off\" block",
  show_add_button: "Add button",
};

export class AcdRoomSummaryCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdRoomSummaryCardConfig;

  public setConfig(config: AcdRoomSummaryCardConfig): void {
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
    const data = { ...{ show_counts: true, show_master: true, show_add_button: true }, ...this._config };
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

safeDefine("acd-room-summary-card-editor", AcdRoomSummaryCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-room-summary-card-editor": AcdRoomSummaryCardEditor;
  }
}
