import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdHeaderCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  {
    type: "grid",
    name: "",
    schema: [
      { name: "greeting", selector: { text: {} } },
      { name: "name", selector: { text: {} } },
    ],
  },
  { name: "subtitle", selector: { text: {} } },
  {
    name: "person_entity",
    selector: { entity: { domain: ["person", "device_tracker"] } },
  },
  { name: "avatar", selector: { text: {} } },
  { name: "avatar_path", selector: { navigation: {} } },
  { name: "notification_entity", selector: { entity: {} } },
  { name: "notification_path", selector: { navigation: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "avatar_size",
        selector: { number: { min: 24, max: 64, step: 2, mode: "box" } },
      },
      { name: "show_greeting", selector: { boolean: {} } },
      { name: "time_based_greeting", selector: { boolean: {} } },
      { name: "show_notifications", selector: { boolean: {} } },
      { name: "show_avatar", selector: { boolean: {} } },
    ],
  },
];

const LABELS_FR: Record<string, string> = {
  greeting: "Salutation (défaut : selon l'heure)",
  name: "Nom affiché (défaut : utilisateur HA)",
  subtitle: "Sous-titre (optionnel)",
  person_entity: "Personne (avatar et nom)",
  avatar: "Image d'avatar (URL, prioritaire)",
  avatar_path: "Navigation au clic sur l'avatar",
  notification_entity:
    "Entité de notification (compteur > 0 ou état « on » → point)",
  notification_path: "Navigation au clic sur la cloche",
  avatar_size: "Taille de l'avatar (px)",
  show_greeting: "Afficher la salutation",
  time_based_greeting: "Salutation selon l'heure",
  show_notifications: "Cloche de notification",
  show_avatar: "Avatar",
};

const LABELS_EN: Record<string, string> = {
  greeting: "Greeting (default: time based)",
  name: "Displayed name (default: HA user)",
  subtitle: "Subtitle (optional)",
  person_entity: "Person (avatar and name)",
  avatar: "Avatar image (URL, takes precedence)",
  avatar_path: "Navigation on avatar tap",
  notification_path: "Navigation on bell tap",
  notification_entity: 'Notification entity (count > 0 or "on" → dot)',
  avatar_size: "Avatar size (px)",
  show_greeting: "Show greeting",
  time_based_greeting: "Time-based greeting",
  show_notifications: "Notification bell",
  show_avatar: "Avatar",
};

export class AcdHeaderCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdHeaderCardConfig;

  public setConfig(config: AcdHeaderCardConfig): void {
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
      show_greeting: true,
      time_based_greeting: true,
      show_notifications: true,
      show_avatar: true,
      avatar_size: 34,
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

safeDefine("acd-header-card-editor", AcdHeaderCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-header-card-editor": AcdHeaderCardEditor;
  }
}
