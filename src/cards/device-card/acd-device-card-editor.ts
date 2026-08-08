import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdDeviceCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
  { name: "name", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "subtitle", selector: { text: {} } },
  { name: "footer", selector: { text: {} } },
  { name: "show_toggle", selector: { boolean: {} } },
  { name: "show_bar", selector: { boolean: {} } },
  { name: "show_footer", selector: { boolean: {} } },
  { name: "compact", selector: { boolean: {} } },
];

const LABELS_FR: Record<string, string> = {
  entity: "Entité",
  name: "Nom (optionnel)",
  icon: "Icône (optionnelle)",
  subtitle: "Sous-titre (défaut : état)",
  footer: "Pied de tuile (optionnel)",
  show_toggle: "Interrupteur",
  show_bar: "Barre de niveau",
  show_footer: "Ligne de pied",
  compact: "Affichage compact",
};

const LABELS_EN: Record<string, string> = {
  entity: "Entity",
  name: "Name (optional)",
  icon: "Icon (optional)",
  subtitle: "Subtitle (default: state)",
  footer: "Footer (optional)",
  show_toggle: "Toggle",
  show_bar: "Level bar",
  show_footer: "Footer line",
  compact: "Compact layout",
};

export class AcdDeviceCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdDeviceCardConfig;

  public setConfig(config: AcdDeviceCardConfig): void {
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
    const data = { ...{ show_toggle: true, show_bar: true, show_footer: true }, ...this._config };
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

safeDefine("acd-device-card-editor", AcdDeviceCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-device-card-editor": AcdDeviceCardEditor;
  }
}
