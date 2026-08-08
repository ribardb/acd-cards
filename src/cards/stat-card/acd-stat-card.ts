import { css, html, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdStatCardConfig, HassEntity } from "../../types";

const CARD_TYPE = "acd-stat-card";
const REFRESH_MS = 5 * 60 * 1000;

interface HistoryPoint {
  v: number;
  t: number;
}

export class AcdStatCard extends AcdBaseCard<AcdStatCardConfig> {
  @state() private _history?: HistoryPoint[];

  private _histKey = "";
  private _histFetchedAt = 0;
  private _timer?: number;

  protected override defaults(): Partial<AcdStatCardConfig> {
    return {
      show_icon: false,
      show_graph: false,
      show_trend: true,
      graph_hours: 24,
    };
  }

  public override setConfig(config: AcdStatCardConfig): void {
    if (!config.entity) {
      throw new Error("Please define an entity (`entity`).");
    }
    super.setConfig(config);
  }

  public static getStubConfig(hass: {
    states: Record<string, unknown>;
  }): Partial<AcdStatCardConfig> {
    return {
      entity:
        Object.keys(hass.states).find((e) => e.startsWith("sensor.")) ??
        "sensor.example",
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-stat-card-editor");
  }

  public getGridOptions() {
    return { columns: 3, rows: 2, min_columns: 2, max_rows: 3 };
  }

  public override getCardSize(): number {
    return 2;
  }

  /* ---------- data ---------- */

  private get _stateObj(): HassEntity | undefined {
    return this.getEntity(this._config?.entity);
  }

  private _numeric(stateObj: HassEntity): number | undefined {
    const n = Number(stateObj.state);
    return Number.isFinite(n) ? n : undefined;
  }

  private _isBinary(): boolean {
    return this._config?.entity.startsWith("binary_sensor.") ?? false;
  }

  private _unit(stateObj: HassEntity): string {
    return (
      this._config?.unit ??
      (stateObj.attributes.unit_of_measurement as string | undefined) ??
      ""
    );
  }

  private _fmt(n: number): string {
    const d = this._config?.decimals ?? 1;
    return String(Number(n.toFixed(d))).replace(".", ",");
  }

  /* ---------- history ---------- */

  private _wantsHistory(): boolean {
    const c = this._config;
    if (!c || this._isBinary()) return false;
    const st = this._stateObj;
    if (!st || this._numeric(st) == null) return false;
    return !!(c.show_graph || c.show_trend);
  }

  protected override updated(): void {
    this._maybeFetch();
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

  private async _maybeFetch(): Promise<void> {
    if (!this.hass?.callApi || !this._wantsHistory()) return;
    const c = this._config!;
    const key = `${c.entity}|${c.graph_hours ?? 24}`;
    const now = Date.now();
    if (key === this._histKey && now - this._histFetchedAt < REFRESH_MS) {
      return;
    }
    this._histKey = key;
    this._histFetchedAt = now;
    const hours = c.graph_hours ?? 24;
    const start = new Date(now - hours * 3600 * 1000).toISOString();
    try {
      const res = await this.hass.callApi<HassEntity[][]>(
        "GET",
        `history/period/${start}?filter_entity_id=${c.entity}` +
          `&minimal_response&no_attributes`
      );
      const raw = res?.[0] ?? [];
      const points: HistoryPoint[] = [];
      for (const item of raw) {
        const v = Number(item.state);
        if (!Number.isFinite(v)) continue;
        points.push({
          v,
          t: new Date(item.last_changed ?? item.last_updated ?? 0).getTime(),
        });
      }
      const st = this._stateObj;
      const cur = st ? this._numeric(st) : undefined;
      if (cur != null) points.push({ v: cur, t: now });
      this._history = points;
    } catch {
      this._history = undefined;
    }
  }

  /* ---------- pieces ---------- */

  private _trend(): { dir: "up" | "down" | "flat"; delta: number } | undefined {
    const h = this._history;
    if (!h || h.length < 2) return undefined;
    const delta = h[h.length - 1].v - h[0].v;
    const dir = Math.abs(delta) < 1e-9 ? "flat" : delta > 0 ? "up" : "down";
    return { dir, delta };
  }

  private _sparkline(): TemplateResult | typeof nothing {
    const h = this._history;
    if (!h || h.length < 2) return nothing;
    const min = Math.min(...h.map((p) => p.v));
    const max = Math.max(...h.map((p) => p.v));
    const span = Math.max(max - min, 1e-9);
    const t0 = h[0].t;
    const tSpan = Math.max(h[h.length - 1].t - t0, 1);
    const pts = h.map((p) => {
      const x = ((p.t - t0) / tSpan) * 100;
      const y = 36 - ((p.v - min) / span) * 32;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return html`
      <svg
        class="spark"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon
          class="spark-fill"
          points="0,40 ${pts.join(" ")} 100,40"
        ></polygon>
        <polyline class="spark-line" points=${pts.join(" ")}></polyline>
      </svg>
    `;
  }

  private _display(stateObj: HassEntity): { value: string; unit: string } {
    const num = this._numeric(stateObj);
    if (num != null) return { value: this._fmt(num), unit: this._unit(stateObj) };
    const c = this._config!;
    if (this._isBinary()) {
      const on = stateObj.state === "on";
      const label = on
        ? c.state_on ?? this.t("Activé", "On")
        : c.state_off ?? this.t("Désactivé", "Off");
      return { value: label, unit: "" };
    }
    const formatted =
      this.hass?.formatEntityState?.(stateObj) ?? stateObj.state;
    return { value: formatted, unit: "" };
  }

  /* ---------- render ---------- */

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const stateObj = this._stateObj;
    if (!stateObj) {
      return html`<ha-card class="error">
        ${this.t("Entité introuvable :", "Entity not found:")} ${c.entity}
      </ha-card>`;
    }

    const name =
      c.name ?? (stateObj.attributes.friendly_name as string) ?? c.entity;
    const icon =
      c.icon ?? (stateObj.attributes.icon as string) ?? "mdi:chart-box-outline";
    const { value, unit } = this._display(stateObj);
    const isBinary = this._isBinary();
    const on = isBinary && stateObj.state === "on";
    const numeric = this._numeric(stateObj) != null;
    const trend = c.show_trend && numeric ? this._trend() : undefined;
    const graph = c.show_graph && numeric;
    const hours = c.graph_hours ?? 24;

    return html`
      <ha-card
        class=${classMap({ on })}
        @click=${() => this.moreInfo(c.entity)}
      >
        <div class="label">
          ${c.show_icon
            ? html`<ha-icon class="label-icon" .icon=${icon}></ha-icon>`
            : nothing}
          <span class="label-text">${name}</span>
        </div>

        <div class="value-row">
          <span
            class="value"
            style=${styleMap({
              fontSize: c.value_size ? `${c.value_size}px` : undefined,
            })}
            >${value}</span
          >
          ${unit
            ? html`<span
                class="unit"
                style=${styleMap({
                  fontSize: c.value_size
                    ? `${Math.max(Math.round(c.value_size / 2), 10)}px`
                    : undefined,
                })}
                >${unit}</span
              >`
            : nothing}
        </div>

        ${trend
          ? html`<div class="trend-row">
              <span class="delta ${trend.dir}">
                ${trend.dir === "down" ? "↓" : trend.dir === "up" ? "↑" : "→"}
                ${trend.dir === "flat"
                  ? nothing
                  : html`${trend.delta > 0 ? "+" : "-"}${this._fmt(
                      Math.abs(trend.delta)
                    )}${unit}`}
              </span>
              <span class="since"
                >${hours === 24
                  ? this.t("Depuis 24 h", "Since 24 h")
                  : this.t(`Depuis ${hours} h`, `Since ${hours} h`)}</span
              >
            </div>`
          : nothing}

        ${graph ? this._sparkline() : nothing}
      </ha-card>
    `;
  }

  static override styles = [
    tokens,
    css`
      ha-card {
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 9px 12px;
        background: var(--acd-pill);
        border: 1px solid var(--acd-border);
        border-radius: var(--acd-radius-inner);
        box-shadow: var(--acd-shadow);
        font-family: var(--acd-font);
        color: var(--acd-text);
        transition: background 180ms ease, border-color 180ms ease;
        height: 100%;
        box-sizing: border-box;
        cursor: pointer;
        /* Texte ancré en haut : les libellés de la rangée s'alignent
           entre eux quelle que soit la hauteur allouée à la tuile. */
        justify-content: flex-start;
      }
      ha-card.on {
        background: var(--acd-bg-active);
        border-color: transparent;
      }
      ha-card.error {
        padding: 9px 12px;
        font-size: 13px;
        color: var(--error-color, #b3261e);
        cursor: default;
      }

      .label {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
      }
      .label-icon {
        flex-shrink: 0;
        --mdc-icon-size: 15px;
        color: var(--acd-text-secondary);
      }
      .label-text {
        font-size: 12.5px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .value-row {
        display: flex;
        align-items: baseline;
        gap: 5px;
      }
      .value {
        font-size: 26px;
        font-weight: 700;
        line-height: 1.05;
        letter-spacing: -0.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unit {
        font-size: 13px;
        font-weight: 500;
        color: var(--acd-text);
      }

      .trend-row {
        display: flex;
        align-items: baseline;
        gap: 4px;
        font-size: 10.5px;
        white-space: nowrap;
        overflow: hidden;
        margin-top: 1px;
      }
      .delta {
        font-weight: 600;
        color: var(--acd-text-secondary);
      }
      .delta.up {
        color: #4c9a5f;
      }
      .delta.down {
        color: #c26a5a;
      }
      .since {
        color: var(--acd-text-secondary);
      }

      .spark {
        width: calc(100% + 28px);
        margin: 4px -14px -12px;
        height: 32px;
        display: block;
        flex-shrink: 0;
      }
      .spark-line {
        fill: none;
        stroke: var(--acd-accent);
        stroke-width: 2;
        stroke-linejoin: round;
        stroke-linecap: round;
        vector-effect: non-scaling-stroke;
        opacity: 0.85;
      }
      .spark-fill {
        fill: var(--acd-accent);
        opacity: 0.08;
      }
    `,
    densityStyles(
      "ha-card{padding:8px 10px}.label-text{font-size:10.5px}.value{font-size:18px!important}.unit{font-size:10px!important}.trend-row{font-size:9px}", ".trend-row .since{display:none}.value{font-size:16px!important}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdStatCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Stat Card",
  description:
    "KPI tile: big value, icon, optional 24h sparkline and trend delta.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-stat-card": AcdStatCard;
  }
}
