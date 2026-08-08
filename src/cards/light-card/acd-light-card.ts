import { css, html, nothing, render, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import { resolveImage } from "../../shared/assets";
import type { AcdLightCardConfig, HassEntity } from "../../types";
import "../../shared/acd-slider";

const CARD_TYPE = "acd-light-card";

const COLOR_MODES = ["hs", "rgb", "rgbw", "rgbww", "xy"];
const HUE_GRADIENT =
  "linear-gradient(to right, hsl(0,85%,62%), hsl(60,85%,55%), hsl(120,70%,50%), hsl(180,75%,50%), hsl(240,80%,62%), hsl(300,80%,60%), hsl(360,85%,62%))";
const CT_GRADIENT = "linear-gradient(to right, #ffb46b, #fff6e8, #bcd4ff)";

export class AcdLightCard extends AcdBaseCard<AcdLightCardConfig> {
  @state() private _open = false;
  @state() private _index = 0;

  private _modalEl?: HTMLElement;

  protected override defaults(): Partial<AcdLightCardConfig> {
    return {
      show_toggle: true,
      show_brightness: true,
      show_color_controls: true,
      show_state: true,
      compact: false,
      info_dialog: "custom",
      image_position: "top",
      image_size: 70,
      image_offset: 0,
    };
  }

  public override setConfig(config: AcdLightCardConfig): void {
    if (!config.entity && !config.entities?.length) {
      throw new Error("Please define a light entity (`entity`).");
    }
    super.setConfig(config);
    this._index = 0;
  }

  public static getStubConfig(hass: {
    states: Record<string, HassEntity>;
  }): Partial<AcdLightCardConfig> {
    const entity = Object.keys(hass.states).find((e) =>
      e.startsWith("light.")
    );
    return { entity: entity ?? "light.example" };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-light-card-editor");
  }

  public getGridOptions() {
    return { columns: 4, rows: "auto", min_columns: 3 };
  }

  /* ---------- entity helpers ---------- */

  private get _entityIds(): string[] {
    const c = this._config!;
    const list = c.entities?.length ? c.entities : [c.entity];
    return list.filter(Boolean);
  }

  private get _activeEntityId(): string {
    const ids = this._entityIds;
    return ids[Math.min(this._index, ids.length - 1)];
  }

  private get _stateObj(): HassEntity | undefined {
    return this.getEntity(this._activeEntityId);
  }

  private _supports(stateObj: HassEntity, modes: string[]): boolean {
    const supported: string[] =
      stateObj.attributes.supported_color_modes ?? [];
    return supported.some((m) => modes.includes(m));
  }

  private get _brightnessPct(): number {
    const b = this._stateObj?.attributes.brightness;
    return b != null ? Math.round((b / 255) * 100) : 0;
  }

  /* ---------- actions ---------- */

  private _toggle = (ev: Event): void => {
    ev.stopPropagation();
    this.hass.callService("light", "toggle", {
      entity_id: this._activeEntityId,
    });
  };

  private _setBrightness = (ev: CustomEvent<number>): void => {
    const pct = ev.detail;
    if (pct === 0) {
      this.hass.callService("light", "turn_off", {
        entity_id: this._activeEntityId,
      });
    } else {
      this.hass.callService("light", "turn_on", {
        entity_id: this._activeEntityId,
        brightness_pct: pct,
      });
    }
  };

  private _setColorTemp = (ev: CustomEvent<number>): void => {
    const stateObj = this._stateObj!;
    const min = stateObj.attributes.min_color_temp_kelvin ?? 2000;
    const max = stateObj.attributes.max_color_temp_kelvin ?? 6500;
    const kelvin = Math.round(min + (ev.detail / 100) * (max - min));
    this.hass.callService("light", "turn_on", {
      entity_id: this._activeEntityId,
      color_temp_kelvin: kelvin,
    });
  };

  private _setHue = (ev: CustomEvent<number>): void => {
    const stateObj = this._stateObj!;
    const hue = Math.round((ev.detail / 100) * 360);
    const currentSat = stateObj.attributes.hs_color?.[1];
    const sat = currentSat != null && currentSat > 10 ? currentSat : 100;
    this.hass.callService("light", "turn_on", {
      entity_id: this._activeEntityId,
      hs_color: [hue, sat],
    });
  };

  private _step(dir: number, ev: Event): void {
    ev.stopPropagation();
    const n = this._entityIds.length;
    this._index = (this._index + dir + n) % n;
  }

  /* ---------- modal (portal in document.body) ---------- */

  /** Opens the configured dialog: ACD modal (default) or native more-info. */
  private _openInfo = (): void => {
    if (this._config?.info_dialog === "native") {
      this.moreInfo(this._activeEntityId);
      return;
    }
    this._openModal();
  };

  private _openModal = (): void => {
    this._open = true;
    window.addEventListener("keydown", this._onKeyDown);
  };

  private _closeModal = (): void => {
    this._open = false;
    window.removeEventListener("keydown", this._onKeyDown);
  };

  private _onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === "Escape") this._closeModal();
  };

  protected override updated(): void {
    this._syncModal();
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._onKeyDown);
    this._destroyModal();
  }

  private _destroyModal(): void {
    this._modalEl?.remove();
    this._modalEl = undefined;
  }

  private _syncModal(): void {
    const stateObj = this._open ? this._stateObj : undefined;
    if (!stateObj) {
      this._destroyModal();
      return;
    }
    if (!this._modalEl) {
      this._modalEl = document.createElement("div");
      document.body.appendChild(this._modalEl);
    }
    render(this._modalTemplate(stateObj), this._modalEl);
  }

  private _modalTemplate(stateObj: HassEntity): TemplateResult {
    const c = this._config!;
    const image = resolveImage(c.image);
    const isOn = stateObj.state === "on";
    const name =
      c.name ?? stateObj.attributes.friendly_name ?? this._activeEntityId;
    const icon = c.icon ?? stateObj.attributes.icon ?? "mdi:lamp";
    const supportsBrightness =
      stateObj.attributes.supported_color_modes?.some(
        (m: string) => m !== "onoff"
      ) ?? false;
    const supportsCT = this._supports(stateObj, ["color_temp"]);
    const supportsColor = this._supports(stateObj, COLOR_MODES);
    const min = stateObj.attributes.min_color_temp_kelvin ?? 2000;
    const max = stateObj.attributes.max_color_temp_kelvin ?? 6500;
    const kelvin = stateObj.attributes.color_temp_kelvin;
    const ctPct =
      kelvin != null ? ((kelvin - min) / Math.max(max - min, 1)) * 100 : 50;
    const hue = stateObj.attributes.hs_color?.[0];
    const huePct = hue != null ? (hue / 360) * 100 : 0;

    return html`
      <style>
        .acd-lm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(28, 30, 26, 0.4);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          z-index: 998;
        }
        .acd-lm-panel {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(380px, calc(100vw - 40px));
          max-height: calc(100vh - 48px);
          overflow: auto;
          background: var(--acd-card-background, #fcfcfa);
          border-radius: 24px;
          padding: 20px;
          z-index: 999;
          box-shadow: 0 16px 48px rgba(20, 24, 18, 0.22);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
          color: var(--acd-text-color, #1f211c);
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }
        .acd-lm-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .acd-lm-titles {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .acd-lm-name {
          font-size: 16px;
          font-weight: 600;
        }
        .acd-lm-secondary {
          font-size: 12px;
          color: var(--acd-text-secondary-color, #9a9c95);
        }
        .acd-lm-close {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: var(--acd-track-color, rgba(31, 33, 28, 0.08));
          color: var(--acd-text-color, #1f211c);
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .acd-lm-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 110px;
        }
        .acd-lm-visual img {
          max-width: 100%;
          max-height: 130px;
          object-fit: contain;
        }
        .acd-lm-visual ha-icon {
          --mdc-icon-size: 84px;
          color: var(--acd-text-secondary-color, #9a9c95);
          transition: color 180ms ease, filter 180ms ease;
        }
        .acd-lm-visual.lit ha-icon {
          color: #e8b84b;
          filter: drop-shadow(0 0 18px rgba(232, 184, 75, 0.55));
        }
        .acd-lm-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: var(--acd-text-secondary-color, #9a9c95);
          margin-bottom: 4px;
        }
        .acd-lm-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 2px;
          font-size: 14px;
          font-weight: 500;
        }
        .acd-lm-toggle {
          width: 44px;
          height: 26px;
          border-radius: 13px;
          border: none;
          padding: 3px;
          background: var(--acd-track-color, rgba(31, 33, 28, 0.08));
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: background 180ms ease;
        }
        .acd-lm-toggle .knob {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: transform 180ms ease;
        }
        .acd-lm-toggle.active {
          background: var(--acd-accent-color, #333a2d);
        }
        .acd-lm-toggle.active .knob {
          transform: translateX(18px);
        }
      </style>
      <div class="acd-lm-backdrop" @click=${this._closeModal}></div>
      <div class="acd-lm-panel" role="dialog" aria-modal="true">
        <div class="acd-lm-header">
          <div class="acd-lm-titles">
            <span class="acd-lm-name">${name}</span>
            <span class="acd-lm-secondary"
              >${this._secondary(stateObj, isOn)}</span
            >
          </div>
          <button
            class="acd-lm-close"
            aria-label=${this.t("Fermer", "Close")}
            @click=${this._closeModal}
          >
            ✕
          </button>
        </div>

        <div class="acd-lm-visual ${classMap({ lit: isOn })}">
          ${image
            ? html`<img src=${image} alt=${name} />`
            : html`<ha-icon .icon=${icon}></ha-icon>`}
        </div>

        <div class="acd-lm-toggle-row">
          <span>${isOn ? this.t("Allumé", "On") : this.t("Éteint", "Off")}</span>
          <button
            class="acd-lm-toggle ${classMap({ active: isOn })}"
            aria-label=${this.t("Allumer/éteindre", "Toggle light")}
            @click=${this._toggle}
          >
            <span class="knob"></span>
          </button>
        </div>

        ${supportsBrightness
          ? html`
              <div>
                <span class="acd-lm-label"
                  >${this.t("Luminosité", "Brightness")}</span
                >
                <acd-slider
                  .value=${isOn ? this._brightnessPct : 0}
                  icon="mdi:white-balance-sunny"
                  show-label
                  @value-changed=${this._setBrightness}
                ></acd-slider>
              </div>
            `
          : nothing}
        ${c.show_color_controls && supportsCT
          ? html`
              <div>
                <span class="acd-lm-label"
                  >${this.t("Température", "Temperature")}</span
                >
                <acd-slider
                  thumb
                  .value=${ctPct}
                  .disabled=${!isOn}
                  track=${CT_GRADIENT}
                  @value-changed=${this._setColorTemp}
                ></acd-slider>
              </div>
            `
          : nothing}
        ${c.show_color_controls && supportsColor
          ? html`
              <div>
                <span class="acd-lm-label">${this.t("Couleur", "Color")}</span>
                <acd-slider
                  thumb
                  .value=${huePct}
                  .disabled=${!isOn}
                  track=${HUE_GRADIENT}
                  @value-changed=${this._setHue}
                ></acd-slider>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  /* ---------- card render ---------- */

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const stateObj = this._stateObj;

    if (!stateObj) {
      return html`<ha-card class="error">
        ${this.t("Entité introuvable :", "Entity not found:")}
        ${this._activeEntityId}
      </ha-card>`;
    }

    const image = resolveImage(c.image);
    const isOn = stateObj.state === "on";
    const name =
      (this._entityIds.length > 1
        ? stateObj.attributes.friendly_name
        : c.name ?? stateObj.attributes.friendly_name) ?? this._activeEntityId;
    const icon = c.icon ?? stateObj.attributes.icon ?? "mdi:lamp";
    const groupMembers: string[] | undefined = stateObj.attributes.entity_id;
    const supportsBrightness =
      stateObj.attributes.supported_color_modes?.some(
        (m: string) => m !== "onoff"
      ) ?? false;
    const hasCarousel = this._entityIds.length > 1;
    const showBar = !!(c.show_brightness && supportsBrightness);
    const compact = !!c.compact;

    return html`
      <ha-card class=${classMap({ on: isOn, compact })}>
        ${image && !compact
          ? html`<img
              class="hero ${classMap({ "no-bar": !showBar })}"
              src=${image}
              alt=${name}
              style=${styleMap({
                objectPosition: `center ${c.image_position ?? "top"}`,
                maxWidth: `${c.image_size ?? 70}%`,
                transform: `translateX(-50%) translateY(${
                  c.image_offset ?? 0
                }px)`,
              })}
            />`
          : nothing}
        <div class="header">
          ${compact
            ? html`<span
                class="chip clickable ${classMap({ lit: isOn })}"
                @click=${this._openInfo}
              >
                <ha-icon .icon=${icon}></ha-icon>
              </span>`
            : nothing}
          <div class="titles" @click=${this._openInfo}>
            <span class="name">${name}</span>
            ${c.show_state
              ? html`<span class="secondary"
                  >${this._secondary(stateObj, isOn, groupMembers)}</span
                >`
              : nothing}
          </div>
          ${compact && hasCarousel
            ? html`
                <button class="arrow" @click=${(e: Event) =>
                  this._step(-1, e)}>‹</button>
                <button class="arrow" @click=${(e: Event) =>
                  this._step(1, e)}>›</button>
              `
            : nothing}
          ${c.show_toggle
            ? html`
                <button
                  class="toggle ${classMap({ active: isOn })}"
                  aria-label=${this.t("Allumer/éteindre", "Toggle light")}
                  @click=${this._toggle}
                >
                  <span class="knob"></span>
                </button>
              `
            : nothing}
        </div>

        ${compact
          ? nothing
          : html`
              <div class="body">
                ${hasCarousel
                  ? html`<button class="arrow" @click=${(e: Event) =>
                      this._step(-1, e)}>‹</button>`
                  : nothing}
                <div class="visual clickable ${classMap({ lit: isOn })}" @click=${
                  this._openInfo
                }>
                  ${image ? nothing : html`<ha-icon .icon=${icon}></ha-icon>`}
                </div>
                ${hasCarousel
                  ? html`<button class="arrow" @click=${(e: Event) =>
                      this._step(1, e)}>›</button>`
                  : nothing}
              </div>
            `}

        ${c.show_brightness && supportsBrightness
          ? html`
              <acd-slider
                class="brightness"
                .value=${isOn ? this._brightnessPct : 0}
                icon="mdi:white-balance-sunny"
                show-label
                @value-changed=${this._setBrightness}
              ></acd-slider>
            `
          : nothing}
      </ha-card>
    `;
  }

  private _secondary(
    stateObj: HassEntity,
    isOn: boolean,
    groupMembers?: string[]
  ): string {
    const parts: string[] = [];
    if (groupMembers?.length) {
      parts.push(
        `${groupMembers.length} ${this.t("appareil(s)", "device(s)")}`
      );
    }
    if (isOn) {
      parts.push(
        stateObj.attributes.brightness != null
          ? `${this._brightnessPct}%`
          : this.t("Allumé", "On")
      );
    } else {
      parts.push(this.t("Éteint", "Off"));
    }
    return parts.join(" · ");
  }

  static override styles = [
    tokens,
    css`
      ha-card {
        position: relative;
        overflow: hidden;
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

      /* Image suspendue au bord supérieur de la carte, comme la maquette :
         le câble part du haut de la tuile et le globe descend jusqu'à la
         barre de luminosité. */
      .hero {
        position: absolute;
        top: 0;
        bottom: 88px;
        left: 50%;
        transform: translateX(-50%);
        max-width: 70%;
        object-fit: contain;
        object-position: center top;
        pointer-events: none;
      }
      .hero.no-bar {
        bottom: 16px;
      }
      .header,
      .body,
      .brightness {
        position: relative;
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

      /* Mode compact : le visuel central disparaît et l'icône vient se
         placer à gauche du titre, sur une seule ligne. Orthogonal à la
         densité, qui ne touche qu'aux marges et aux tailles. */
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
        color: var(--acd-text-secondary);
        --mdc-icon-size: 22px;
        transition: color 180ms ease, filter 180ms ease;
      }
      .chip.clickable {
        cursor: pointer;
      }
      ha-card.on .chip {
        background: rgba(255, 255, 255, 0.55);
      }
      .chip.lit {
        color: #e8b84b;
        filter: drop-shadow(0 0 10px rgba(232, 184, 75, 0.5));
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

      .body {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        min-height: 96px;
      }
      .visual {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 0;
      }
      .visual.clickable {
        cursor: pointer;
        align-self: stretch;
        min-height: 96px;
      }
      .visual ha-icon {
        --mdc-icon-size: 64px;
        color: var(--acd-text-secondary);
        transition: color 180ms ease, filter 180ms ease;
      }
      .visual.lit ha-icon {
        color: #e8b84b;
        filter: drop-shadow(0 0 14px rgba(232, 184, 75, 0.55));
      }
      .arrow {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: var(--acd-text-secondary);
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .arrow:hover {
        background: var(--acd-track);
        color: var(--acd-text);
      }
    `,
    densityStyles(
      "ha-card{padding:12px;gap:8px}.body{min-height:70px}.name{font-size:13.5px}.secondary{font-size:11px}.arrow{width:22px;height:22px;font-size:17px}.hero{max-width:42%!important;bottom:74px}.chip{width:32px;height:32px;border-radius:10px;--mdc-icon-size:19px}", ".body{display:none}ha-card{gap:8px;padding:11px 12px}.hero{display:none}.secondary{font-size:10.5px}.chip{width:28px;height:28px;--mdc-icon-size:17px}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdLightCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Light Card",
  description:
    "Minimal light card with toggle, brightness bar and a color/temperature modal.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-light-card": AcdLightCard;
  }
}
