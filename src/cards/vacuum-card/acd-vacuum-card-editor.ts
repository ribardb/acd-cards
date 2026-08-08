import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdVacuumCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  {
    name: "entity",
    required: true,
    selector: { entity: { domain: "vacuum" } },
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "name", selector: { text: {} } },
      { name: "subtitle", selector: { text: {} } },
    ],
  },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "image",
        selector: {
          select: {
            mode: "dropdown",
            custom_value: true,
            options: [
              { value: "robot", label: "Robot aspirateur" },
              { value: "dock", label: "Base de charge" },
            ],
          },
        },
      },
      {
        name: "image_size",
        selector: { number: { min: 20, max: 100, step: 2, mode: "box" } },
      },
    ],
  },
  {
    name: "battery_entity",
    selector: { entity: { domain: "sensor" } },
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_toggle", selector: { boolean: {} } },
      { name: "show_battery", selector: { boolean: {} } },
      { name: "show_actions", selector: { boolean: {} } },
      { name: "show_state", selector: { boolean: {} } },
    ],
  },
];

const LABELS_FR: Record<string, string> = {
  entity: "Aspirateur",
  name: "Nom (optionnel)",
  subtitle: "Sous-titre (défaut : état)",
  image: "Visuel (clé intégrée ou URL)",
  image_size: "Taille du visuel (%)",
  battery_entity: "Capteur de batterie (optionnel)",
  show_toggle: "Interrupteur",
  show_battery: "Pastille batterie",
  show_actions: "Boutons pause / localiser / base",
  show_state: "État en sous-titre",
};

const LABELS_EN: Record<string, string> = {
  entity: "Vacuum",
  name: "Name (optional)",
  subtitle: "Subtitle (default: state)",
  image: "Illustration (built-in key or URL)",
  image_size: "Illustration size (%)",
  battery_entity: "Battery sensor (optional)",
  show_toggle: "Toggle",
  show_battery: "Battery pill",
  show_actions: "Pause / locate / dock buttons",
  show_state: "State as subtitle",
};

export class AcdVacuumCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdVacuumCardConfig;

  public setConfig(config: AcdVacuumCardConfig): void {
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
      show_battery: true,
      show_actions: false,
      show_state: true,
      image: "robot",
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

safeDefine("acd-vacuum-card-editor", AcdVacuumCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-vacuum-card-editor": AcdVacuumCardEditor;
  }
}
