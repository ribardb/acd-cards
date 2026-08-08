import { css, html, nothing, type TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdHeaderCardConfig } from "../../types";

const CARD_TYPE = "acd-header-card";

export class AcdHeaderCard extends AcdBaseCard<AcdHeaderCardConfig> {
  private _tick?: number;

  protected override defaults(): Partial<AcdHeaderCardConfig> {
    return {
      show_notifications: true,
      show_avatar: true,
      time_based_greeting: true,
      avatar_size: 34,
    };
  }

  public static getStubConfig(): Partial<AcdHeaderCardConfig> {
    return {};
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-header-card-editor");
  }

  public getGridOptions() {
    return { columns: "full", rows: "auto" };
  }

  public override getCardSize(): number {
    return 1;
  }

  /** The greeting flips at noon and at 18:00 — refresh hourly. */
  public override connectedCallback(): void {
    super.connectedCallback();
    this._tick = window.setInterval(() => this.requestUpdate(), 15 * 60 * 1000);
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._tick) window.clearInterval(this._tick);
  }

  /* ---------- data ---------- */

  private _greeting(): string {
    const c = this._config!;
    if (c.greeting) return c.greeting;
    if (!c.time_based_greeting) return this.t("Bonjour,", "Hello,");
    const h = new Date().getHours();
    if (h < 6) return this.t("Bonne nuit,", "Good night,");
    if (h < 12) return this.t("Bonjour,", "Good morning,");
    if (h < 18) return this.t("Bon après-midi,", "Good afternoon,");
    return this.t("Bonsoir,", "Good evening,");
  }

  /** Config name → person entity friendly name → HA user name. */
  private _name(): string {
    const c = this._config!;
    if (c.name) return c.name;
    const person = this.getEntity(c.person_entity);
    const friendly = person?.attributes.friendly_name as string | undefined;
    if (friendly) return friendly;
    return this.hass?.user?.name ?? "";
  }

  private _avatarUrl(): string | undefined {
    const c = this._config!;
    if (c.avatar) return c.avatar;
    const person = this.getEntity(c.person_entity);
    return person?.attributes.entity_picture as string | undefined;
  }

  private _initial(): string {
    const name = this._name().trim();
    return name ? name[0].toUpperCase() : "?";
  }

  /**
   * Pending notifications. `notification_entity` can be a counter (numeric
   * state > 0) or a binary/boolean entity ("on"). Without it, no dot.
   */
  private _hasNotifications(): boolean {
    const id = this._config?.notification_entity;
    if (!id) return false;
    const st = this.getEntity(id)?.state;
    if (!st || st === "unavailable" || st === "unknown") return false;
    const n = Number(st);
    return Number.isFinite(n) ? n > 0 : st === "on" || st === "home";
  }

  /* ---------- actions ---------- */

  private _navigate(path?: string): void {
    if (!path) return;
    if (/^https?:\/\//.test(path)) {
      window.open(path, "_blank", "noopener");
      return;
    }
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed"));
  }

  private _onBell(): void {
    const c = this._config!;
    if (c.notification_path) {
      this._navigate(c.notification_path);
      return;
    }
    if (c.notification_entity) {
      this.moreInfo(c.notification_entity);
      return;
    }
    // Nothing configured: the HA drawer is the closest sensible target.
    this.fire("hass-toggle-menu");
  }

  private _onAvatar(): void {
    const c = this._config!;
    if (c.avatar_path) {
      this._navigate(c.avatar_path);
      return;
    }
    if (c.person_entity) this.moreInfo(c.person_entity);
  }

  /* ---------- render ---------- */

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const name = this._name();
    const avatar = this._avatarUrl();
    const size = c.avatar_size ?? 34;

    return html`
      <div class="bar">
        <div class="titles">
          ${c.show_greeting === false
            ? nothing
            : html`<span class="greeting">${this._greeting()}</span>`}
          ${name ? html`<span class="name">${name}</span>` : nothing}
          ${c.subtitle
            ? html`<span class="subtitle">${c.subtitle}</span>`
            : nothing}
        </div>

        <div class="actions">
          ${c.show_notifications
            ? html`
                <button
                  class="round"
                  style=${styleMap({ width: `${size}px`, height: `${size}px` })}
                  title=${this.t("Notifications", "Notifications")}
                  @click=${this._onBell}
                >
                  <ha-icon icon="mdi:bell-outline"></ha-icon>
                  ${this._hasNotifications()
                    ? html`<span class="dot"></span>`
                    : nothing}
                </button>
              `
            : nothing}
          ${c.show_avatar
            ? html`
                <button
                  class="avatar ${classMap({ image: !!avatar })}"
                  style=${styleMap({ width: `${size}px`, height: `${size}px` })}
                  title=${name}
                  @click=${this._onAvatar}
                >
                  ${avatar
                    ? html`<img src=${avatar} alt=${name} />`
                    : html`<span class="initial">${this._initial()}</span>`}
                </button>
              `
            : nothing}
        </div>
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

      .bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 2px;
        box-sizing: border-box;
      }

      .titles {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
        flex: 1;
      }
      .greeting {
        font-size: 11px;
        color: var(--acd-text-secondary);
        line-height: 1.2;
      }
      .name {
        font-size: 19px;
        font-weight: 700;
        letter-spacing: -0.3px;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .subtitle {
        font-size: 11px;
        color: var(--acd-text-secondary);
      }

      .actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .round,
      .avatar {
        position: relative;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
        -webkit-tap-highlight-color: transparent;
        transition: border-color 150ms ease, opacity 150ms ease;
      }
      .round {
        background: var(--acd-pill);
        border: 1px solid var(--acd-border);
        color: var(--acd-text);
        --mdc-icon-size: 18px;
      }
      .round:hover {
        border-color: var(--acd-accent);
      }
      .round:focus-visible,
      .avatar:focus-visible {
        outline: 2px solid var(--acd-accent);
        outline-offset: 2px;
      }

      .dot {
        position: absolute;
        top: -1px;
        right: -1px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--acd-success);
        border: 2px solid var(--acd-bg);
        box-sizing: content-box;
      }

      .avatar {
        overflow: hidden;
        border: none;
        background: var(--acd-muted);
        color: #ffffff;
      }
      .avatar:hover {
        opacity: 0.9;
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .initial {
        font-size: 14px;
        font-weight: 700;
        font-family: var(--acd-font);
      }
    `,
    densityStyles(
      ".name{font-size:17px}.greeting{font-size:10.5px}", ".greeting{display:none}.subtitle{display:none}.name{font-size:15px}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdHeaderCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Header Card",
  description:
    "Mobile header: time-based greeting, user name, notification bell and avatar.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-header-card": AcdHeaderCard;
  }
}
