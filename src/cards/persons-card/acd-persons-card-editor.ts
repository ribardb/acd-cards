import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdPersonsCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  {
    name: "entities",
    selector: { entity: { domain: "person", multiple: true } },
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "show_count", selector: { boolean: {} } },
      { name: "show_names", selector: { boolean: {} } },
      {
        name: "avatar_size",
        selector: { number: { min: 28, max: 72, step: 2, mode: "box" } },
      },
    ],
  },
];

const LABELS_FR: Record<string, string> = {
  title: "Titre (optionnel)",
  entities: "Personnes (optionnel, toutes par défaut)",
  show_count: "Compteur maison/absent",
  show_names: "Prénoms sous les avatars",
  avatar_size: "Taille des avatars (px)",
};

const LABELS_EN: Record<string, string> = {
  title: "Title (optional)",
  entities: "Persons (optional, all by default)",
  show_count: "Home/away count",
  show_names: "First names under avatars",
  avatar_size: "Avatar size (px)",
};

export class AcdPersonsCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdPersonsCardConfig;

  public setConfig(config: AcdPersonsCardConfig): void {
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
    const data = {
      show_count: true,
      show_names: false,
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

safeDefine("acd-persons-card-editor", AcdPersonsCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-persons-card-editor": AcdPersonsCardEditor;
  }
}
