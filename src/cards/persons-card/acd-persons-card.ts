import { css, html, nothing, type TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdPersonsCardConfig, HassEntity } from "../../types";

const CARD_TYPE = "acd-persons-card";

export class AcdPersonsCard extends AcdBaseCard<AcdPersonsCardConfig> {
  protected override defaults(): Partial<AcdPersonsCardConfig> {
    return {
      show_count: true,
      show_names: false,
      avatar_size: 44,
    };
  }

  public static getStubConfig(): Partial<AcdPersonsCardConfig> {
    return {};
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-persons-card-editor");
  }

  public getGridOptions() {
    return { columns: 4, rows: "auto", min_columns: 2 };
  }

  public override getCardSize(): number {
    return 2;
  }

  /* ---------- data ---------- */

  private _persons(): HassEntity[] {
    const wanted = this._config?.entities;
    if (wanted?.length) {
      return wanted
        .map((id) => this.hass?.states[id])
        .filter((s): s is HassEntity => !!s);
    }
    return Object.keys(this.hass?.states ?? {})
      .filter((id) => id.startsWith("person."))
      .map((id) => this.hass.states[id])
      .sort((a, b) =>
        (a.attributes.friendly_name ?? "").localeCompare(
          b.attributes.friendly_name ?? ""
        )
      );
  }

  private _status(stateObj: HassEntity): "home" | "away" | "zone" {
    if (stateObj.state === "home") return "home";
    if (stateObj.state === "not_home" || stateObj.state === "unknown") {
      return "away";
    }
    return "zone";
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

  private _zoneLabel(stateObj: HassEntity): string {
    const st = this._status(stateObj);
    if (st === "home") return this.t("À la maison", "Home");
    if (st === "away") return this.t("Absent", "Away");
    return stateObj.state;
  }

  /* ---------- render ---------- */

  private _avatar(stateObj: HassEntity): TemplateResult {
    const size = this._config?.avatar_size ?? 44;
    const picture = stateObj.attributes.entity_picture as string | undefined;
    const status = this._status(stateObj);
    const name =
      (stateObj.attributes.friendly_name as string) ?? stateObj.entity_id;

    return html`
      <div class="person" title="${name} · ${this._zoneLabel(stateObj)}">
        <div
          class="avatar ${classMap({ away: status === "away" })}"
          style=${styleMap({
            width: `${size}px`,
            height: `${size}px`,
            backgroundImage: picture ? `url(${picture})` : undefined,
          })}
          @click=${() => this.moreInfo(stateObj.entity_id)}
        >
          ${picture ? nothing : html`<span class="initials">${this._initials(stateObj)}</span>`}
          <span class="dot ${status}"></span>
        </div>
        ${this._config?.show_names
          ? html`<span class="pname">${name.split(/\s+/)[0]}</span>`
          : nothing}
      </div>
    `;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const persons = this._persons();
    const home = persons.filter((p) => this._status(p) === "home").length;
    const away = persons.length - home;

    return html`
      <ha-card class=${classMap({ on: home > 0 })}>
        ${c.title ? html`<div class="title">${c.title}</div>` : nothing}
        <div class="row">
          <div class="avatars ${classMap({ named: !!c.show_names })}">
            ${persons.map((p) => this._avatar(p))}
            ${persons.length === 0
              ? html`<span class="empty"
                  >${this.t("Aucune personne", "No persons")}</span
                >`
              : nothing}
          </div>
          ${c.show_count && persons.length > 0
            ? html`
                <div class="texts">
                  <span class="main"
                    >${home}
                    ${this.t("à la maison", "home")}</span
                  >
                  <span class="sub"
                    >${away}
                    ${this.t("absent(s)", "away")}</span
                  >
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
        padding: 14px 16px;
        background: var(--acd-bg);
        border: 1px solid var(--acd-border);
        border-radius: var(--acd-radius);
        box-shadow: var(--acd-shadow);
        font-family: var(--acd-font);
        color: var(--acd-text);
        height: 100%;
        box-sizing: border-box;
        justify-content: center;
      }

      .title {
        font-size: 14px;
        font-weight: 600;
      }

      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .avatars {
        display: flex;
        align-items: flex-start;
        min-width: 0;
      }
      .avatars .person + .person {
        margin-left: -10px;
      }
      .avatars.named .person + .person {
        margin-left: 4px;
      }

      .person {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
      }

      .avatar {
        position: relative;
        border-radius: 50%;
        background-color: #dfe0d8;
        background-size: cover;
        background-position: center;
        border: 2.5px solid var(--acd-pill);
        box-shadow: var(--acd-shadow);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: filter 180ms ease, opacity 180ms ease,
          transform 120ms ease;
        box-sizing: border-box;
      }
      .avatar:hover {
        transform: translateY(-2px);
      }
      .avatar.away {
        filter: grayscale(1);
        opacity: 0.6;
      }

      .initials {
        font-size: 14px;
        font-weight: 700;
        color: var(--acd-accent);
        letter-spacing: 0.5px;
      }

      .dot {
        position: absolute;
        right: -1px;
        bottom: -1px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid var(--acd-pill);
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

      .pname {
        font-size: 10.5px;
        font-weight: 600;
        color: var(--acd-text-secondary);
        max-width: 56px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .texts {
        display: flex;
        flex-direction: column;
        gap: 1px;
        text-align: right;
        flex-shrink: 0;
      }
      .main {
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
      }
      .sub {
        font-size: 11.5px;
        color: var(--acd-text-secondary);
        white-space: nowrap;
      }

      .empty {
        font-size: 13px;
        color: var(--acd-text-secondary);
      }
    `,
    densityStyles(
      "ha-card{padding:11px 12px}.avatar{width:34px!important;height:34px!important}.main{font-size:13px}.sub{font-size:10.5px}", ".texts{display:none}.avatar{width:30px!important;height:30px!important}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdPersonsCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Persons Card",
  description:
    "Overlapping person avatars with presence dot and home/away count.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-persons-card": AcdPersonsCard;
  }
}
