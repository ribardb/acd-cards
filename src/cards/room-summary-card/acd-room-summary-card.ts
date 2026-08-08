import { css, html, nothing, type TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdRoomSummaryCardConfig, HassEntity } from "../../types";

const CARD_TYPE = "acd-room-summary-card";

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
];

/**
 * Panneau récapitulatif d'une pièce : compte des appareils par état et
 * contrôle global « Tout éteindre ». C'est la colonne sombre de la maquette.
 */
export class AcdRoomSummaryCard extends AcdBaseCard<AcdRoomSummaryCardConfig> {
  protected override defaults(): Partial<AcdRoomSummaryCardConfig> {
    return { show_counts: true, show_master: true, show_add_button: true };
  }

  public static getStubConfig(): Partial<AcdRoomSummaryCardConfig> {
    return {};
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-room-summary-card-editor");
  }

  public getGridOptions(): Record<string, unknown> {
    return { columns: 8, rows: "auto", min_columns: 4 };
  }

  public override getCardSize(): number {
    return 4;
  }

  /* ------------------------------------------------------------ entités */

  private _entities(): HassEntity[] {
    const c = this._config;
    if (!c || !this.hass) return [];
    if (c.entities?.length) {
      return c.entities
        .map((id) => this.hass!.states[id])
        .filter((s): s is HassEntity => !!s);
    }
    const area = c.area;
    if (!area) return [];
    const domains = c.domains?.length ? c.domains : DEFAULT_DOMAINS;
    const exclude = new Set(c.exclude ?? []);
    const deviceIds = new Set(
      Object.values(this.hass.devices ?? {})
        .filter((d) => d.area_id === area)
        .map((d) => d.id)
    );
    return Object.values(this.hass.entities ?? {})
      .filter(
        (e) =>
          !e.hidden &&
          !exclude.has(e.entity_id) &&
          domains.includes(e.entity_id.split(".")[0]) &&
          (e.area_id === area ||
            (e.area_id == null && !!e.device_id && deviceIds.has(e.device_id)))
      )
      .map((e) => this.hass!.states[e.entity_id])
      .filter((s): s is HassEntity => !!s);
  }

  /** Trois seaux : actif, en veille (éteint mais joignable), hors ligne. */
  private _buckets(list: HassEntity[]): {
    active: number;
    standby: number;
    offline: number;
  } {
    let active = 0;
    let standby = 0;
    let offline = 0;
    for (const stateObj of list) {
      if (["unavailable", "unknown"].includes(stateObj.state)) offline += 1;
      else if (
        ["off", "idle", "standby", "closed", "docked"].includes(stateObj.state)
      ) {
        standby += 1;
      } else active += 1;
    }
    return { active, standby, offline };
  }

  private _allOff(list: HassEntity[]): boolean {
    return this._buckets(list).active === 0;
  }

  private _masterOff = (ev: Event): void => {
    ev.stopPropagation();
    const list = this._entities().filter(
      (s) => !["unavailable", "unknown"].includes(s.state)
    );
    const ids = list.map((s) => s.entity_id);
    if (!ids.length) return;
    // Les caméras et serrures ne sont jamais coupées par un « tout éteindre ».
    const safe = ids.filter(
      (id) => !["camera", "lock"].includes(id.split(".")[0])
    );
    if (safe.length) {
      this.hass.callService("homeassistant", "turn_off", { entity_id: safe });
    }
  };

  private _navigate(path?: string): void {
    if (!path) return;
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed"));
  }

  /* ------------------------------------------------------------- render */

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const list = this._entities();
    const { active, standby, offline } = this._buckets(list);
    const areaName = c.area ? this.hass.areas?.[c.area]?.name : undefined;
    const title = c.title ?? areaName ?? this.t("Pièce", "Room");
    const allOff = this._allOff(list);

    return html`
      <ha-card>
        <div class="head">
          <span class="eyebrow">${title}</span>
          <span class="total"
            >${list.length}
            ${this.t("appareils", "devices")}</span
          >
        </div>

        ${c.show_counts
          ? html`<div class="stats">
              <div class="line">
                <span>${this.t("Actifs", "Active")}</span>
                <span class="num">${active}</span>
              </div>
              <div class="line">
                <span>${this.t("En veille", "Standby")}</span>
                <span class="num">${standby}</span>
              </div>
              <div class="line">
                <span>${this.t("Hors ligne", "Offline")}</span>
                <span class="num">${offline}</span>
              </div>
            </div>`
          : nothing}

        ${c.show_master
          ? html`<div class="master">
              <span class="master-title"
                >${this.t("Contrôle global", "Global control")}</span
              >
              <div class="master-row">
                <span>${this.t("Tout éteindre", "Turn everything off")}</span>
                <button
                  class="toggle ${classMap({ active: !allOff })}"
                  aria-label=${this.t("Tout éteindre", "Turn everything off")}
                  ?disabled=${allOff}
                  @click=${this._masterOff}
                >
                  <span class="knob"></span>
                </button>
              </div>
            </div>`
          : nothing}
        ${c.show_add_button
          ? html`<button
              class="add"
              @click=${() =>
                this._navigate(c.add_path ?? "/config/devices/dashboard")}
            >
              + ${this.t("Ajouter un appareil", "Add a device")}
            </button>`
          : nothing}
      </ha-card>
    `;
  }

  static override styles = [
    tokens,
    css`
      :host {
        display: block;
      }

      /* Panneau sombre : le contraste s'inverse par rapport aux autres cartes. */
      ha-card {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 18px;
        background: var(--acd-accent);
        border: none;
        border-radius: var(--acd-radius);
        box-shadow: var(--acd-shadow);
        font-family: var(--acd-font);
        color: var(--acd-on-accent);
        height: 100%;
        box-sizing: border-box;
      }

      .head {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .eyebrow {
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.62);
      }
      .total {
        font-size: 21px;
        font-weight: 700;
        letter-spacing: -0.4px;
      }

      .stats {
        display: flex;
        flex-direction: column;
        gap: 9px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.14);
      }
      .line {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        font-size: 12.5px;
        color: rgba(255, 255, 255, 0.72);
      }
      .num {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--acd-on-accent);
      }

      .master {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border-radius: var(--acd-radius-inner);
        background: rgba(255, 255, 255, 0.08);
      }
      .master-title {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }
      .master-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: 13px;
        font-weight: 600;
      }
      .toggle {
        flex-shrink: 0;
        width: 42px;
        height: 25px;
        border-radius: 13px;
        border: none;
        padding: 3px;
        background: rgba(255, 255, 255, 0.22);
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: background 180ms ease, opacity 180ms ease;
      }
      .toggle .knob {
        width: 19px;
        height: 19px;
        border-radius: 50%;
        background: #ffffff;
        transition: transform 180ms ease;
      }
      .toggle.active {
        background: rgba(255, 255, 255, 0.9);
      }
      .toggle.active .knob {
        transform: translateX(17px);
        background: var(--acd-accent);
      }
      .toggle:disabled {
        opacity: 0.45;
        cursor: default;
      }

      .add {
        margin-top: auto;
        width: 100%;
        border: none;
        border-radius: var(--acd-radius-inner);
        background: rgba(255, 255, 255, 0.12);
        color: var(--acd-on-accent);
        font-family: var(--acd-font);
        font-size: 13.5px;
        font-weight: 600;
        padding: 13px 0;
        cursor: pointer;
        transition: background 150ms ease;
      }
      .add:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `,
    densityStyles(
      "ha-card{padding:14px;gap:11px}.total{font-size:18px}" +
        ".line{font-size:11.5px}.add{padding:11px 0;font-size:12.5px}",
      ".stats{display:none}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdRoomSummaryCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Room Summary Card",
  description:
    "Dark room panel: device counts by state, global off switch and add button.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-room-summary-card": AcdRoomSummaryCard;
  }
}
