import {
  css,
  html,
  svg,
  nothing,
  type TemplateResult,
  type SVGTemplateResult,
} from "lit";
import { state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdClimateCardConfig, HassEntity } from "../../types";

const CARD_TYPE = "acd-climate-card";

/* Gauge geometry: 270° sweep, starting bottom-left (135°), SVG y-down. */
const START = 135;
const SWEEP = 270;
const CX = 110;
const CY = 110;
const R = 82;

const MODE_ICONS: Record<string, string> = {
  off: "mdi:power",
  heat: "mdi:fire",
  cool: "mdi:snowflake",
  heat_cool: "mdi:sun-snowflake-variant",
  auto: "mdi:thermostat-auto",
  dry: "mdi:water-percent",
  fan_only: "mdi:fan",
};

const MODE_FR: Record<string, string> = {
  off: "Arrêt",
  heat: "Chauffage",
  cool: "Climatisation",
  heat_cool: "Chaud/Froid",
  auto: "Auto",
  dry: "Déshumidification",
  fan_only: "Ventilation",
};

const MODE_EN: Record<string, string> = {
  off: "Off",
  heat: "Heat",
  cool: "Cool",
  heat_cool: "Heat/Cool",
  auto: "Auto",
  dry: "Dry",
  fan_only: "Fan only",
};

const ACTION_FR: Record<string, string> = {
  heating: "Chauffe…",
  cooling: "Refroidit…",
  drying: "Déshumidifie…",
  fan: "Ventile…",
  idle: "Inactif",
  off: "Arrêt",
};

const ACTION_EN: Record<string, string> = {
  heating: "Heating…",
  cooling: "Cooling…",
  drying: "Drying…",
  fan: "Fan…",
  idle: "Idle",
  off: "Off",
};

export class AcdClimateCard extends AcdBaseCard<AcdClimateCardConfig> {
  @state() private _drag?: number;

  protected override defaults(): Partial<AcdClimateCardConfig> {
    return {
      show_toggle: true,
      show_modes: true,
      show_current: true,
      compact: false,
      unit: "°C",
    };
  }

  public override setConfig(config: AcdClimateCardConfig): void {
    if (!config.entity) {
      throw new Error("Please define a climate entity (`entity`).");
    }
    super.setConfig(config);
  }

  public static getStubConfig(hass: {
    states: Record<string, unknown>;
  }): Partial<AcdClimateCardConfig> {
    return {
      entity:
        Object.keys(hass.states).find((e) => e.startsWith("climate.")) ??
        "climate.example",
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-climate-card-editor");
  }

  public getGridOptions() {
    return { columns: 6, rows: "auto", min_columns: 4 };
  }

  public override getCardSize(): number {
    // Sans cadran, la tuile compacte tient sur deux rangées de masonry.
    return this._config?.compact ? 2 : 5;
  }

  /* ---------- data ---------- */

  private get _stateObj(): HassEntity | undefined {
    return this.getEntity(this._config?.entity);
  }

  private _min(stateObj: HassEntity): number {
    return this._config?.min ?? stateObj.attributes.min_temp ?? 7;
  }

  private _max(stateObj: HassEntity): number {
    return this._config?.max ?? stateObj.attributes.max_temp ?? 35;
  }

  private _step(stateObj: HassEntity): number {
    return this._config?.step ?? stateObj.attributes.target_temp_step ?? 0.5;
  }

  private _target(stateObj: HassEntity): number | undefined {
    return stateObj.attributes.temperature ?? undefined;
  }

  private _displayTarget(stateObj: HassEntity): number | undefined {
    return this._drag ?? this._target(stateObj);
  }

  private _fmt(n: number): string {
    return String(Math.round(n * 10) / 10).replace(".", ",");
  }

  private _isOn(stateObj: HassEntity): boolean {
    return stateObj.state !== "off" && stateObj.state !== "unavailable";
  }

  /* ---------- actions ---------- */

  private _toggle = (ev: Event): void => {
    ev.stopPropagation();
    const st = this._stateObj;
    if (!st) return;
    this.hass.callService(
      "climate",
      this._isOn(st) ? "turn_off" : "turn_on",
      { entity_id: this._config!.entity }
    );
  };

  private _setTemp(value: number): void {
    this.hass.callService("climate", "set_temperature", {
      entity_id: this._config!.entity,
      temperature: Math.round(value * 10) / 10,
    });
  }

  private _nudge = (dir: number, ev: Event): void => {
    ev.stopPropagation();
    const st = this._stateObj;
    if (!st) return;
    const cur = this._target(st);
    if (cur == null) return;
    const next = Math.min(
      this._max(st),
      Math.max(this._min(st), cur + dir * this._step(st))
    );
    this._setTemp(next);
  };

  private _cycleMode = (ev: Event): void => {
    ev.stopPropagation();
    const st = this._stateObj;
    if (!st) return;
    const modes: string[] = st.attributes.hvac_modes ?? [];
    if (!modes.length) return;
    const idx = modes.indexOf(st.state);
    const next = modes[(idx + 1) % modes.length];
    this.hass.callService("climate", "set_hvac_mode", {
      entity_id: this._config!.entity,
      hvac_mode: next,
    });
  };

  private _openInfo = (): void => {
    this.moreInfo(this._config!.entity);
  };

  /* ---------- dial drag ---------- */

  private _valueFromPointer(ev: PointerEvent): number | undefined {
    const st = this._stateObj;
    if (!st) return undefined;
    const svg = this.renderRoot.querySelector(".dial") as SVGElement | null;
    if (!svg) return undefined;
    const rect = svg.getBoundingClientRect();
    const dx = ev.clientX - (rect.left + rect.width / 2);
    const dy = ev.clientY - (rect.top + rect.height / 2);
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    let t = (deg - START + 360) % 360;
    if (t > SWEEP) t = t - SWEEP < (360 - SWEEP) / 2 ? SWEEP : 0;
    const min = this._min(st);
    const max = this._max(st);
    const step = this._step(st);
    const raw = min + (t / SWEEP) * (max - min);
    return Math.min(max, Math.max(min, Math.round(raw / step) * step));
  }

  private _onPointerDown = (ev: PointerEvent): void => {
    const st = this._stateObj;
    if (!st || !this._isOn(st) || this._target(st) == null) return;
    ev.preventDefault();
    ev.stopPropagation();
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    this._drag = this._valueFromPointer(ev);
  };

  private _onPointerMove = (ev: PointerEvent): void => {
    if (this._drag === undefined) return;
    ev.preventDefault();
    this._drag = this._valueFromPointer(ev) ?? this._drag;
  };

  private _onPointerUp = (ev: PointerEvent): void => {
    if (this._drag === undefined) return;
    const el = ev.currentTarget as Element;
    if (el.hasPointerCapture(ev.pointerId)) {
      el.releasePointerCapture(ev.pointerId);
    }
    const value = this._drag;
    this._drag = undefined;
    if (value != null) this._setTemp(value);
  };

  private _onPointerCancel = (): void => {
    this._drag = undefined;
  };

  /* ---------- dial rendering ---------- */

  private _point(angleDeg: number, radius: number): [number, number] {
    const rad = (angleDeg * Math.PI) / 180;
    return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
  }

  private _arcPath(fromDeg: number, toDeg: number): string {
    const [x0, y0] = this._point(fromDeg, R);
    const [x1, y1] = this._point(toDeg, R);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  private _ticks(): SVGTemplateResult[] {
    const ticks: SVGTemplateResult[] = [];
    const n = 44;
    for (let i = 0; i <= n; i++) {
      const a = START + (SWEEP / n) * i;
      const [x0, y0] = this._point(a, 62);
      const [x1, y1] = this._point(a, 69);
      ticks.push(
        svg`<line
          x1=${x0.toFixed(1)}
          y1=${y0.toFixed(1)}
          x2=${x1.toFixed(1)}
          y2=${y1.toFixed(1)}
        ></line>`
      );
    }
    return ticks;
  }

  private _dial(stateObj: HassEntity): TemplateResult {
    const on = this._isOn(stateObj);
    const target = this._displayTarget(stateObj);
    const min = this._min(stateObj);
    const max = this._max(stateObj);
    const frac =
      target != null
        ? Math.min(1, Math.max(0, (target - min) / Math.max(max - min, 1e-9)))
        : 0;
    const end = START + SWEEP * frac;
    const [kx, ky] = this._point(end, R);
    const interactive = on && this._target(stateObj) != null;

    return html`
      <svg
        class="dial ${classMap({ on, interactive, dragging: this._drag != null })}"
        viewBox="0 0 220 220"
        xmlns="http://www.w3.org/2000/svg"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
      >
        <path class="band" d=${this._arcPath(START, START + SWEEP)}></path>
        <g class="ticks">${this._ticks()}</g>
        ${target != null && frac > 0.001
          ? svg`<path
              class="arc ${classMap({ muted: !on })}"
              d=${this._arcPath(START, end)}
            ></path>`
          : nothing}
        ${target != null
          ? svg`<g class="knob-g">
              <circle
                class="knob ${classMap({ muted: !on })}"
                cx=${kx.toFixed(2)}
                cy=${ky.toFixed(2)}
                r="13"
              ></circle>
              <circle class="knob-dot" cx=${kx.toFixed(2)} cy=${ky.toFixed(2)} r="4.5"></circle>
            </g>`
          : nothing}
      </svg>
    `;
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

    const on = this._isOn(stateObj);
    const name =
      c.name ?? (stateObj.attributes.friendly_name as string) ?? c.entity;
    const target = this._displayTarget(stateObj);
    const current = stateObj.attributes.current_temperature as
      | number
      | undefined;
    const fr = this.hass.language?.startsWith("fr");
    const modeLabel =
      (fr ? MODE_FR : MODE_EN)[stateObj.state] ?? stateObj.state;
    const modeIcon = MODE_ICONS[stateObj.state] ?? "mdi:thermostat";
    const action = stateObj.attributes.hvac_action as string | undefined;
    const actionLabel = action
      ? ((fr ? ACTION_FR : ACTION_EN)[action] ?? action)
      : undefined;

    const compact = !!c.compact;

    return html`
      <ha-card class=${classMap({ on, compact })}>
        <div class="header">
          ${compact
            ? html`<span class="chip clickable" @click=${this._openInfo}>
                <ha-icon .icon=${modeIcon}></ha-icon>
              </span>`
            : nothing}
          <div class="titles" @click=${this._openInfo}>
            <span class="name">${name}</span>
            <span class="secondary">
              ${actionLabel ?? modeLabel}
            </span>
          </div>
          ${compact
            ? html`
                <div class="reading">
                  <button
                    class="pill"
                    aria-label="-"
                    .disabled=${!on}
                    @click=${(ev: Event) => this._nudge(-1, ev)}
                  >
                    −
                  </button>
                  <span
                    class="temp-inline ${classMap({ off: !on })}"
                    @click=${this._openInfo}
                  >
                    ${target != null
                      ? html`${this._fmt(target)}<span class="deg"
                            >${c.unit}</span
                          >`
                      : html`<span class="off-label"
                          >${this.t("Arrêt", "Off")}</span
                        >`}
                  </span>
                  <button
                    class="pill"
                    aria-label="+"
                    .disabled=${!on}
                    @click=${(ev: Event) => this._nudge(1, ev)}
                  >
                    +
                  </button>
                </div>
              `
            : nothing}
          ${c.show_toggle
            ? html`
                <button
                  class="toggle ${classMap({ active: on })}"
                  aria-label=${this.t("Marche/arrêt", "Toggle")}
                  @click=${this._toggle}
                >
                  <span class="knob-t"></span>
                </button>
              `
            : nothing}
        </div>

        ${compact
          ? nothing
          : html`
              <div class="dial-wrap">
                ${this._dial(stateObj)}
                <div class="center" @click=${this._openInfo}>
                  <span class="temp ${classMap({ off: !on })}">
                    ${target != null
                      ? html`${this._fmt(target)}<span class="deg"
                            >${c.unit}</span
                          >`
                      : html`<span class="off-label"
                          >${this.t("Arrêt", "Off")}</span
                        >`}
                  </span>
                </div>
                <div class="steppers">
                  <button
                    class="pill"
                    aria-label="-"
                    .disabled=${!on}
                    @click=${(ev: Event) => this._nudge(-1, ev)}
                  >
                    −
                  </button>
                  <button
                    class="pill"
                    aria-label="+"
                    .disabled=${!on}
                    @click=${(ev: Event) => this._nudge(1, ev)}
                  >
                    +
                  </button>
                </div>
              </div>
            `}

        <div class="footer">
          ${c.show_modes
            ? html`
                <button
                  class="foot-item mode"
                  title=${this.t("Changer de mode", "Cycle mode")}
                  @click=${this._cycleMode}
                >
                  <span class="foot-chip">
                    <ha-icon .icon=${modeIcon}></ha-icon>
                  </span>
                  <span class="foot-texts">
                    <span class="foot-main">${modeLabel}</span>
                    <span class="foot-sub"
                      >${this.t("Mode", "Mode")}</span
                    >
                  </span>
                </button>
              `
            : html`<span></span>`}
          ${c.show_current && current != null
            ? html`
                <div class="foot-item">
                  <span class="foot-chip outlined">
                    <ha-icon icon="mdi:thermometer"></ha-icon>
                  </span>
                  <span class="foot-texts">
                    <span class="foot-main"
                      >${this._fmt(current)}${c.unit}</span
                    >
                    <span class="foot-sub"
                      >${this.t("Actuelle", "Current")}</span
                    >
                  </span>
                </div>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  static override styles = [
    tokens,
    css`
      ha-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px;
        background: var(--acd-bg);
        border: 1px solid var(--acd-border);
        border-radius: var(--acd-radius);
        box-shadow: var(--acd-shadow);
        font-family: var(--acd-font);
        color: var(--acd-text);
        transition: background 180ms ease, border-color 180ms ease;
        height: 100%;
        box-sizing: border-box;
      }
      ha-card.on {
        background: var(--acd-bg-active);
        border-color: transparent;
      }
      ha-card.error {
        padding: 16px;
        font-size: 13px;
        color: var(--error-color, #b3261e);
      }

      .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }
      .titles {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        cursor: pointer;
      }
      .name {
        font-size: 15px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .secondary {
        font-size: 12px;
        color: var(--acd-text-secondary);
      }

      /* Mode compact : le cadran disparaît, l'icône de mode passe à gauche
         du titre et la consigne devient une valeur encadrée par les pas
         − / +. Orthogonal à la densité, qui ne joue que sur les tailles. */
      ha-card.compact .header {
        align-items: center;
      }
      ha-card.compact .titles {
        flex: 1;
      }
      .chip {
        flex-shrink: 0;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: var(--acd-track);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--acd-text);
        --mdc-icon-size: 22px;
      }
      .chip.clickable {
        cursor: pointer;
      }
      ha-card.on .chip {
        background: rgba(255, 255, 255, 0.55);
      }
      .reading {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .temp-inline {
        cursor: pointer;
        min-width: 56px;
        text-align: center;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.5px;
        white-space: nowrap;
      }
      .temp-inline.off {
        color: var(--acd-text-secondary);
      }
      .temp-inline .deg {
        font-size: 12px;
        font-weight: 600;
        vertical-align: super;
      }
      .temp-inline .off-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--acd-text-secondary);
      }
      ha-card.compact .pill {
        width: 28px;
        height: 28px;
        font-size: 16px;
      }

      .toggle {
        flex-shrink: 0;
        width: 44px;
        height: 26px;
        border-radius: 13px;
        border: none;
        padding: 3px;
        background: var(--acd-track);
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: background 180ms ease;
      }
      .toggle .knob-t {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--acd-pill);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transition: transform 180ms ease;
      }
      .toggle.active {
        background: var(--acd-accent);
      }
      .toggle.active .knob-t {
        transform: translateX(18px);
      }

      .dial-wrap {
        position: relative;
        width: min(260px, 100%);
        margin: 0 auto;
      }
      .dial {
        display: block;
        width: 100%;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      .dial.interactive {
        cursor: pointer;
      }
      .band {
        fill: none;
        stroke: #e2e2da;
        stroke-width: 20;
        stroke-linecap: round;
      }
      ha-card.on .band {
        stroke: #d9dcd2;
      }
      .ticks line {
        stroke: #c2c2b8;
        stroke-width: 2;
        stroke-linecap: round;
      }
      .arc {
        fill: none;
        stroke: var(--acd-accent);
        stroke-width: 21;
        stroke-linecap: round;
        transition: d 180ms ease;
      }
      .arc.muted {
        stroke: #c6c8bd;
      }
      .dial.dragging .arc {
        transition: none;
      }
      .knob {
        fill: var(--acd-accent);
        transition: cx 180ms ease, cy 180ms ease;
      }
      .knob.muted {
        fill: #b7b9ae;
      }
      .knob-dot {
        fill: #f2f2ec;
        transition: cx 180ms ease, cy 180ms ease;
      }
      .dial.dragging .knob,
      .dial.dragging .knob-dot {
        transition: none;
      }

      .center {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      .center .temp {
        pointer-events: auto;
        cursor: pointer;
        font-size: 38px;
        font-weight: 700;
        letter-spacing: -1px;
      }
      .center .temp.off {
        color: var(--acd-text-secondary);
      }
      .center .deg {
        font-size: 22px;
        font-weight: 600;
        vertical-align: super;
      }
      .center .off-label {
        font-size: 22px;
        font-weight: 600;
        color: var(--acd-text-secondary);
      }

      .steppers {
        position: absolute;
        left: 50%;
        bottom: 6px;
        transform: translateX(-50%);
        display: flex;
        gap: 12px;
      }
      .pill {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: none;
        background: var(--acd-pill);
        box-shadow: 0 1px 4px rgba(20, 24, 18, 0.12);
        color: var(--acd-text-secondary);
        font-size: 18px;
        font-weight: 500;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 120ms ease, color 120ms ease;
      }
      .pill:active {
        background: var(--acd-accent);
        color: var(--acd-on-accent);
        border-color: transparent;
      }
      .pill:disabled {
        opacity: 0.4;
        cursor: default;
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 2px;
      }
      .foot-item {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        border: none;
        background: transparent;
        padding: 0;
        font-family: var(--acd-font);
        color: var(--acd-text);
        text-align: left;
      }
      .foot-item.mode {
        cursor: pointer;
      }
      .foot-chip {
        flex-shrink: 0;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: transparent;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--acd-text);
        --mdc-icon-size: 22px;
      }
      .foot-chip.outlined {
        border: 1.5px solid var(--acd-text);
        --mdc-icon-size: 18px;
      }
      .foot-texts {
        display: flex;
        flex-direction: column;
        gap: 0;
        min-width: 0;
      }
      .foot-main {
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
      }
      .foot-sub {
        font-size: 10.5px;
        color: var(--acd-text-secondary);
        white-space: nowrap;
      }
    `,
    densityStyles(
      "ha-card{padding:12px;gap:6px}.dial-wrap{width:min(200px,100%)}.center .temp{font-size:30px}.center .deg{font-size:17px}.pill{width:30px;height:30px;font-size:16px}.foot-sub{display:none}.foot-chip{width:28px;height:28px;--mdc-icon-size:18px}.chip{width:32px;height:32px;border-radius:10px;--mdc-icon-size:19px}.temp-inline{font-size:17px;min-width:48px}ha-card.compact .pill{width:26px;height:26px;font-size:15px}", ".dial-wrap{width:min(150px,100%)}.center .temp{font-size:23px}.center .deg{font-size:13px}.footer{display:none}.chip{width:28px;height:28px;--mdc-icon-size:17px}.temp-inline{font-size:15px;min-width:42px}ha-card.compact .reading .pill{display:none}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdClimateCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Climate Card",
  description:
    "Thermostat dial with draggable arc, +/- steppers, mode and current temperature.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-climate-card": AcdClimateCard;
  }
}
