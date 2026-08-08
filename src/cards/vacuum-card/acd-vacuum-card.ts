import { css, html, nothing, type TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { resolveImage } from "../../shared/assets";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdVacuumCardConfig, HassEntity } from "../../types";

const CARD_TYPE = "acd-vacuum-card";

/** vacuum supported_features bitmask (subset we act on). */
const SUPPORT_PAUSE = 4;
const SUPPORT_RETURN_HOME = 16;
const SUPPORT_LOCATE = 512;

const STATE_FR: Record<string, string> = {
  cleaning: "Nettoyage",
  docked: "À la base",
  paused: "En pause",
  idle: "En attente",
  returning: "Retour à la base",
  error: "Erreur",
  off: "Arrêté",
  on: "En marche",
  unavailable: "Indisponible",
};

const STATE_EN: Record<string, string> = {
  cleaning: "Cleaning",
  docked: "Docked",
  paused: "Paused",
  idle: "Idle",
  returning: "Returning",
  error: "Error",
  off: "Off",
  on: "On",
  unavailable: "Unavailable",
};

export class AcdVacuumCard extends AcdBaseCard<AcdVacuumCardConfig> {
  protected override defaults(): Partial<AcdVacuumCardConfig> {
    return {
      show_toggle: true,
      show_battery: true,
      show_actions: false,
      show_state: true,
      image: "robot",
      image_size: 62,
    };
  }

  public override setConfig(config: AcdVacuumCardConfig): void {
    if (!config.entity) {
      throw new Error("Please define a vacuum entity (`entity`).");
    }
    super.setConfig(config);
  }

  public static getStubConfig(hass: {
    states: Record<string, unknown>;
  }): Partial<AcdVacuumCardConfig> {
    return {
      entity:
        Object.keys(hass.states).find((e) => e.startsWith("vacuum.")) ??
        "vacuum.example",
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-vacuum-card-editor");
  }

  public getGridOptions(): Record<string, unknown> {
    return { columns: 4, rows: "auto", min_columns: 3 };
  }

  public override getCardSize(): number {
    return 3;
  }

  private get _stateObj(): HassEntity | undefined {
    return this.getEntity(this._config?.entity);
  }

  /* -------------------------------------------------------------- state */

  private _isRunning(stateObj: HassEntity): boolean {
    return ["cleaning", "returning", "on"].includes(stateObj.state);
  }

  private _stateLabel(stateObj: HassEntity): string {
    const map = this.hass?.language?.startsWith("fr") ? STATE_FR : STATE_EN;
    return map[stateObj.state] ?? stateObj.state;
  }

  private _features(stateObj: HassEntity): number {
    return stateObj.attributes.supported_features ?? 0;
  }

  private _battery(stateObj: HassEntity): number | undefined {
    const override = this._config?.battery_entity;
    if (override) {
      const value = Number(this.getEntity(override)?.state);
      return Number.isFinite(value) ? value : undefined;
    }
    const level = Number(stateObj.attributes.battery_level);
    return Number.isFinite(level) ? level : undefined;
  }

  private _batteryIcon(level: number, charging: boolean): string {
    if (charging) return "mdi:battery-charging";
    const step = Math.round(level / 10) * 10;
    if (step >= 100) return "mdi:battery";
    if (step <= 0) return "mdi:battery-outline";
    return `mdi:battery-${step}`;
  }

  /* ------------------------------------------------------------ actions */

  private _service(service: string, ev?: Event): void {
    ev?.stopPropagation();
    this.hass.callService("vacuum", service, {
      entity_id: this._config!.entity,
    });
  }

  private _toggle = (ev: Event): void => {
    ev.stopPropagation();
    const stateObj = this._stateObj;
    if (!stateObj) return;
    this._service(this._isRunning(stateObj) ? "stop" : "start");
  };

  private _openInfo = (): void => {
    this.moreInfo(this._config!.entity);
  };

  /* -------------------------------------------------------------- render */

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const stateObj = this._stateObj;
    if (!stateObj) {
      return html`<ha-card class="error">
        ${this.t("Entité introuvable :", "Entity not found:")} ${c.entity}
      </ha-card>`;
    }

    const running = this._isRunning(stateObj);
    const name = c.name ?? stateObj.attributes.friendly_name ?? c.entity;
    const docked = stateObj.state === "docked";
    const image = resolveImage(docked && !running ? c.image : c.image) ?? "";
    const battery = c.show_battery ? this._battery(stateObj) : undefined;
    const features = this._features(stateObj);
    const subtitle =
      c.subtitle ??
      (c.show_state
        ? this._stateLabel(stateObj)
        : this.t("1 appareil", "1 device"));

    return html`
      <ha-card class=${classMap({ on: running })}>
        <div class="header">
          <div class="titles" @click=${this._openInfo}>
            <span class="name">${name}</span>
            <span class="secondary">${subtitle}</span>
          </div>
          ${c.show_toggle
            ? html`
                <button
                  class="toggle ${classMap({ active: running })}"
                  aria-label=${this.t("Démarrer/arrêter", "Start/stop")}
                  @click=${this._toggle}
                >
                  <span class="knob"></span>
                </button>
              `
            : nothing}
        </div>

        <div class="visual clickable" @click=${this._openInfo}>
          ${image
            ? html`<img
                class="hero ${classMap({ running })}"
                src=${image}
                alt=${name}
                style=${styleMap({ maxWidth: `${c.image_size ?? 62}%` })}
              />`
            : html`<ha-icon icon="mdi:robot-vacuum"></ha-icon>`}
        </div>

        <div class="footer">
          ${battery != null
            ? html`
                <span class="pill">
                  <ha-icon
                    .icon=${this._batteryIcon(battery, docked)}
                  ></ha-icon>
                  <span class="pill-texts">
                    <span class="pill-main">${Math.round(battery)}%</span>
                    <span class="pill-sub"
                      >${this.t("Batterie", "Battery")}</span
                    >
                  </span>
                </span>
              `
            : html`<span></span>`}
          ${c.show_actions
            ? html`
                <div class="actions">
                  ${features & SUPPORT_PAUSE
                    ? html`<button
                        class="abtn"
                        title=${this.t("Pause", "Pause")}
                        @click=${(ev: Event) => this._service("pause", ev)}
                      >
                        <ha-icon icon="mdi:pause"></ha-icon>
                      </button>`
                    : nothing}
                  ${features & SUPPORT_LOCATE
                    ? html`<button
                        class="abtn"
                        title=${this.t("Localiser", "Locate")}
                        @click=${(ev: Event) => this._service("locate", ev)}
                      >
                        <ha-icon icon="mdi:map-marker"></ha-icon>
                      </button>`
                    : nothing}
                  ${features & SUPPORT_RETURN_HOME
                    ? html`<button
                        class="abtn"
                        title=${this.t("Retour à la base", "Return to base")}
                        @click=${(ev: Event) =>
                          this._service("return_to_base", ev)}
                      >
                        <ha-icon icon="mdi:home-import-outline"></ha-icon>
                      </button>`
                    : nothing}
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
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px 16px;
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
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .secondary {
        font-size: 11.5px;
        color: var(--acd-text-secondary);
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
      .toggle .knob {
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
      .toggle.active .knob {
        transform: translateX(18px);
      }

      .visual {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 96px;
        min-width: 0;
      }
      .visual.clickable {
        cursor: pointer;
      }
      .visual ha-icon {
        --mdc-icon-size: 64px;
        color: var(--acd-text-secondary);
      }
      .hero {
        max-height: 130px;
        object-fit: contain;
        pointer-events: none;
      }
      /* Discrete back-and-forth sweep while the robot is cleaning. */
      .hero.running {
        animation: acd-sweep 2.6s ease-in-out infinite;
      }
      @keyframes acd-sweep {
        0%,
        100% {
          transform: translateX(-6px);
        }
        50% {
          transform: translateX(6px);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .hero.running {
          animation: none;
        }
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 5px 12px 5px 9px;
        background: var(--acd-pill);
        border: 1px solid var(--acd-border);
        border-radius: 999px;
        box-shadow: var(--acd-shadow);
        --mdc-icon-size: 17px;
        color: var(--acd-text);
      }
      .pill-texts {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
      }
      .pill-main {
        font-size: 12px;
        font-weight: 700;
      }
      .pill-sub {
        font-size: 9.5px;
        color: var(--acd-text-secondary);
      }

      .actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }
      .abtn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        background: var(--acd-track);
        color: var(--acd-text);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: 18px;
        transition: background 120ms ease, color 120ms ease;
      }
      .abtn:active {
        background: var(--acd-accent);
        color: var(--acd-on-accent);
      }
    `,
    densityStyles(
      "ha-card{padding:12px;gap:8px}.visual{min-height:74px}.hero{max-height:96px}.name{font-size:13.5px}", ".visual{display:none}.pill-sub{display:none}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdVacuumCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Vacuum Card",
  description:
    "Robot vacuum tile: start/stop toggle, illustration, battery pill and dock actions.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-vacuum-card": AcdVacuumCard;
  }
}
