import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { tokens } from "../shared/tokens";
import { safeDefine, registerBadge } from "../shared/register";
import type {
  AcdPersonBadgeConfig,
  HassEntity,
  HomeAssistant,
} from "../types";

const BADGE_TYPE = "acd-person-badge";

export class AcdPersonBadge extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: AcdPersonBadgeConfig;

  public setConfig(config: AcdPersonBadgeConfig): void {
    if (!config.entity) {
      throw new Error("Please define a person entity (`entity`).");
    }
    this._config = { show_name: true, show_state: false, ...config };
  }

  public static getStubConfig(hass: {
    states: Record<string, unknown>;
  }): Partial<AcdPersonBadgeConfig> {
    return {
      entity:
        Object.keys(hass.states).find((e) => e.startsWith("person.")) ??
        "person.example",
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-person-badge-editor");
  }

  private _t(fr: string, en: string): string {
    return this.hass?.language?.startsWith("fr") ? fr : en;
  }

  private _status(stateObj: HassEntity): "home" | "away" | "zone" {
    if (stateObj.state === "home") return "home";
    if (stateObj.state === "not_home" || stateObj.state === "unknown") {
      return "away";
    }
    return "zone";
  }

  private _statusLabel(stateObj: HassEntity): string {
    const st = this._status(stateObj);
    if (st === "home") return this._t("À la maison", "Home");
    if (st === "away") return this._t("Absent", "Away");
    return stateObj.state;
  }

  private _initials(stateObj: HassEntity): string {
    const name: string =
      stateObj.attributes.friendly_name ?? stateObj.entity_id;
    return name
      .split(/\s+/)
      .map((p: string) => p.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const stateObj = this.hass.states[c.entity];
    if (!stateObj) return nothing;

    const status = this._status(stateObj);
    const picture = stateObj.attributes.entity_picture as string | undefined;
    const fullName =
      (stateObj.attributes.friendly_name as string) ?? c.entity;
    const label = c.name ?? fullName.split(/\s+/)[0];

    return html`
      <div
        class="badge ${classMap({ home: status === "home" })}"
        role="button"
        title="${fullName} · ${this._statusLabel(stateObj)}"
        @click=${() =>
          this.dispatchEvent(
            new CustomEvent("hass-more-info", {
              detail: { entityId: c.entity },
              bubbles: true,
              composed: true,
            })
          )}
      >
        <div
          class="avatar ${classMap({ away: status === "away" })}"
          style=${styleMap({
            backgroundImage: picture ? `url(${picture})` : undefined,
          })}
        >
          ${picture
            ? nothing
            : html`<span class="initials">${this._initials(stateObj)}</span>`}
          <span class="dot ${status}"></span>
        </div>
        ${c.show_name || c.show_state
          ? html`
              <div class="texts">
                ${c.show_name
                  ? html`<span class="label">${label}</span>`
                  : nothing}
                ${c.show_state
                  ? html`<span class="status"
                      >${this._statusLabel(stateObj)}</span
                    >`
                  : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  static override styles = [
    tokens,
    css`
      :host {
        display: inline-block;
        -webkit-tap-highlight-color: transparent;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 3px 12px 3px 4px;
        background: var(--acd-pill);
        border: 1px solid var(--acd-border);
        border-radius: 999px;
        box-shadow: var(--acd-shadow);
        font-family: var(--acd-font);
        color: var(--acd-text);
        cursor: pointer;
        transition: background 180ms ease, border-color 180ms ease;
        box-sizing: border-box;
        min-height: 36px;
      }
      .badge.home {
        background: var(--acd-bg-active);
        border-color: transparent;
      }
      .badge:hover {
        border-color: var(--acd-accent);
      }

      .avatar {
        position: relative;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background-color: #dfe0d8;
        background-size: cover;
        background-position: center;
        border: 1.5px solid var(--acd-pill);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-sizing: border-box;
      }
      .avatar.away {
        filter: grayscale(1);
        opacity: 0.65;
      }
      .initials {
        font-size: 10px;
        font-weight: 700;
        color: var(--acd-accent);
        letter-spacing: 0.4px;
      }
      .dot {
        position: absolute;
        right: -2px;
        bottom: -2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 1.5px solid var(--acd-pill);
        box-sizing: border-box;
      }
      .dot.home {
        background: #4c9a5f;
      }
      .dot.away {
        background: #b6b8ae;
      }
      .dot.zone {
        background: #6b83b8;
      }

      .texts {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
        min-width: 0;
      }
      .label {
        font-size: 12.5px;
        font-weight: 600;
        white-space: nowrap;
      }
      .status {
        font-size: 10px;
        color: var(--acd-text-secondary);
        white-space: nowrap;
      }
    `,
  ];
}

safeDefine(BADGE_TYPE, AcdPersonBadge);
registerBadge({
  type: BADGE_TYPE,
  name: "ACD Person Badge",
  description: "Person presence pill: avatar, status dot and first name.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-person-badge": AcdPersonBadge;
  }
}
