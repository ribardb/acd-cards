import { css, html, nothing, render, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdCoverCardConfig, HassEntity } from "../../types";
import "../../shared/acd-slider";

const CARD_TYPE = "acd-cover-card";

/* cover supported_features bits */
const F_OPEN = 1;
const F_CLOSE = 2;
const F_SET_POSITION = 4;
const F_STOP = 8;

export class AcdCoverCard extends AcdBaseCard<AcdCoverCardConfig> {
  @state() private _open = false;
  @state() private _index = 0;

  private _modalEl?: HTMLElement;

  protected override defaults(): Partial<AcdCoverCardConfig> {
    return {
      show_buttons: true,
      show_position: true,
      show_state: true,
      compact: false,
      invert_position: false,
      info_dialog: "custom",
    };
  }

  public override setConfig(config: AcdCoverCardConfig): void {
    if (!config.entity && !config.entities?.length) {
      throw new Error("Please define a cover entity (`entity`).");
    }
    super.setConfig(config);
    this._index = 0;
  }

  public static getStubConfig(hass: {
    states: Record<string, HassEntity>;
  }): Partial<AcdCoverCardConfig> {
    const entity = Object.keys(hass.states).find((e) =>
      e.startsWith("cover.")
    );
    return { entity: entity ?? "cover.example" };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-cover-card-editor");
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

  private _features(stateObj: HassEntity): number {
    return stateObj.attributes.supported_features ?? 0;
  }

  /** Openness 0-100 as displayed (after optional inversion). */
  private _position(stateObj: HassEntity): number | undefined {
    const raw = stateObj.attributes.current_position;
    if (raw == null) return undefined;
    return this._config?.invert_position ? 100 - raw : raw;
  }

  /* ---------- actions ---------- */

  private _service = (service: string, ev?: Event): void => {
    ev?.stopPropagation();
    this.hass.callService("cover", service, {
      entity_id: this._activeEntityId,
    });
  };

  private _setPosition = (ev: CustomEvent<number>): void => {
    const pct = this._config?.invert_position ? 100 - ev.detail : ev.detail;
    this.hass.callService("cover", "set_cover_position", {
      entity_id: this._activeEntityId,
      position: pct,
    });
  };

  private _step(dir: number, ev: Event): void {
    ev.stopPropagation();
    const n = this._entityIds.length;
    this._index = (this._index + dir + n) % n;
  }

  /* ---------- modal (portal in document.body) ---------- */

  private _openInfo = (): void => {
    if (this._config?.info_dialog === "native") {
      this.moreInfo(this._activeEntityId);
      return;
    }
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

  /* ---------- shared pieces ---------- */

  /** Window illustration in the collection's lamp style (cream radial
   *  gradient, tilted white highlight, dark olive strokes). The apron
   *  height reflects the real position, with a smooth transition. */
  private _windowTemplate(stateObj: HassEntity, width = 96): TemplateResult {
    const pos = this._position(stateObj);
    const closedPct =
      pos != null ? 100 - pos : stateObj.state === "closed" ? 100 : 0;
    const apronH = Math.round(((191 * closedPct) / 100) * 10) / 10;
    const railY = 20.5 + Math.max(apronH - 7, 0);
    return html`
      <svg
        width=${width}
        viewBox="0 0 200 244"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="acd-wg" cx="40%" cy="30%" r="75%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="55%" stop-color="#f8f7f3" />
            <stop offset="100%" stop-color="#deddd5" />
          </radialGradient>
          <pattern
            id="acd-slat"
            width="200"
            height="13"
            patternUnits="userSpaceOnUse"
          >
            <rect width="200" height="13" fill="#e6e8df" />
            <rect y="10" width="200" height="3" fill="#cfd3c6" />
          </pattern>
        </defs>
        <rect x="34" y="18" width="132" height="196" rx="12"
          fill="url(#acd-wg)" />
        <ellipse cx="72" cy="178" rx="18" ry="11" fill="#ffffff"
          opacity="0.9" transform="rotate(-18 72 178)" />
        <line x1="100" y1="22" x2="100" y2="210" stroke="#2c2d29"
          stroke-width="3" opacity="0.14" />
        <line x1="38" y1="116" x2="162" y2="116" stroke="#2c2d29"
          stroke-width="3" opacity="0.14" />
        <rect x="39" y="20.5" width="122" height=${apronH} rx="4"
          fill="url(#acd-slat)" style="transition: height 600ms ease" />
        <rect x="39" y=${railY} width="122" height="7" rx="3.5"
          fill="#2c2d29" opacity=${apronH > 4 ? 1 : 0}
          style="transition: y 600ms ease, opacity 300ms ease" />
        <rect x="34" y="18" width="132" height="196" rx="12" fill="none"
          stroke="#2c2d29" stroke-width="5" />
        <rect x="28" y="0" width="144" height="18" rx="7" fill="#2c2d29" />
        <rect x="24" y="212" width="152" height="11" rx="5.5"
          fill="#2c2d29" />
      </svg>
    `;
  }

  private _buttonsTemplate(stateObj: HassEntity, big = false): TemplateResult {
    const f = this._features(stateObj);
    const cls = big ? "cbtn big" : "cbtn";
    return html`
      <div class="cbuttons ${classMap({ big })}">
        ${f & F_OPEN
          ? html`<button class=${cls} title=${this.t("Ouvrir", "Open")}
              @click=${(e: Event) => this._service("open_cover", e)}>
              <ha-icon icon="mdi:chevron-up"></ha-icon>
            </button>`
          : nothing}
        ${f & F_STOP
          ? html`<button class=${cls} title="Stop"
              @click=${(e: Event) => this._service("stop_cover", e)}>
              <ha-icon icon="mdi:stop"></ha-icon>
            </button>`
          : nothing}
        ${f & F_CLOSE
          ? html`<button class=${cls} title=${this.t("Fermer", "Close")}
              @click=${(e: Event) => this._service("close_cover", e)}>
              <ha-icon icon="mdi:chevron-down"></ha-icon>
            </button>`
          : nothing}
      </div>
    `;
  }

  /** Icône du mode compact : le volet suit l'état d'ouverture. */
  private _icon(stateObj: HassEntity): string {
    if (stateObj.attributes.icon) return stateObj.attributes.icon;
    switch (stateObj.state) {
      case "opening":
      case "closing":
        return "mdi:window-shutter-cog";
      case "closed":
        return "mdi:window-shutter";
      default:
        return "mdi:window-shutter-open";
    }
  }

  private _secondary(stateObj: HassEntity): string {
    const pos = this._position(stateObj);
    switch (stateObj.state) {
      case "opening":
        return this.t("Ouverture…", "Opening…");
      case "closing":
        return this.t("Fermeture…", "Closing…");
      case "closed":
        return this.t("Fermé", "Closed");
      default:
        return pos != null && pos < 100
          ? `${this.t("Ouvert", "Open")} · ${pos}%`
          : this.t("Ouvert", "Open");
    }
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

    const isOpen = stateObj.state !== "closed";
    const name =
      (this._entityIds.length > 1
        ? stateObj.attributes.friendly_name
        : c.name ?? stateObj.attributes.friendly_name) ?? this._activeEntityId;
    const pos = this._position(stateObj);
    const canPosition = !!(this._features(stateObj) & F_SET_POSITION);
    const hasCarousel = this._entityIds.length > 1;
    const compact = !!c.compact;

    return html`
      <ha-card class=${classMap({ on: isOpen, compact })}>
        <div class="header">
          ${compact
            ? html`<span class="chip clickable" @click=${this._openInfo}>
                <ha-icon .icon=${this._icon(stateObj)}></ha-icon>
              </span>`
            : nothing}
          <div class="titles" @click=${this._openInfo}>
            <span class="name">${name}</span>
            ${c.show_state
              ? html`<span class="secondary">${this._secondary(stateObj)}</span>`
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
          ${c.show_buttons ? this._buttonsTemplate(stateObj) : nothing}
        </div>

        ${compact
          ? nothing
          : html`
              <div class="body">
                ${hasCarousel
                  ? html`<button class="arrow" @click=${(e: Event) =>
                      this._step(-1, e)}>‹</button>`
                  : nothing}
                <div class="visual clickable" @click=${this._openInfo}>
                  ${this._windowTemplate(stateObj)}
                </div>
                ${hasCarousel
                  ? html`<button class="arrow" @click=${(e: Event) =>
                      this._step(1, e)}>›</button>`
                  : nothing}
              </div>
            `}

        ${c.show_position && canPosition
          ? html`
              <acd-slider
                class="position"
                .value=${pos ?? 0}
                icon="mdi:window-shutter"
                show-label
                @value-changed=${this._setPosition}
              ></acd-slider>
            `
          : nothing}
      </ha-card>
    `;
  }

  /* ---------- modal ---------- */

  private _modalTemplate(stateObj: HassEntity): TemplateResult {
    const c = this._config!;
    const name =
      c.name ?? stateObj.attributes.friendly_name ?? this._activeEntityId;
    const pos = this._position(stateObj);
    const canPosition = !!(this._features(stateObj) & F_SET_POSITION);

    return html`
      <style>
        .acd-cm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(28, 30, 26, 0.4);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          z-index: 998;
        }
        .acd-cm-panel {
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
        .acd-cm-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .acd-cm-titles {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .acd-cm-name {
          font-size: 16px;
          font-weight: 600;
        }
        .acd-cm-secondary {
          font-size: 12px;
          color: var(--acd-text-secondary-color, #9a9c95);
        }
        .acd-cm-close {
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
        .acd-cm-visual {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .acd-cm-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: var(--acd-text-secondary-color, #9a9c95);
          margin-bottom: 4px;
        }
        .acd-cm-buttons {
          display: flex;
          justify-content: center;
          gap: 14px;
        }
        .acd-cm-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: none;
          background: var(--acd-track-color, rgba(31, 33, 28, 0.08));
          color: var(--acd-text-color, #1f211c);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          --mdc-icon-size: 26px;
        }
        .acd-cm-btn:active {
          background: var(--acd-accent-color, #333a2d);
          color: #ffffff;
        }
      </style>
      <div class="acd-cm-backdrop" @click=${this._closeModal}></div>
      <div class="acd-cm-panel" role="dialog" aria-modal="true">
        <div class="acd-cm-header">
          <div class="acd-cm-titles">
            <span class="acd-cm-name">${name}</span>
            <span class="acd-cm-secondary">${this._secondary(stateObj)}</span>
          </div>
          <button
            class="acd-cm-close"
            aria-label=${this.t("Fermer", "Close")}
            @click=${this._closeModal}
          >
            ✕
          </button>
        </div>

        <div class="acd-cm-visual">
          ${this._windowTemplate(stateObj, 150)}
        </div>

        <div class="acd-cm-buttons">
          ${this._features(stateObj) & F_OPEN
            ? html`<button class="acd-cm-btn"
                @click=${(e: Event) => this._service("open_cover", e)}>
                <ha-icon icon="mdi:chevron-up"></ha-icon>
              </button>`
            : nothing}
          ${this._features(stateObj) & F_STOP
            ? html`<button class="acd-cm-btn"
                @click=${(e: Event) => this._service("stop_cover", e)}>
                <ha-icon icon="mdi:stop"></ha-icon>
              </button>`
            : nothing}
          ${this._features(stateObj) & F_CLOSE
            ? html`<button class="acd-cm-btn"
                @click=${(e: Event) => this._service("close_cover", e)}>
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>`
            : nothing}
        </div>

        ${canPosition
          ? html`
              <div>
                <span class="acd-cm-label"
                  >${this.t("Ouverture", "Openness")}</span
                >
                <acd-slider
                  .value=${pos ?? 0}
                  icon="mdi:window-shutter"
                  show-label
                  @value-changed=${this._setPosition}
                ></acd-slider>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  static override styles = [
    tokens,
    css`
      ha-card {
        position: relative;
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

      /* Mode compact : la fenêtre disparaît et l'icône vient se placer à
         gauche du titre, sur une seule ligne. Orthogonal à la densité, qui
         ne touche qu'aux marges et aux tailles. */
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

      .cbuttons {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }
      .cbtn {
        width: 30px;
        height: 30px;
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
      .cbtn:active {
        background: var(--acd-accent);
        color: var(--acd-on-accent);
      }

      .body {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        min-height: 110px;
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
      "ha-card{padding:12px;gap:8px}.body{min-height:70px}.name{font-size:13.5px}.secondary{font-size:11px}.arrow{width:22px;height:22px;font-size:17px}.cbtn{width:26px;height:26px;--mdc-icon-size:16px}.chip{width:32px;height:32px;border-radius:10px;--mdc-icon-size:19px}", ".body{display:none}ha-card{gap:8px;padding:11px 12px}.secondary{font-size:10.5px}.chip{width:28px;height:28px;--mdc-icon-size:17px}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdCoverCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Cover Card",
  description:
    "Minimal cover card with live window visual, up/stop/down buttons and a position bar.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-cover-card": AcdCoverCard;
  }
}
