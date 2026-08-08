import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../../shared/register";
import type { AcdRoomsCardConfig, HomeAssistant } from "../../types";

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "areas", selector: { area: { multiple: true } } },
  { name: "navigation_path", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "link_text", selector: { text: {} } },
      { name: "link_path", selector: { navigation: {} } },
    ],
  },
  {
    name: "layout",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "auto", label: "Auto" },
          { value: "horizontal", label: "Horizontal" },
          { value: "list", label: "Liste / List" },
        ],
      },
    },
  },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "breakpoint",
        selector: { number: { min: 280, max: 900, step: 10, mode: "box" } },
      },
      {
        name: "pill_width",
        selector: { number: { min: 90, max: 260, step: 2, mode: "box" } },
      },
      { name: "scroll", selector: { boolean: {} } },
      {
        name: "max_height",
        selector: { number: { min: 120, max: 900, step: 10, mode: "box" } },
      },
      { name: "show_counts", selector: { boolean: {} } },
      { name: "show_icons", selector: { boolean: {} } },
      { name: "snap", selector: { boolean: {} } },
      { name: "show_add_button", selector: { boolean: {} } },
    ],
  },
];

const LABELS_FR: Record<string, string> = {
  title: "Titre (optionnel)",
  areas: "Pièces (optionnel, toutes par défaut)",
  navigation_path:
    "Navigation (défaut : vue {slug} du dashboard courant ; {area}/{slug})",
  link_text: "Lien d'en-tête (ex. « Voir tout »)",
  link_path: "Cible du lien d'en-tête",
  layout: "Disposition (auto = horizontal sur mobile)",
  breakpoint: "Bascule horizontale sous (px)",
  pill_width: "Largeur des pastilles (px)",
  scroll: "Liste défilante",
  max_height: "Hauteur max de la liste (px)",
  show_counts: "Nombre d'appareils",
  show_icons: "Icônes des pièces",
  snap: "Alignement au relâchement (snap)",
  show_add_button: "Bouton « + Ajouter une pièce »",
};

const LABELS_EN: Record<string, string> = {
  title: "Title (optional)",
  areas: "Areas (optional, all by default)",
  navigation_path:
    "Navigation (default: {slug} view of current dashboard; {area}/{slug})",
  link_text: 'Header link (e.g. "See all")',
  link_path: "Header link target",
  layout: "Layout (auto = horizontal on mobile)",
  breakpoint: "Switch to horizontal below (px)",
  pill_width: "Pill width (px)",
  scroll: "Scrollable list",
  max_height: "Max list height (px)",
  show_counts: "Device counts",
  show_icons: "Room icons",
  snap: "Snap on release",
  show_add_button: '"+ Add room" button',
};

export class AcdRoomsCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdRoomsCardConfig;

  public setConfig(config: AcdRoomsCardConfig): void {
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
    if (Array.isArray(config.areas) && config.areas.length === 0) {
      delete config.areas;
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
      layout: "auto",
      breakpoint: 450,
      scroll: false,
      show_counts: true,
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

safeDefine("acd-rooms-card-editor", AcdRoomsCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "acd-rooms-card-editor": AcdRoomsCardEditor;
  }
}
