import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../shared/register";
import type { AcdPersonBadgeConfig, HomeAssistant } from "../types";

const SCHEMA = [
  {
    name: "entity",
    required: true,
    selector: { entity: { domain: "person" } },
  },
  { name: "name", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_name", selector: { boolean: {} } },
      { name: "show_state", selector: { boolean: {} } },
    ],
  },
];

const LABELS_FR: Record<string, string> = {
  entity: "Personne",
  name: "Libellé (défaut : prénom)",
  show_name: "Nom",
  show_state: "Statut (À la maison / Absent)",
};

const LABELS_EN: Record<string, string> = {
  entity: "Person",
  name: "Label (default: first name)",
  show_name: "Name",
  show_state: "Status (Home / Away)",
};

export class AcdPersonBadgeEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdPersonBadgeConfig;

  public setConfig(config: AcdPersonBadgeConfig): void {
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
    const data = { show_name: true, show_state: false, ...this._config };
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

safeDefine("acd-person-badge-editor", AcdPersonBadgeEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-person-badge-editor": AcdPersonBadgeEditor;
  }
}
