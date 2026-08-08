import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdScenesCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "area", selector: { area: {} } },
  { name: "entities", selector: { entity: { domain: "scene", multiple: true } } },
  { name: "highlight_last", selector: { boolean: {} } },
  { name: "show_add_button", selector: { boolean: {} } },
  { name: "snap", selector: { boolean: {} } },
];

const LABELS_FR: Record<string, string> = {
  area: "Pièce",
  entities: "Scènes (prioritaire sur la pièce)",
  highlight_last: "Mettre en avant la dernière scène",
  show_add_button: "Bouton « Nouvelle scène »",
  snap: "Alignement au relâchement",
};

const LABELS_EN: Record<string, string> = {
  area: "Area",
  entities: "Scenes (overrides area)",
  highlight_last: "Highlight last scene",
  show_add_button: "\"New scene\" button",
  snap: "Snap on release",
};

export class AcdScenesCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdScenesCardConfig;

  public setConfig(config: AcdScenesCardConfig): void {
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
    const data = { ...{ highlight_last: true, show_add_button: false, snap: false }, ...this._config };
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

safeDefine("acd-scenes-card-editor", AcdScenesCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-scenes-card-editor": AcdScenesCardEditor;
  }
}
