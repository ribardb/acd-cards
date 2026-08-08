import { css, html, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type {
  AcdDevicesCardConfig,
  AcdDevicesFilter,
  HassEntity,
} from "../../types";

const CARD_TYPE = "acd-devices-card";

/** Domaines retenus par défaut : ce qu'on pilote, pas ce qu'on mesure. */
const DEFAULT_DOMAINS = [
  "light",
  "cover",
  "climate",
  "media_player",
  "switch",
  "fan",
  "vacuum",
  "lock",
  "humidifier",
  "camera",
];

/** Chaque domaine est rendu par la carte ACD dédiée quand elle existe. */
const CARD_FOR_DOMAIN: Record<string, string> = {
  light: "custom:acd-light-card",
  cover: "custom:acd-cover-card",
  climate: "custom:acd-climate-card",
  vacuum: "custom:acd-vacuum-card",
  camera: "custom:acd-camera-card",
};

const FALLBACK_CARD = "custom:acd-device-card";

interface CardHelpers {
  createCardElement(config: Record<string, unknown>): HTMLElement;
}

/**
 * Grille d'appareils d'une pièce, alimentée automatiquement par la zone
 * Home Assistant. Elle n'invente pas de rendu : chaque entité est confiée
 * à la carte ACD de son domaine (lumière, volet, thermostat…), les autres
 * domaines tombant sur la tuile générique. Les onglets Tout / Actifs /
 * Hors ligne filtrent la grille comme dans la maquette.
 */
export class AcdDevicesCard extends AcdBaseCard<AcdDevicesCardConfig> {
  @state() private _filter: AcdDevicesFilter = "all";
  @state() private _helpers?: CardHelpers;

  /** Cache des éléments créés, pour ne pas les reconstruire à chaque état. */
  private _cards = new Map<string, HTMLElement>();

  protected override defaults(): Partial<AcdDevicesCardConfig> {
    return {
      show_header: true,
      show_filters: true,
      show_count: true,
      columns: 3,
      min_tile_width: 190,
    };
  }

  public static getStubConfig(): Partial<AcdDevicesCardConfig> {
    return {};
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-devices-card-editor");
  }

  public getGridOptions(): Record<string, unknown> {
    return { columns: "full", rows: "auto", min_columns: 6 };
  }

  public override getCardSize(): number {
    return this._entities().length + 1;
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    void this._loadHelpers();
  }

  private async _loadHelpers(): Promise<void> {
    if (this._helpers) return;
    const loader = (
      window as unknown as { loadCardHelpers?: () => Promise<CardHelpers> }
    ).loadCardHelpers;
    if (!loader) return;
    this._helpers = await loader();
  }

  /* ------------------------------------------------------------ entités */

  /** Entités de la zone, device_id compris, hors entités masquées. */
  private _areaEntityIds(areaId: string): string[] {
    const deviceIds = new Set(
      Object.values(this.hass?.devices ?? {})
        .filter((d) => d.area_id === areaId)
        .map((d) => d.id)
    );
    return Object.values(this.hass?.entities ?? {})
      .filter(
        (e) =>
          !e.hidden &&
          (e.area_id === areaId ||
            (e.area_id == null && !!e.device_id && deviceIds.has(e.device_id)))
      )
      .map((e) => e.entity_id);
  }

  private _entities(): string[] {
    const c = this._config;
    if (!c || !this.hass) return [];
    if (c.entities?.length) return c.entities;

    const area = c.area;
    if (!area) return [];
    const domains = c.domains?.length ? c.domains : DEFAULT_DOMAINS;
    const exclude = new Set(c.exclude ?? []);
    const ids = this._areaEntityIds(area).filter((id) => {
      if (exclude.has(id)) return false;
      if (!domains.includes(id.split(".")[0])) return false;
      const stateObj = this.hass!.states[id];
      return !!stateObj;
    });

    // Ordre : priorités explicites d'abord, puis domaine, puis nom.
    const priority = c.priority ?? [];
    const rank = (id: string): number => {
      const index = priority.indexOf(id);
      return index === -1 ? priority.length + domains.indexOf(id.split(".")[0]) : index;
    };
    return ids.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return this._name(a).localeCompare(this._name(b));
    });
  }

  private _name(id: string): string {
    return (
      (this.hass?.states[id]?.attributes.friendly_name as string) ?? id
    );
  }

  private _isOffline(stateObj: HassEntity): boolean {
    return ["unavailable", "unknown"].includes(stateObj.state);
  }

  private _isActive(stateObj: HassEntity): boolean {
    if (this._isOffline(stateObj)) return false;
    return !["off", "idle", "standby", "closed", "docked"].includes(
      stateObj.state
    );
  }

  private _matches(id: string): boolean {
    const stateObj = this.hass?.states[id];
    if (!stateObj) return false;
    if (this._filter === "active") return this._isActive(stateObj);
    if (this._filter === "offline") return this._isOffline(stateObj);
    return true;
  }

  /* -------------------------------------------------------------- cartes */

  /** Configuration de la carte enfant retenue pour une entité. */
  private _childConfig(id: string): Record<string, unknown> {
    // Le type par défaut reste celui du domaine : une surcharge qui ne
    // précise que `name`/`icon` ne doit pas produire une config sans `type`
    // (createCardElement lèverait, et la tuile disparaîtrait silencieusement).
    const type = CARD_FOR_DOMAIN[id.split(".")[0]] ?? FALLBACK_CARD;
    const overrides = this._config?.card_overrides?.[id];
    if (overrides) return { type, entity: id, ...overrides };
    return { type, entity: id };
  }

  private _cardFor(id: string): HTMLElement | typeof nothing {
    if (!this._helpers) return nothing;
    let element = this._cards.get(id);
    if (!element) {
      try {
        element = this._helpers.createCardElement(this._childConfig(id));
      } catch {
        return nothing;
      }
      this._cards.set(id, element);
    }
    (element as unknown as { hass?: unknown }).hass = this.hass;
    return element;
  }

  /* ------------------------------------------------------------- render */

  private _filterButton(
    value: AcdDevicesFilter,
    label: string
  ): TemplateResult {
    return html`<button
      class="tab ${classMap({ active: this._filter === value })}"
      @click=${() => {
        this._filter = value;
      }}
    >
      ${label}
    </button>`;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const all = this._entities();
    const visible = all.filter((id) => this._matches(id));
    const title = c.title ?? this.t("Appareils", "Devices");

    return html`
      <div class="wrap">
        ${c.show_header
          ? html`<div class="head">
              <span class="title"
                >${title}${c.show_count
                  ? html` <span class="count">· ${all.length}</span>`
                  : nothing}</span
              >
              ${c.show_filters
                ? html`<div class="tabs">
                    ${this._filterButton("all", this.t("Tout", "All"))}
                    ${this._filterButton("active", this.t("Actifs", "Active"))}
                    ${this._filterButton(
                      "offline",
                      this.t("Hors ligne", "Offline")
                    )}
                  </div>`
                : nothing}
            </div>`
          : nothing}

        <div
          class="grid"
          style="--acd-tile-min:${c.min_tile_width ?? 190}px"
        >
          ${visible.map((id) => this._cardFor(id))}
          ${c.show_add_button
            ? html`<button
                class="add"
                @click=${() => {
                  history.pushState(null, "", "/config/devices/dashboard");
                  window.dispatchEvent(new CustomEvent("location-changed"));
                }}
              >
                <span class="plus">+</span>
                ${this.t("Ajouter un appareil", "Add a device")}
              </button>`
            : nothing}
          ${visible.length === 0 && !c.show_add_button
            ? html`<div class="empty">
                ${this.t("Aucun appareil", "No devices")}
              </div>`
            : nothing}
        </div>
      </div>
    `;
  }

  static override styles = [
    tokens,
    css`
      :host {
        display: block;
        font-family: var(--acd-font);
        color: var(--acd-text);
      }
      .wrap {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        padding: 0 2px;
        flex-wrap: wrap;
      }
      .title {
        font-size: 15px;
        font-weight: 700;
      }
      .count {
        color: var(--acd-text-secondary);
        font-weight: 600;
      }

      .tabs {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .tab {
        border: none;
        background: none;
        padding: 3px 8px;
        border-radius: 999px;
        font-family: var(--acd-font);
        font-size: 12px;
        color: var(--acd-text-secondary);
        cursor: pointer;
        transition: background 150ms ease, color 150ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .tab:hover {
        color: var(--acd-text);
      }
      .tab.active {
        background: var(--acd-pill);
        color: var(--acd-text);
        font-weight: 600;
        box-shadow: var(--acd-shadow);
      }

      /* Grille fluide : le nombre de colonnes suit la largeur disponible. */
      .grid {
        display: grid;
        grid-template-columns: repeat(
          auto-fill,
          minmax(var(--acd-tile-min, 190px), 1fr)
        );
        gap: 10px;
        align-items: stretch;
      }

      .add {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        min-height: 120px;
        border: 1.5px dashed var(--acd-border);
        border-radius: var(--acd-radius);
        background: none;
        font-family: var(--acd-font);
        font-size: 12.5px;
        color: var(--acd-text-secondary);
        cursor: pointer;
        transition: border-color 150ms ease, color 150ms ease;
      }
      .add:hover {
        border-color: var(--acd-accent);
        color: var(--acd-text);
      }
      .plus {
        font-size: 20px;
        line-height: 1;
      }

      .empty {
        padding: 14px 2px;
        font-size: 13px;
        color: var(--acd-text-secondary);
      }
    `,
    densityStyles(
      ".grid{gap:8px}.title{font-size:13.5px}.tab{font-size:11px;padding:3px 7px}",
      ".tabs{display:none}.add{min-height:96px}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdDevicesCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Devices Card",
  description:
    "Auto device grid for an area: All / Active / Offline tabs, one ACD card per domain.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-devices-card": AcdDevicesCard;
  }
}
