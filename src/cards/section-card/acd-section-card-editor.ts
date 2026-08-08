import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdSectionCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "subtitle", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "link_text", selector: { text: {} } },
      { name: "link_path", selector: { navigation: {} } },
    ],
  },
  { name: "link_url", selector: { text: {} } },
  {
    name: "title_size",
    selector: { number: { min: 11, max: 28, step: 1, mode: "box" } },
  },
];

const LABELS_FR: Record<string, string> = {
  title: "Titre",
  subtitle: "Sous-titre (optionnel)",
  link_text: "Texte du lien (ex. « Tout gérer »)",
  link_path: "Vue cible du lien",
  link_url: "URL externe (prioritaire sur la vue)",
  title_size: "Taille du titre (px)",
};

const LABELS_EN: Record<string, string> = {
  title: "Title",
  subtitle: "Subtitle (optional)",
  link_text: 'Link text (e.g. "Manage all")',
  link_path: "Link target view",
  link_url: "External URL (takes precedence)",
  title_size: "Title size (px)",
};

export class AcdSectionCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdSectionCardConfig;

  public setConfig(config: AcdSectionCardConfig): void {
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
    const data = { title_size: 15, ...this._config };
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

safeDefine("acd-section-card-editor", AcdSectionCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-section-card-editor": AcdSectionCardEditor;
  }
}
