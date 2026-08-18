import { css, html, nothing, type TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdFanCardConfig, HassEntity } from "../../types";

const CARD_TYPE = "acd-fan-card";

/* fan supported_features bits */
const F_SET_SPEED = 1;
const F_PRESET_MODE = 8;

/** Fallback level count when the entity reports no usable `percentage_step`
 *  (e.g. a fully continuous fan) — a small, generic default rather than a
 *  100-step wall of pills. */
const DEFAULT_LEVELS = 4;

export class AcdFanCard extends AcdBaseCard<AcdFanCardConfig> {
  protected override defaults(): Partial<AcdFanCardConfig> {
    return { show_toggle: true, show_state: true };
  }

  public override setConfig(config: AcdFanCardConfig): void {
    if (!config.entity) {
      throw new Error("Please define an entity (`entity`).");
    }
    super.setConfig(config);
  }

  public static getStubConfig(hass: {
    states: Record<string, unknown>;
  }): Partial<AcdFanCardConfig> {
    return {
      entity:
        Object.keys(hass.states).find((e) => e.startsWith("fan.")) ??
        "fan.example",
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-fan-card-editor");
  }

  public getGridOptions() {
    return { columns: 4, rows: "auto", min_columns: 3 };
  }

  public override getCardSize(): number {
    return 2;
  }

  /* ---------- entity helpers ---------- */

  private get _stateObj(): HassEntity | undefined {
    return this.getEntity(this._config?.entity);
  }

  private _isOn(stateObj: HassEntity): boolean {
    return stateObj.state === "on";
  }

  private _features(stateObj: HassEntity): number {
    return Number(stateObj.attributes.supported_features) || 0;
  }

  private _presetModes(stateObj: HassEntity): string[] {
    return Array.isArray(stateObj.attributes.preset_modes)
      ? stateObj.attributes.preset_modes
      : [];
  }

  /** Power levels shown as pills: config override, else derived from the
   *  entity's own step size — the same math Home Assistant itself uses to
   *  turn a percentage into "how many real speeds does this fan have".
   *  Works identically for a 3-speed ceiling fan or a 6-speed tower fan
   *  without any per-model configuration. */
  private _levelCount(stateObj: HassEntity): number {
    const configured = Number(this._config?.levels);
    if (Number.isFinite(configured) && configured >= 2) {
      return Math.round(configured);
    }
    const step = Number(stateObj.attributes.percentage_step);
    if (Number.isFinite(step) && step > 0) {
      const n = Math.round(100 / step);
      if (n >= 2 && n <= 10) return n;
    }
    return DEFAULT_LEVELS;
  }

  /** Current power level (1..levelCount), 0 when off. */
  private _currentLevel(stateObj: HassEntity, levelCount: number): number {
    if (!this._isOn(stateObj)) return 0;
    const pct = Number(stateObj.attributes.percentage) || 0;
    if (pct <= 0) return 0;
    return Math.max(1, Math.min(levelCount, Math.round((pct / 100) * levelCount)));
  }

  private _capitalize(s: string): string {
    return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  /* ---------- actions ---------- */

  private _toggle = (ev: Event): void => {
    ev.stopPropagation();
    const st = this._stateObj;
    if (!st) return;
    this.hass.callService("fan", this._isOn(st) ? "turn_off" : "turn_on", {
      entity_id: this._config!.entity,
    });
  };

  private _setLevel = (level: number, levelCount: number, ev: Event): void => {
    ev.stopPropagation();
    this.hass.callService("fan", "set_percentage", {
      entity_id: this._config!.entity,
      percentage: Math.round((level / levelCount) * 100),
    });
  };

  private _setPreset = (mode: string, ev: Event): void => {
    ev.stopPropagation();
    this.hass.callService("fan", "set_preset_mode", {
      entity_id: this._config!.entity,
      preset_mode: mode,
    });
  };

  private _openInfo = (): void => {
    this.moreInfo(this._config!.entity);
  };

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
    const icon = c.icon ?? (stateObj.attributes.icon as string) ?? "mdi:fan";
    const features = this._features(stateObj);
    const hasSpeed = !!(features & F_SET_SPEED);
    const presetModes = this._presetModes(stateObj);
    const hasPreset = !!(features & F_PRESET_MODE) && presetModes.length > 0;
    const levelCount = hasSpeed ? this._levelCount(stateObj) : 0;
    const currentLevel = hasSpeed ? this._currentLevel(stateObj, levelCount) : 0;
    const currentPreset = stateObj.attributes.preset_mode as
      | string
      | undefined;

    const stateLabel = !on
      ? this.t("Arrêt", "Off")
      : hasSpeed
        ? `${this.t("Niveau", "Level")} ${currentLevel || 1}/${levelCount}`
        : currentPreset
          ? this._capitalize(currentPreset)
          : this.t("Marche", "On");

    return html`
      <ha-card class=${classMap({ on })}>
        <div class="header">
          <span class="chip ${classMap({ spin: on })}" @click=${this._openInfo}>
            <ha-icon .icon=${icon}></ha-icon>
          </span>
          <div class="titles" @click=${this._openInfo}>
            <span class="name">${name}</span>
            ${c.show_state
              ? html`<span class="secondary">${stateLabel}</span>`
              : nothing}
          </div>
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

        ${hasSpeed && levelCount > 0
          ? html`
              <div class="levels">
                ${Array.from({ length: levelCount }, (_, i) => i + 1).map(
                  (level) => html`
                    <button
                      class="level ${classMap({
                        active: currentLevel === level,
                      })}"
                      aria-label=${`${this.t("Niveau", "Level")} ${level}`}
                      @click=${(ev: Event) =>
                        this._setLevel(level, levelCount, ev)}
                    >
                      ${level}
                    </button>
                  `
                )}
              </div>
            `
          : hasPreset
            ? html`
                <div class="levels">
                  ${presetModes.map(
                    (mode) => html`
                      <button
                        class="level preset ${classMap({
                          active: on && currentPreset === mode,
                        })}"
                        @click=${(ev: Event) => this._setPreset(mode, ev)}
                      >
                        ${this._capitalize(mode)}
                      </button>
                    `
                  )}
                </div>
              `
            : nothing}
      </ha-card>
    `;
  }

  static override styles = [
    tokens,
    css`
      ha-card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: var(--acd-space-6);
        padding: var(--acd-space-8);
        background: var(--acd-bg);
        border: 1px solid var(--acd-border);
        border-radius: var(--acd-radius);
        box-shadow: var(--acd-shadow);
        font-family: var(--acd-font);
        color: var(--acd-text);
        transition: background var(--acd-motion), border-color var(--acd-motion);
        height: 100%;
        box-sizing: border-box;
      }
      ha-card.on {
        background: var(--acd-bg-active);
        border-color: transparent;
      }
      ha-card.error {
        padding: var(--acd-space-8);
        font-size: var(--acd-font-sm);
        color: var(--error-color, #b3261e);
      }

      .header {
        display: flex;
        align-items: center;
        gap: var(--acd-space-4);
      }
      .chip {
        flex-shrink: 0;
        width: 38px;
        height: 38px;
        border-radius: var(--acd-radius-inner);
        background: var(--acd-track);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--acd-text);
        cursor: pointer;
        --mdc-icon-size: var(--acd-icon-md);
      }
      ha-card.on .chip {
        background: rgba(255, 255, 255, 0.55);
      }
      .chip.spin ha-icon {
        animation: acd-fan-spin 2.2s linear infinite;
      }
      @keyframes acd-fan-spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .chip.spin ha-icon {
          animation: none;
        }
      }

      .titles {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--acd-space-1);
        min-width: 0;
        cursor: pointer;
      }
      .name {
        font-size: var(--acd-font-md);
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .secondary {
        font-size: var(--acd-font-xs);
        color: var(--acd-text-secondary);
      }

      .toggle {
        flex-shrink: 0;
        width: 44px;
        height: 26px;
        border-radius: var(--acd-radius-pill);
        border: none;
        padding: 3px;
        background: var(--acd-track);
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: background var(--acd-motion);
      }
      .toggle .knob-t {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--acd-pill);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transition: transform var(--acd-motion);
      }
      .toggle.active {
        background: var(--acd-accent);
      }
      .toggle.active .knob-t {
        transform: translateX(18px);
      }

      .levels {
        display: flex;
        gap: var(--acd-space-2);
      }
      .level {
        flex: 1;
        min-width: 0;
        height: 34px;
        border: none;
        border-radius: var(--acd-radius-pill);
        background: var(--acd-track);
        color: var(--acd-text);
        font-family: var(--acd-font);
        font-size: var(--acd-font-sm);
        font-weight: 600;
        cursor: pointer;
        transition: background var(--acd-motion-fast), color var(--acd-motion-fast);
      }
      .level.preset {
        flex: 1 1 auto;
        padding: 0 var(--acd-space-4);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .level.active {
        background: var(--acd-accent);
        color: var(--acd-on-accent);
      }
    `,
    densityStyles(
      "ha-card{padding:var(--acd-space-6);gap:var(--acd-space-4)}.chip{width:32px;height:32px;--mdc-icon-size:var(--acd-icon-sm)}.name{font-size:var(--acd-font-sm)}.secondary{font-size:var(--acd-font-2xs)}.level{height:28px;font-size:var(--acd-font-xs)}",
      ".secondary{display:none}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdFanCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Fan Card",
  description:
    "Generic fan card: on/off toggle and power-level pills (auto-detected from the entity, not a raw percentage slider).",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-fan-card": AcdFanCard;
  }
}
