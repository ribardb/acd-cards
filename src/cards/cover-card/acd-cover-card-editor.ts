import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdCoverCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: { domain: "cover" } } },
  { name: "name", selector: { text: {} } },
  {
    name: "info_dialog",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "custom", label: "Modale ACD (custom)" },
          { value: "native", label: "More-info natif HA" },
        ],
      },
    },
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_buttons", selector: { boolean: {} } },
      { name: "show_position", selector: { boolean: {} } },
      { name: "show_state", selector: { boolean: {} } },
      { name: "invert_position", selector: { boolean: {} } },
      { name: "compact", selector: { boolean: {} } },
    ],
  },
  {
    name: "entities",
    selector: { entity: { domain: "cover", multiple: true } },
  },
];

const LABELS_FR: Record<string, string> = {
  entity: "Entité",
  name: "Nom (optionnel)",
  info_dialog: "Fenêtre au clic (titre / visuel)",
  show_buttons: "Boutons ▲ ■ ▼",
  show_position: "Barre de position",
  show_state: "État",
  invert_position: "Inverser la position",
  compact: "Affichage compact",
  entities: "Volets supplémentaires (carrousel ‹ ›)",
};

const LABELS_EN: Record<string, string> = {
  entity: "Entity",
  name: "Name (optional)",
  info_dialog: "Dialog on tap (title / visual)",
  show_buttons: "▲ ■ ▼ buttons",
  show_position: "Position bar",
  show_state: "State",
  invert_position: "Invert position",
  compact: "Compact layout",
  entities: "Extra covers (‹ › carousel)",
};

export class AcdCoverCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdCoverCardConfig;

  public setConfig(config: AcdCoverCardConfig): void {
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
    if (Array.isArray(config.entities) && config.entities.length === 0) {
      delete config.entities;
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

safeDefine("acd-cover-card-editor", AcdCoverCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-cover-card-editor": AcdCoverCardEditor;
  }
}
