import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdFanCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  {
    name: "entity",
    required: true,
    selector: { entity: { domain: "fan" } },
  },
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
      {
        name: "levels",
        selector: { number: { min: 2, max: 10, step: 1, mode: "box" } },
      },
      { name: "show_toggle", selector: { boolean: {} } },
      { name: "show_state", selector: { boolean: {} } },
    ],
  },
];

const LABELS_FR: Record<string, string> = {
  entity: "Entité",
  name: "Nom (optionnel)",
  icon: "Icône (optionnelle)",
  levels: "Nombre de niveaux (auto si vide)",
  show_toggle: "Interrupteur",
  show_state: "État sous le nom",
};

const LABELS_EN: Record<string, string> = {
  entity: "Entity",
  name: "Name (optional)",
  icon: "Icon (optional)",
  levels: "Number of levels (auto if empty)",
  show_toggle: "Toggle",
  show_state: "State under the name",
};

export class AcdFanCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdFanCardConfig;

  public setConfig(config: AcdFanCardConfig): void {
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

safeDefine("acd-fan-card-editor", AcdFanCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-fan-card-editor": AcdFanCardEditor;
  }
}
