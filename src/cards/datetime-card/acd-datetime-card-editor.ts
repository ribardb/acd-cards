import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdDatetimeCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  {
    name: "weather_entity",
    selector: { entity: { domain: "weather" } },
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_weather", selector: { boolean: {} } },
      { name: "show_range", selector: { boolean: {} } },
      { name: "show_greeting", selector: { boolean: {} } },
      { name: "show_seconds", selector: { boolean: {} } },
    ],
  },
  {
    name: "density",
    selector: {
      select: {
        mode: "dropdown",
        options: ["auto", "full", "dense", "minimal"],
      },
    },
  },
];

const LABELS_FR: Record<string, string> = {
  weather_entity: "Entité météo",
  show_weather: "Afficher la météo",
  show_range: "Afficher min / max du jour",
  show_greeting: "Afficher la salutation",
  show_seconds: "Afficher les secondes",
  density: "Densité",
};

const LABELS_EN: Record<string, string> = {
  weather_entity: "Weather entity",
  show_weather: "Show weather",
  show_range: "Show today's min / max",
  show_greeting: "Show greeting",
  show_seconds: "Show seconds",
  density: "Density",
};

export class AcdDatetimeCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdDatetimeCardConfig;

  public setConfig(config: AcdDatetimeCardConfig): void {
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
      show_weather: true,
      show_range: true,
      show_greeting: true,
      show_seconds: false,
      density: "auto",
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

safeDefine("acd-datetime-card-editor", AcdDatetimeCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-datetime-card-editor": AcdDatetimeCardEditor;
  }
}
