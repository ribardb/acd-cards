import { css, html, nothing, type TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import { WidthController } from "../../shared/width-controller";
import "../../shared/scroll-row";
import type { AcdRoomsCardConfig, AreaRegistryEntry } from "../../types";

const CARD_TYPE = "acd-rooms-card";
const DEFAULT_BREAKPOINT = 450;

export class AcdRoomsCard extends AcdBaseCard<AcdRoomsCardConfig> {
  private _width = new WidthController(this);

  protected override defaults(): Partial<AcdRoomsCardConfig> {
    return {
      show_counts: true,
      show_add_button: false,
      layout: "auto",
      breakpoint: DEFAULT_BREAKPOINT,
      scroll: false,
    };
  }

  public static getStubConfig(): Partial<AcdRoomsCardConfig> {
    return {};
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-rooms-card-editor");
  }

  public getGridOptions() {
    return this._config?.layout === "horizontal"
      ? { columns: "full", rows: "auto", min_columns: 6 }
      : { columns: 4, rows: "auto", min_columns: 3 };
  }

  public override getCardSize(): number {
    return this._horizontal() ? 2 : this._areas().length + 1;
  }

  /* ---------- layout ---------- */

  /** Horizontal pill row (mobile) vs vertical list (desktop). */
  private _horizontal(): boolean {
    const layout = this._config?.layout ?? "auto";
    if (layout === "horizontal") return true;
    if (layout === "list") return false;
    return this._width.isNarrow(this._config?.breakpoint ?? DEFAULT_BREAKPOINT);
  }

  /** Icons are noise in the compact pills, so they default to off there. */
  private _showIcons(): boolean {
    return this._config?.show_icons ?? !this._horizontal();
  }

  /* ---------- data ---------- */

  private _areas(): AreaRegistryEntry[] {
    const registry = this.hass?.areas ?? {};
    const wanted = this._config?.areas;
    if (wanted?.length) {
      return wanted
        .map((id) => registry[id])
        .filter((a): a is AreaRegistryEntry => !!a);
    }
    return Object.values(registry).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /** Devices assigned to the area, plus entities directly assigned. */
  private _deviceCount(areaId: string): number {
    const devices = Object.values(this.hass?.devices ?? {}).filter(
      (d) => d.area_id === areaId
    );
    const deviceIds = new Set(devices.map((d) => d.id));
    const directEntities = Object.values(this.hass?.entities ?? {}).filter(
      (e) =>
        e.area_id === areaId && (!e.device_id || !deviceIds.has(e.device_id))
    );
    return devices.length + directEntities.length;
  }

  /** URL slug from the area name: accents stripped, spaces/underscores
   *  turned into hyphens ("Chambre Maé" → "chambre-mae"). */
  private _slug(area: AreaRegistryEntry): string {
    return area.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /** Default: the room's view on the CURRENT dashboard
   *  (/<dashboard>/<slug>). A `navigation_path` pattern overrides it,
   *  with {area} = area id and {slug} = name slug. */
  private _pathFor(area: AreaRegistryEntry): string | undefined {
    const pattern = this._config?.navigation_path;
    if (pattern) {
      return pattern
        .replace("{area}", area.area_id)
        .replace("{slug}", this._slug(area));
    }
    const dashboard = window.location.pathname.split("/")[1];
    if (!dashboard) return undefined;
    return `/${dashboard}/${this._slug(area)}`;
  }

  /** Entity ids belonging to the area (direct assignment, or via a
   *  device assigned to the area when the entity has no override). */
  private _areaEntityIds(areaId: string): string[] {
    const devicesInArea = new Set(
      Object.values(this.hass?.devices ?? {})
        .filter((d) => d.area_id === areaId)
        .map((d) => d.id)
    );
    return Object.values(this.hass?.entities ?? {})
      .filter(
        (e) =>
          !e.hidden &&
          (e.area_id === areaId ||
            (e.area_id == null &&
              !!e.device_id &&
              devicesInArea.has(e.device_id)))
      )
      .map((e) => e.entity_id);
  }

  /** A room is active when a light is on or a cover is open in it. */
  private _isRoomActive(areaId: string): boolean {
    const domains = this._config?.active_domains ?? ["light", "cover"];
    return this._areaEntityIds(areaId).some((id) => {
      const domain = id.split(".")[0];
      if (!domains.includes(domain)) return false;
      const st = this.hass?.states[id]?.state;
      if (!st || st === "unavailable" || st === "unknown") return false;
      return domain === "cover" ? st !== "closed" : st === "on";
    });
  }

  /* ---------- actions ---------- */

  /** Navigation only — never changes any entity state. */
  private _navigate(path?: string): void {
    if (!path) return;
    if (/^https?:\/\//.test(path)) {
      window.open(path, "_blank", "noopener");
      return;
    }
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed"));
  }

  /* ---------- render ---------- */

  /** "5 appareils · actif" — the compact secondary line of a pill. */
  private _subtitle(count: number | undefined, active: boolean): string {
    const parts: string[] = [];
    if (count != null) {
      parts.push(`${count} ${this.t("appareils", "devices")}`);
    }
    if (active) parts.push(this.t("actif", "active"));
    return parts.join(" · ");
  }

  private _header(): TemplateResult | typeof nothing {
    const c = this._config!;
    const title = c.title ?? this.t("Pièces", "Rooms");
    const linkText =
      c.link_text ?? (c.link_path ? this.t("Voir tout", "See all") : undefined);
    if (!title && !linkText) return nothing;
    return html`
      <div class="header">
        ${title ? html`<span class="title">${title}</span>` : nothing}
        ${linkText
          ? html`<button
              class="link"
              @click=${() => this._navigate(c.link_path)}
            >
              ${linkText}
            </button>`
          : nothing}
      </div>
    `;
  }

  private _room(area: AreaRegistryEntry, horizontal: boolean): TemplateResult {
    const c = this._config!;
    const active = this._isRoomActive(area.area_id);
    const path = this._pathFor(area);
    const count = c.show_counts ? this._deviceCount(area.area_id) : undefined;
    const subtitle = this._subtitle(count, active && horizontal);

    return html`
      <div
        class="room ${classMap({ active, clickable: !!path })}"
        style=${styleMap({
          minWidth:
            horizontal && c.pill_width ? `${c.pill_width}px` : undefined,
        })}
        role=${path ? "button" : "presentation"}
        tabindex=${path ? "0" : "-1"}
        @click=${() => this._navigate(path)}
        @keydown=${(ev: KeyboardEvent) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            this._navigate(path);
          }
        }}
      >
        ${this._showIcons()
          ? html`<div class="chip">
              <ha-icon
                .icon=${area.icon ?? "mdi:home-variant-outline"}
              ></ha-icon>
            </div>`
          : nothing}
        <div class="room-titles">
          <span class="room-name">${area.name}</span>
          ${subtitle
            ? html`<span class="room-count">${subtitle}</span>`
            : nothing}
        </div>
        ${!horizontal && active
          ? html`<span
              class="badge"
              title=${this.t("Actif dans cette pièce", "Active in this room")}
            >
              <ha-icon icon="mdi:check"></ha-icon>
            </span>`
          : nothing}
        ${!horizontal && path ? html`<span class="chevron">›</span>` : nothing}
      </div>
    `;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const areas = this._areas();
    const horizontal = this._horizontal();

    return html`
      <ha-card class=${classMap({ horizontal })}>
        ${this._header()}
        ${areas.length === 0
          ? html`<div class="empty">
              ${this.t("Aucune pièce configurée", "No areas configured")}
            </div>`
          : horizontal
          ? html`<acd-scroll-row class="rooms-scroll" .snap=${!!c.snap}>
              ${areas.map((area) => this._room(area, true))}
            </acd-scroll-row>`
          : html`<div
              class="rooms ${c.scroll ? "scroll" : ""}"
              style=${c.scroll && c.max_height
                ? `max-height:${c.max_height}px`
                : ""}
            >
              ${areas.map((area) => this._room(area, false))}
            </div>`}
        ${c.show_add_button
          ? html`
              <button
                class="add"
                @click=${() => this._navigate("/config/areas/dashboard")}
              >
                + ${this.t("Ajouter une pièce", "Add room")}
              </button>
            `
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

      ha-card {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        background: var(--acd-bg);
        border: 1px solid var(--acd-border);
        border-radius: var(--acd-radius);
        box-shadow: var(--acd-shadow);
        font-family: var(--acd-font);
        color: var(--acd-text);
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
      }

      .header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        padding: 2px 2px 0;
      }
      .title {
        font-size: 16px;
        font-weight: 700;
      }
      .link {
        flex-shrink: 0;
        border: none;
        background: none;
        padding: 0;
        font-family: var(--acd-font);
        font-size: 12.5px;
        color: var(--acd-text-secondary);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .link:hover {
        color: var(--acd-text);
      }

      /* ---------- vertical list (desktop) ---------- */

      .rooms {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      /* Liste défilante : la carte garde la hauteur de sa cellule et le
         bouton « + Ajouter » reste visible sous la liste. */
      .rooms.scroll {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: var(--acd-track) transparent;
        /* Fond fondu en bas pour signaler qu'il reste des pièces. */
        mask-image: linear-gradient(
          to bottom,
          #000 calc(100% - 18px),
          transparent
        );
        -webkit-mask-image: linear-gradient(
          to bottom,
          #000 calc(100% - 18px),
          transparent
        );
        padding-right: 2px;
      }
      .rooms.scroll::-webkit-scrollbar {
        width: 5px;
      }
      .rooms.scroll::-webkit-scrollbar-thumb {
        background: var(--acd-track);
        border-radius: 3px;
      }

      .room {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: var(--acd-pill);
        border: 1px solid var(--acd-border);
        border-radius: var(--acd-radius-inner);
        box-sizing: border-box;
        transition: background 150ms ease, border-color 150ms ease;
      }
      .room.clickable {
        cursor: pointer;
      }
      .room.clickable:hover {
        border-color: var(--acd-accent);
      }
      .room.clickable:focus-visible {
        outline: 2px solid var(--acd-accent);
        outline-offset: 2px;
      }
      .room.active {
        background: var(--acd-bg-active);
        border-color: transparent;
      }

      .chip {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: var(--acd-track);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--acd-text);
        --mdc-icon-size: 22px;
      }

      .room-titles {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
        flex: 1;
      }
      .room-name {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .room-count {
        font-size: 12px;
        color: var(--acd-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .chevron {
        flex-shrink: 0;
        font-size: 20px;
        color: var(--acd-text-secondary);
        padding-right: 2px;
      }
      .badge {
        flex-shrink: 0;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--acd-success);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: 14px;
      }

      /* ---------- horizontal pills (mobile) ---------- */

      ha-card.horizontal {
        gap: 10px;
      }
      /* The row bleeds into the card padding so pills scroll under the fade. */
      .rooms-scroll {
        margin: 0 -16px;
        --acd-scroll-gap: 8px;
        --acd-scroll-inset: 0 16px;
        --acd-scroll-fade: 16px;
      }
      ha-card.horizontal .room {
        min-width: 124px;
        max-width: 210px;
        padding: 10px 14px;
        gap: 10px;
        border-radius: 15px;
      }
      ha-card.horizontal .room.active {
        background: var(--acd-accent);
        border-color: transparent;
      }
      ha-card.horizontal .room.active .room-name {
        color: var(--acd-on-accent);
      }
      ha-card.horizontal .room.active .room-count {
        color: rgba(255, 255, 255, 0.72);
      }
      ha-card.horizontal .room.active .chip {
        background: rgba(255, 255, 255, 0.16);
        color: var(--acd-on-accent);
      }
      ha-card.horizontal .chip {
        width: 30px;
        height: 30px;
        border-radius: 10px;
        --mdc-icon-size: 18px;
      }
      ha-card.horizontal .room-name {
        font-size: 13px;
      }
      ha-card.horizontal .room-count {
        font-size: 10.5px;
      }

      .empty {
        font-size: 13px;
        color: var(--acd-text-secondary);
        padding: 8px 2px;
      }

      .add {
        margin-top: 4px;
        width: 100%;
        border: none;
        border-radius: var(--acd-radius-inner);
        background: var(--acd-accent);
        color: var(--acd-on-accent);
        font-family: var(--acd-font);
        font-size: 14px;
        font-weight: 600;
        padding: 14px 0;
        cursor: pointer;
        transition: opacity 150ms ease;
      }
      .add:hover {
        opacity: 0.92;
      }
    `,
    densityStyles(
      "ha-card{padding:12px;gap:9px}.title{font-size:14px}.rooms{gap:6px}.room{padding:8px 10px;gap:9px}.chip{width:32px;height:32px;border-radius:10px;--mdc-icon-size:18px}.room-name{font-size:13px}.room-count{font-size:11px}.add{padding:11px 0;font-size:13px}", ".chip{display:none}.room-count{display:none}.room{padding:9px 10px}.badge{width:18px;height:18px;--mdc-icon-size:12px}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdRoomsCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Rooms Card",
  description:
    "Rooms from HA areas: vertical list on desktop, horizontal scrolling pills on mobile.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-rooms-card": AcdRoomsCard;
  }
}
