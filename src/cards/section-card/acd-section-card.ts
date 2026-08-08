import { css, html, nothing, type TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdSectionCardConfig } from "../../types";

const CARD_TYPE = "acd-section-card";

/**
 * Section heading of the mobile mockup: bold title on the left, a discreet
 * action link on the right ("Pièces / Voir tout", "Appareils / Tout gérer").
 * Deliberately chrome-free — no card background, no border.
 */
export class AcdSectionCard extends AcdBaseCard<AcdSectionCardConfig> {
  protected override defaults(): Partial<AcdSectionCardConfig> {
    return { title_size: 15 };
  }

  public static getStubConfig(): Partial<AcdSectionCardConfig> {
    return { title: "Appareils" };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-section-card-editor");
  }

  public getGridOptions() {
    return { columns: "full", rows: 1 };
  }

  public override getCardSize(): number {
    return 1;
  }

  private _navigate(path?: string): void {
    if (!path) return;
    if (/^https?:\/\//.test(path)) {
      window.open(path, "_blank", "noopener");
      return;
    }
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed"));
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config) return nothing;
    const c = this._config;
    const hasLink = !!(c.link_text && (c.link_path || c.link_url));

    return html`
      <div class="row">
        <div class="titles">
          ${c.title
            ? html`<span
                class="title"
                style=${styleMap({ fontSize: `${c.title_size ?? 15}px` })}
                >${c.title}</span
              >`
            : nothing}
          ${c.subtitle
            ? html`<span class="subtitle">${c.subtitle}</span>`
            : nothing}
        </div>
        ${hasLink
          ? html`<button
              class="link"
              @click=${() => this._navigate(c.link_url ?? c.link_path)}
            >
              ${c.link_text}
            </button>`
          : nothing}
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

      .row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        padding: 2px;
        box-sizing: border-box;
      }

      .titles {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }
      .title {
        font-weight: 700;
        letter-spacing: -0.2px;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .subtitle {
        font-size: 11px;
        color: var(--acd-text-secondary);
      }

      .link {
        flex-shrink: 0;
        border: none;
        background: none;
        padding: 0;
        font-family: var(--acd-font);
        font-size: 12.5px;
        color: var(--acd-text-secondary);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: color 150ms ease;
      }
      .link:hover {
        color: var(--acd-text);
      }
      .link:focus-visible {
        outline: 2px solid var(--acd-accent);
        outline-offset: 3px;
        border-radius: 4px;
      }
    `,
    densityStyles(
      ".title{font-size:13.5px!important}", ".subtitle{display:none}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdSectionCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Section Card",
  description:
    'Section heading with an optional action link ("Devices / Manage all").',
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-section-card": AcdSectionCard;
  }
}
