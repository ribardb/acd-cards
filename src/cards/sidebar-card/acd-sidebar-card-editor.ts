import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdSidebarCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  {
    name: "mode",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "auto", label: "Auto" },
          { value: "rail", label: "Rail (gauche / left)" },
          { value: "tabbar", label: "Tab bar (bas / bottom)" },
        ],
      },
    },
  },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "logo", selector: { text: {} } },
      {
        name: "width",
        selector: { number: { min: 56, max: 120, step: 2, mode: "box" } },
      },
      {
        name: "breakpoint",
        selector: { number: { min: 400, max: 1400, step: 10, mode: "box" } },
      },
      { name: "hide_header", selector: { boolean: {} } },
      { name: "hide_ha_sidebar", selector: { boolean: {} } },
      { name: "show_labels", selector: { boolean: {} } },
      { name: "tabbar_labels", selector: { boolean: {} } },
    ],
  },
  { name: "items", selector: { object: {} } },
  { name: "bottom_items", selector: { object: {} } },
];

const LABELS_FR: Record<string, string> = {
  mode: "Disposition (auto = tab bar sur mobile)",
  logo: "Logo (texte court, rail seulement)",
  width: "Largeur du rail (px)",
  breakpoint: "Bascule en tab bar sous (px)",
  hide_header: "Masquer la barre du haut",
  hide_ha_sidebar: "Masquer la barre latérale HA",
  show_labels: "Libellés sous les icônes (rail)",
  tabbar_labels: "Libellés sous les icônes (tab bar)",
  items: "Éléments (liste : icon, label, path — ou action: menu)",
  bottom_items: "Éléments du bas (ex. action: menu)",
};

const LABELS_EN: Record<string, string> = {
  mode: "Layout (auto = tab bar on mobile)",
  logo: "Logo (short text, rail only)",
  width: "Rail width (px)",
  breakpoint: "Switch to tab bar below (px)",
  hide_header: "Hide the top header",
  hide_ha_sidebar: "Hide HA's sidebar",
  show_labels: "Labels under icons (rail)",
  tabbar_labels: "Labels under icons (tab bar)",
  items: "Items (list: icon, label, path — or action: menu)",
  bottom_items: "Bottom items (e.g. action: menu)",
};

export class AcdSidebarCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdSidebarCardConfig;

  public setConfig(config: AcdSidebarCardConfig): void {
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
      mode: "auto",
      breakpoint: 870,
      hide_header: true,
      hide_ha_sidebar: true,
      show_labels: false,
      tabbar_labels: true,
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

safeDefine("acd-sidebar-card-editor", AcdSidebarCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-sidebar-card-editor": AcdSidebarCardEditor;
  }
}
