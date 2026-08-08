import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdPageHeaderCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "area", selector: { area: {} } },
  { name: "title", selector: { text: {} } },
  { name: "subtitle", selector: { text: {} } },
  { name: "parent_text", selector: { text: {} } },
  { name: "parent_path", selector: { navigation: {} } },
  { name: "back_path", selector: { navigation: {} } },
  { name: "show_back", selector: { boolean: {} } },
  { name: "show_breadcrumb", selector: { boolean: {} } },
];

const LABELS_FR: Record<string, string> = {
  area: "Pièce (titre automatique)",
  title: "Titre (prioritaire)",
  subtitle: "Sous-titre",
  parent_text: "Libellé parent (défaut : Accueil)",
  parent_path: "Vue parente",
  back_path: "Cible du retour (vide = historique)",
  show_back: "Bouton retour",
  show_breadcrumb: "Fil d'ariane",
};

const LABELS_EN: Record<string, string> = {
  area: "Area (automatic title)",
  title: "Title (takes precedence)",
  subtitle: "Subtitle",
  parent_text: "Parent label (default: Home)",
  parent_path: "Parent view",
  back_path: "Back target (empty = history)",
  show_back: "Back button",
  show_breadcrumb: "Breadcrumb",
};

export class AcdPageHeaderCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdPageHeaderCardConfig;

  public setConfig(config: AcdPageHeaderCardConfig): void {
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
    const data = { ...{ show_back: true, show_breadcrumb: true }, ...this._config };
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

safeDefine("acd-page-header-card-editor", AcdPageHeaderCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-page-header-card-editor": AcdPageHeaderCardEditor;
  }
}
