import { css, html, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type {
  AcdChartCardConfig,
  AcdChartPeriod,
  HassEntity,
} from "../../types";

const CARD_TYPE = "acd-chart-card";
const REFRESH_MS = 5 * 60 * 1000;

interface Bucket {
  label: string;
  value: number;
}

/** Bucket count and grouping for each period of the selector. */
const PERIODS: Record<
  AcdChartPeriod,
  { count: number; unit: "day" | "month"; ws: "day" | "month" }
> = {
  week: { count: 7, unit: "day", ws: "day" },
  month: { count: 30, unit: "day", ws: "day" },
  year: { count: 12, unit: "month", ws: "month" },
};

export class AcdChartCard extends AcdBaseCard<AcdChartCardConfig> {
  @state() private _period: AcdChartPeriod = "week";
  @state() private _buckets?: Bucket[];
  @state() private _selected?: number;
  @state() private _error = false;

  private _key = "";
  private _fetchedAt = 0;
  private _timer?: number;

  protected override defaults(): Partial<AcdChartCardConfig> {
    return {
      stat_type: "sum",
      default_period: "week",
      periods: ["week", "month", "year"],
      decimals: 1,
      height: 170,
      highlight_max: true,
      show_axis: true,
      show_selector: true,
      bar_radius: 10,
    };
  }

  public override setConfig(config: AcdChartCardConfig): void {
    if (!config.entity) {
      throw new Error("Please define an entity (`entity`).");
    }
    super.setConfig(config);
    this._period = this._config?.default_period ?? "week";
    this._selected = undefined;
    this._buckets = undefined;
    this._key = "";
  }

  public static getStubConfig(hass: {
    states: Record<string, { attributes?: Record<string, unknown> }>;
  }): Partial<AcdChartCardConfig> {
    const energy = Object.keys(hass.states).find(
      (e) =>
        e.startsWith("sensor.") &&
        hass.states[e].attributes?.device_class === "energy"
    );
    return {
      entity:
        energy ??
        Object.keys(hass.states).find((e) => e.startsWith("sensor.")) ??
        "sensor.example",
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-chart-card-editor");
  }

  public getGridOptions(): Record<string, unknown> {
    return { columns: 8, rows: "auto", min_columns: 6 };
  }

  public override getCardSize(): number {
    return 5;
  }

  private get _stateObj(): HassEntity | undefined {
    return this.getEntity(this._config?.entity);
  }

  /* ------------------------------------------------------------ fetching */

  public override connectedCallback(): void {
    super.connectedCallback();
    this._timer = window.setInterval(() => {
      this._fetchedAt = 0;
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

  /** Start of the window, aligned on the bucket boundary. */
  private _windowStart(period: AcdChartPeriod): Date {
    const { count, unit } = PERIODS[period];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (unit === "month") {
      d.setDate(1);
      d.setMonth(d.getMonth() - (count - 1));
    } else {
      d.setDate(d.getDate() - (count - 1));
    }
    return d;
  }

  /** Window start shifted back one bucket, to get a baseline value. */
  private _baselineStart(period: AcdChartPeriod): Date {
    const { unit } = PERIODS[period];
    const d = this._windowStart(period);
    if (unit === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 1);
    return d;
  }

  private _bucketKey(date: Date, unit: "day" | "month"): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    if (unit === "month") return `${y}-${m}`;
    return `${y}-${m}-${String(date.getDate()).padStart(2, "0")}`;
  }

  private _labels(period: AcdChartPeriod): { key: string; label: string }[] {
    const { count, unit } = PERIODS[period];
    const fr = this.hass?.language?.startsWith("fr");
    const locale = fr ? "fr-FR" : "en-GB";
    const start = this._windowStart(period);
    const out: { key: string; label: string }[] = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      if (unit === "month") d.setMonth(start.getMonth() + i);
      else d.setDate(start.getDate() + i);
      let label: string;
      if (unit === "month") {
        label = d.toLocaleDateString(locale, { month: "short" });
      } else if (period === "week") {
        label = d.toLocaleDateString(locale, { weekday: "short" });
      } else {
        label = String(d.getDate());
      }
      out.push({ key: this._bucketKey(d, unit), label: label.replace(".", "") });
    }
    return out;
  }

  private async _maybeFetch(): Promise<void> {
    const c = this._config;
    if (!c || !this.hass) return;
    const key = `${c.entity}|${this._period}|${c.stat_type}`;
    const now = Date.now();
    if (key === this._key && now - this._fetchedAt < REFRESH_MS) return;
    this._key = key;
    this._fetchedAt = now;

    const slots = this._labels(this._period);
    const byKey = new Map(slots.map((s) => [s.key, 0]));
    let ok = false;
    let hasValue = false;

    // 1) Long-term statistics — the accurate source for energy meters.
    if (this.hass.callWS) {
      try {
        const res = await this.hass.callWS<
          Record<
            string,
            Array<{ start: number | string; sum?: number; mean?: number;
              max?: number; min?: number }>
          >
        >({
          type: "recorder/statistics_during_period",
          // On recule d'un pas : sans la valeur du bucket précédent, la
          // première barre d'un compteur cumulatif vaudrait toujours 0.
          start_time: this._baselineStart(this._period).toISOString(),
          statistic_ids: [c.entity],
          period: PERIODS[this._period].ws,
          types: ["sum", "mean", "max", "min"],
        });
        const rows = res?.[c.entity] ?? [];
        if (rows.length) {
          const unit = PERIODS[this._period].unit;
          if (c.stat_type === "sum") {
            // Meter totals are cumulative: a bucket is the delta with the next.
            for (let i = 0; i < rows.length; i++) {
              const k = this._bucketKey(new Date(rows[i].start), unit);
              if (!byKey.has(k)) continue;
              const cur = rows[i].sum;
              const prev = i > 0 ? rows[i - 1].sum : undefined;
              if (cur == null) continue;
              const delta = prev != null ? cur - prev : 0;
              byKey.set(k, Math.max(0, Number(delta.toFixed(3))));
            }
            // Des statistiques présentes mais entièrement nulles (compteur
            // dont les stats ont été purgées) ne valent pas mieux qu'une
            // absence : on laisse l'historique brut prendre le relais.
            hasValue = [...byKey.values()].some((v) => v !== 0);
          } else {
            const field = c.stat_type ?? "mean";
            for (const row of rows) {
              const k = this._bucketKey(new Date(row.start), unit);
              const v = (row as Record<string, unknown>)[field];
              if (byKey.has(k) && typeof v === "number") {
                byKey.set(k, v);
                hasValue = true;
              }
            }
          }
          ok = hasValue;
        }
      } catch {
        ok = false;
      }
    }

    // 2) Fallback: raw history, bucketed client-side.
    if (!ok && this.hass.callApi) {
      try {
        const start = this._windowStart(this._period).toISOString();
        const res = await this.hass.callApi<HassEntity[][]>(
          "GET",
          `history/period/${start}?filter_entity_id=${c.entity}` +
            `&minimal_response&no_attributes`
        );
        const rows = res?.[0] ?? [];
        const unit = PERIODS[this._period].unit;
        const acc = new Map<string, number[]>();
        for (const row of rows) {
          const v = Number(row.state);
          if (!Number.isFinite(v)) continue;
          const t = new Date(row.last_changed ?? row.last_updated ?? 0);
          const k = this._bucketKey(t, unit);
          if (!byKey.has(k)) continue;
          (acc.get(k) ?? acc.set(k, []).get(k)!).push(v);
        }
        for (const [k, values] of acc) {
          if (!values.length) continue;
          if (c.stat_type === "sum") {
            byKey.set(k, Math.max(0, values[values.length - 1] - values[0]));
          } else if (c.stat_type === "max") {
            byKey.set(k, Math.max(...values));
          } else if (c.stat_type === "min") {
            byKey.set(k, Math.min(...values));
          } else {
            byKey.set(k, values.reduce((a, b) => a + b, 0) / values.length);
          }
        }
        ok = rows.length > 0;
      } catch {
        ok = false;
      }
    }

    this._error = !ok;
    this._buckets = slots.map((s) => ({
      label: s.label,
      value: byKey.get(s.key) ?? 0,
    }));
  }

  /* -------------------------------------------------------------- render */

  private _unit(): string {
    return (
      this._config?.unit ??
      this._stateObj?.attributes.unit_of_measurement ??
      ""
    );
  }

  private _fmt(n: number): string {
    const d = this._config?.decimals ?? 1;
    return String(Number(n.toFixed(d))).replace(".", ",");
  }

  /** "Nice" axis ceiling so the gridlines land on round numbers. */
  private _niceMax(max: number): number {
    if (max <= 0) return 1;
    const exp = Math.floor(Math.log10(max));
    const base = Math.pow(10, exp);
    const steps = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];
    for (const s of steps) {
      if (max <= s * base) return s * base;
    }
    return 10 * base;
  }

  private _periodLabel(p: AcdChartPeriod): string {
    if (p === "week") return this.t("Semaine", "Week");
    if (p === "month") return this.t("Mois", "Month");
    return this.t("Année", "Year");
  }

  private _selectPeriod(p: AcdChartPeriod, ev: Event): void {
    ev.stopPropagation();
    if (p === this._period) return;
    this._period = p;
    this._selected = undefined;
    this._buckets = undefined;
    this._fetchedAt = 0;
    this._maybeFetch();
  }

  private _selectorTemplate(): TemplateResult | typeof nothing {
    const c = this._config!;
    if (!c.show_selector) return nothing;
    const periods = c.periods?.length ? c.periods : ["week", "month", "year"];
    return html`
      <div class="chips">
        ${(periods as AcdChartPeriod[]).map(
          (p) => html`
            <button
              class="chip ${classMap({ active: p === this._period })}"
              @click=${(ev: Event) => this._selectPeriod(p, ev)}
            >
              ${this._periodLabel(p)}
            </button>
          `
        )}
      </div>
    `;
  }

  private _chartTemplate(buckets: Bucket[]): TemplateResult {
    const c = this._config!;
    const height = c.height ?? 170;
    const radius = c.bar_radius ?? 10;
    const values = buckets.map((b) => b.value);
    const max = this._niceMax(Math.max(...values, 0));
    const maxIndex = values.indexOf(Math.max(...values));
    const active =
      this._selected ?? (c.highlight_max !== false ? maxIndex : -1);
    const ticks = c.show_axis ? [0, 0.2, 0.4, 0.6, 0.8, 1] : [];
    const dense = buckets.length > 12;

    return html`
      <div class="plot" style=${styleMap({ height: `${height}px` })}>
        ${c.show_axis
          ? html`<div class="yaxis">
              ${[...ticks].reverse().map(
                (t) => html`<span>${this._fmt(max * t)}</span>`
              )}
            </div>`
          : nothing}
        <div class="bars ${classMap({ dense })}">
          ${c.show_axis
            ? html`<div class="grid">
                ${ticks.map(() => html`<span></span>`)}
              </div>`
            : nothing}
          ${buckets.map((b, i) => {
            const pct = max > 0 ? (b.value / max) * 100 : 0;
            const isActive = i === active;
            return html`
              <button
                class="bar-wrap"
                title="${b.label} · ${this._fmt(b.value)} ${this._unit()}"
                @click=${(ev: Event) => {
                  ev.stopPropagation();
                  this._selected = this._selected === i ? undefined : i;
                }}
              >
                ${isActive
                  ? html`<span
                      class="bubble"
                      style=${styleMap({ bottom: `calc(${pct}% + 8px)` })}
                      >${this._fmt(b.value)}</span
                    >`
                  : nothing}
                <span
                  class="bar ${classMap({ active: isActive })}"
                  style=${styleMap({
                    height: `${Math.max(pct, 1.5)}%`,
                    borderRadius: `${radius}px`,
                  })}
                ></span>
              </button>
            `;
          })}
        </div>
      </div>

      <div class="xaxis ${classMap({ dense })}">
        ${c.show_axis ? html`<span class="yspacer"></span>` : nothing}
        <div class="labels">
          ${buckets.map(
            (b, i) => html`<span
              class=${classMap({ active: i === active })}
              >${b.label}</span
            >`
          )}
        </div>
      </div>
    `;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const stateObj = this._stateObj;
    if (!stateObj) {
      return html`<ha-card class="error">
        ${this.t("Entité introuvable :", "Entity not found:")} ${c.entity}
      </ha-card>`;
    }

    const unit = this._unit();
    const title =
      (c.title ?? stateObj.attributes.friendly_name ?? c.entity) +
      (unit ? ` (${unit})` : "");

    return html`
      <ha-card>
        <div class="head">
          <span class="title">${title}</span>
          ${this._selectorTemplate()}
        </div>

        ${this._buckets
          ? this._chartTemplate(this._buckets)
          : html`<div
              class="placeholder"
              style=${styleMap({ height: `${c.height ?? 170}px` })}
            >
              ${this.t("Chargement…", "Loading…")}
            </div>`}
        ${this._error
          ? html`<div class="hint">
              ${this.t(
                "Aucune donnée d'historique pour cette entité.",
                "No history data for this entity."
              )}
            </div>`
          : nothing}
      </ha-card>
    `;
  }

  static override styles = [
    tokens,
    css`
      ha-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 16px;
        background: var(--acd-bg-active);
        border: 1px solid transparent;
        border-radius: var(--acd-radius);
        box-shadow: var(--acd-shadow);
        font-family: var(--acd-font);
        color: var(--acd-text);
        height: 100%;
        box-sizing: border-box;
      }
      ha-card.error {
        background: var(--acd-bg);
        border-color: var(--acd-border);
        font-size: 13px;
        color: var(--error-color, #b3261e);
      }

      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .title {
        font-size: 14px;
        font-weight: 600;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .chips {
        display: flex;
        gap: 2px;
        padding: 3px;
        background: rgba(255, 255, 255, 0.45);
        border-radius: 999px;
        flex-shrink: 0;
      }
      .chip {
        border: none;
        background: transparent;
        border-radius: 999px;
        padding: 5px 12px;
        font-family: var(--acd-font);
        font-size: 11.5px;
        font-weight: 600;
        color: var(--acd-text-secondary);
        cursor: pointer;
        transition: background 150ms ease, color 150ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .chip.active {
        background: var(--acd-pill);
        color: var(--acd-text);
        box-shadow: var(--acd-shadow);
      }

      .plot {
        position: relative;
        display: flex;
        gap: 8px;
        min-height: 90px;
      }
      .yaxis {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        flex-shrink: 0;
        font-size: 9.5px;
        font-weight: 500;
        color: var(--acd-text-secondary);
        text-align: right;
        min-width: 26px;
        /* Aligns the labels with the gridlines rather than the rows. */
        transform: translateY(-4px);
      }

      .bars {
        position: relative;
        flex: 1;
        display: flex;
        align-items: flex-end;
        gap: 8px;
        min-width: 0;
      }
      .bars.dense {
        gap: 3px;
      }
      .grid {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column-reverse;
        justify-content: space-between;
        pointer-events: none;
      }
      .grid span {
        display: block;
        height: 1px;
        background: rgba(31, 33, 28, 0.07);
      }

      .bar-wrap {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        border: none;
        background: transparent;
        padding: 0;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .bar {
        display: block;
        width: 100%;
        background: var(--acd-pill);
        transition: height 320ms cubic-bezier(0.25, 1, 0.5, 1),
          background 180ms ease;
      }
      .bar.active {
        background: var(--acd-accent);
      }
      .bar-wrap:hover .bar:not(.active) {
        background: #ffffff;
        filter: brightness(1.02);
      }

      .bubble {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        background: var(--acd-accent);
        color: var(--acd-on-accent);
        font-size: 10.5px;
        font-weight: 700;
        line-height: 1;
        padding: 5px 8px;
        border-radius: 8px;
        white-space: nowrap;
        pointer-events: none;
        z-index: 1;
      }

      .xaxis {
        display: flex;
        gap: 8px;
      }
      .yspacer {
        flex-shrink: 0;
        min-width: 26px;
      }
      .labels {
        flex: 1;
        display: flex;
        gap: 8px;
        min-width: 0;
      }
      .xaxis.dense .labels {
        gap: 3px;
      }
      .labels span {
        flex: 1;
        min-width: 0;
        text-align: center;
        font-size: 10px;
        font-weight: 500;
        color: var(--acd-text-secondary);
        overflow: hidden;
        white-space: nowrap;
      }
      .labels span.active {
        color: var(--acd-text);
        font-weight: 700;
      }
      .xaxis.dense .labels span {
        font-size: 8.5px;
      }

      .placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: var(--acd-text-secondary);
      }
      .hint {
        font-size: 11px;
        color: var(--acd-text-secondary);
      }
    `,
    densityStyles(
      "ha-card{padding:12px;gap:8px}.title{font-size:12.5px}.chip{padding:4px 9px;font-size:10.5px}.yaxis{font-size:8.5px;min-width:20px}.yspacer{min-width:20px}.labels span{font-size:9px}", ".yaxis{display:none}.yspacer{display:none}.grid{display:none}.bubble{font-size:9.5px;padding:4px 6px}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdChartCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Chart Card",
  description:
    "Rounded bar chart with a Week/Month/Year selector, value bubble and axes.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-chart-card": AcdChartCard;
  }
}
