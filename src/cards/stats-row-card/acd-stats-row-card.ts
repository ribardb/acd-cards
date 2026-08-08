import { css, html, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import "../../shared/scroll-row";
import type {
  AcdStatsRowCardConfig,
  AcdStatsRowItem,
  HassEntity,
} from "../../types";

const CARD_TYPE = "acd-stats-row-card";
const REFRESH_MS = 5 * 60 * 1000;

export class AcdStatsRowCard extends AcdBaseCard<AcdStatsRowCardConfig> {
  /** entity_id → oldest value inside the window, for the trend delta. */
  @state() private _baseline: Record<string, number> = {};

  private _histKey = "";
  private _histFetchedAt = 0;
  private _timer?: number;

  protected override defaults(): Partial<AcdStatsRowCardConfig> {
    return {
      show_trend: true,
      graph_hours: 168,
      tile_width: 132,
      decimals: 1,
    };
  }

  public override setConfig(config: AcdStatsRowCardConfig): void {
    if (!config.entities?.length) {
      throw new Error("Please define at least one entity (`entities`).");
    }
    super.setConfig(config);
  }

  public static getStubConfig(hass: {
    states: Record<string, unknown>;
  }): Partial<AcdStatsRowCardConfig> {
    const sensors = Object.keys(hass.states)
      .filter((e) => e.startsWith("sensor."))
      .slice(0, 3);
    return { entities: sensors.length ? sensors : ["sensor.example"] };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-stats-row-card-editor");
  }

  public getGridOptions() {
    return { columns: "full", rows: "auto", min_columns: 6 };
  }

  public override getCardSize(): number {
    return 2;
  }

  /* ---------- items ---------- */

  private _items(): AcdStatsRowItem[] {
    return (this._config?.entities ?? []).map((item) =>
      typeof item === "string" ? { entity: item } : item
    );
  }

  private _numeric(stateObj: HassEntity): number | undefined {
    const n = Number(stateObj.state);
    return Number.isFinite(n) ? n : undefined;
  }

  private _fmt(n: number, decimals: number): string {
    return String(Number(n.toFixed(decimals))).replace(".", ",");
  }

  /* ---------- history (one call for the whole row) ---------- */

  private _wantsHistory(): boolean {
    if (!this._config?.show_trend) return false;
    return this._items().some((i) => {
      const st = this.getEntity(i.entity);
      return !!st && this._numeric(st) != null && i.show_trend !== false;
    });
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    this._timer = window.setInterval(() => {
      this._histFetchedAt = 0;
      this._maybeFetch();
    }, REFRESH_MS);
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._timer) window.clearInterval(this._timer);
  }

  protected override updated(): void {
    this._maybeFetch();
  }

  private async _maybeFetch(): Promise<void> {
    if (!this.hass?.callApi || !this._wantsHistory()) return;
    const ids = this._items().map((i) => i.entity);
    const hours = this._config?.graph_hours ?? 168;
    const key = `${ids.join(",")}|${hours}`;
    const now = Date.now();
    if (key === this._histKey && now - this._histFetchedAt < REFRESH_MS) return;
    this._histKey = key;
    this._histFetchedAt = now;

    const start = new Date(now - hours * 3600 * 1000).toISOString();
    try {
      const res = await this.hass.callApi<HassEntity[][]>(
        "GET",
        `history/period/${start}?filter_entity_id=${ids.join(",")}` +
          `&minimal_response&no_attributes`
      );
      const baseline: Record<string, number> = {};
      for (const series of res ?? []) {
        // With `minimal_response` only the first point carries entity_id,
        // the rest are bare {state, last_changed} objects.
        const seriesId = series.find((p) => p.entity_id)?.entity_id;
        if (!seriesId) continue;
        for (const point of series) {
          const v = Number(point.state);
          if (!Number.isFinite(v)) continue;
          baseline[seriesId] = v; // first finite value of the window
          break;
        }
      }
      this._baseline = baseline;
    } catch {
      this._baseline = {};
    }
  }

  private _trendLabel(): string {
    const c = this._config!;
    if (c.trend_label) return c.trend_label;
    const hours = c.graph_hours ?? 168;
    if (hours >= 168) return this.t("vs. sem. dern.", "vs. last week");
    if (hours >= 24) return this.t("vs. hier", "vs. yesterday");
    return this.t(`vs. ${hours} h`, `vs. ${hours} h`);
  }

  /* ---------- render ---------- */

  private _tile(item: AcdStatsRowItem): TemplateResult {
    const c = this._config!;
    const stateObj = this.getEntity(item.entity);
    const width = item.width ?? c.tile_width ?? 132;

    if (!stateObj) {
      return html`
        <div class="tile missing" style=${styleMap({ width: `${width}px` })}>
          <span class="label">${item.name ?? item.entity}</span>
          <span class="value">—</span>
          <span class="trend">${this.t("Indisponible", "Unavailable")}</span>
        </div>
      `;
    }

    const name =
      item.name ??
      (stateObj.attributes.friendly_name as string | undefined) ??
      item.entity;
    const decimals = item.decimals ?? c.decimals ?? 1;
    const num = this._numeric(stateObj);
    const unit =
      item.unit ??
      (stateObj.attributes.unit_of_measurement as string | undefined) ??
      "";
    const value =
      num != null
        ? this._fmt(num, decimals)
        : this.hass?.formatEntityState?.(stateObj) ?? stateObj.state;

    const wantsTrend = c.show_trend && item.show_trend !== false && num != null;
    const base = this._baseline[item.entity];
    const delta = wantsTrend && base != null ? num! - base : undefined;

    return html`
      <div
        class="tile"
        style=${styleMap({ width: `${width}px` })}
        role="button"
        tabindex="0"
        @click=${() => this.moreInfo(item.entity)}
        @keydown=${(ev: KeyboardEvent) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            this.moreInfo(item.entity);
          }
        }}
      >
        <span class="label">
          ${item.icon
            ? html`<ha-icon class="label-icon" .icon=${item.icon}></ha-icon>`
            : nothing}
          <span class="label-text">${name}</span>
        </span>

        <span class="value-row">
          <span class="value">${value}</span>
          ${unit ? html`<span class="unit">${unit}</span>` : nothing}
        </span>

        ${delta != null
          ? html`<span
              class="trend ${delta > 0 ? "up" : delta < 0 ? "down" : "flat"}"
            >
              ${delta > 0 ? "▲" : delta < 0 ? "▼" : "▬"}
              ${delta === 0
                ? nothing
                : html`${delta > 0 ? "+" : "-"}${this._fmt(
                    Math.abs(delta),
                    decimals
                  )}${unit}`}
              <span class="trend-since">${this._trendLabel()}</span>
            </span>`
          : nothing}
      </div>
    `;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const items = this._items();
    const linkText =
      c.link_text ?? (c.link_path ? this.t("Voir tout", "See all") : undefined);

    return html`
      <div class="wrap">
        ${c.title || linkText
          ? html`<div class="header">
              ${c.title ? html`<span class="title">${c.title}</span>` : nothing}
              ${linkText
                ? html`<button
                    class="link"
                    @click=${() => {
                      if (!c.link_path) return;
                      history.pushState(null, "", c.link_path);
                      window.dispatchEvent(new CustomEvent("location-changed"));
                    }}
                  >
                    ${linkText}
                  </button>`
                : nothing}
            </div>`
          : nothing}

        <acd-scroll-row class="row" .snap=${!!c.snap}>
          ${items.map((item) => this._tile(item))}
        </acd-scroll-row>
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
        gap: 8px;
      }

      .header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        padding: 0 2px;
      }
      .title {
        font-size: 15px;
        font-weight: 700;
      }
      .link {
        border: none;
        background: none;
        padding: 0;
        font-family: var(--acd-font);
        font-size: 12.5px;
        color: var(--acd-text-secondary);
        cursor: pointer;
      }
      .link:hover {
        color: var(--acd-text);
      }

      .row {
        --acd-scroll-gap: 8px;
        --acd-scroll-inset: 0 2px;
        --acd-scroll-fade: 14px;
      }

      .tile {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px 14px;
        box-sizing: border-box;
        background: var(--acd-pill);
        border: 1px solid var(--acd-border);
        border-radius: var(--acd-radius-inner);
        box-shadow: var(--acd-shadow);
        cursor: pointer;
        transition: border-color 150ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .tile:hover {
        border-color: var(--acd-accent);
      }
      .tile:focus-visible {
        outline: 2px solid var(--acd-accent);
        outline-offset: 2px;
      }
      .tile.missing {
        cursor: default;
        color: var(--acd-text-secondary);
      }

      .label {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }
      .label-icon {
        flex-shrink: 0;
        --mdc-icon-size: 14px;
        color: var(--acd-text-secondary);
      }
      .label-text {
        font-size: 10.5px;
        color: var(--acd-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .value-row {
        display: flex;
        align-items: baseline;
        gap: 3px;
        min-width: 0;
      }
      .value {
        font-size: 24px;
        font-weight: 700;
        line-height: 1.1;
        letter-spacing: -0.6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unit {
        font-size: 11px;
        font-weight: 500;
        color: var(--acd-text-secondary);
        white-space: nowrap;
      }

      .trend {
        display: flex;
        align-items: baseline;
        gap: 3px;
        font-size: 9.5px;
        font-weight: 600;
        color: var(--acd-text-secondary);
        white-space: nowrap;
        overflow: hidden;
      }
      .trend.up {
        color: var(--acd-success);
      }
      .trend.down {
        color: var(--acd-danger);
      }
      .trend-since {
        font-weight: 400;
        color: var(--acd-text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
    densityStyles(
      ".tile{padding:10px 12px;gap:3px}.value{font-size:21px}", ".trend-since{display:none}.value{font-size:19px}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdStatsRowCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Stats Row Card",
  description:
    "Horizontally scrolling row of KPI tiles: value, unit and trend vs the previous period.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-stats-row-card": AcdStatsRowCard;
  }
}
