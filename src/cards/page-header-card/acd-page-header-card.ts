import { css, html, nothing, type TemplateResult } from "lit";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdPageHeaderCardConfig } from "../../types";

const CARD_TYPE = "acd-page-header-card";

/**
 * En-tête de page intérieure : bouton retour, fil d'ariane et grand titre.
 * Le titre se déduit de la zone quand elle est fournie, ce qui permet de
 * réutiliser la même carte sur toutes les pages de pièces.
 */
export class AcdPageHeaderCard extends AcdBaseCard<AcdPageHeaderCardConfig> {
  protected override defaults(): Partial<AcdPageHeaderCardConfig> {
    return { show_back: true, show_breadcrumb: true };
  }

  public static getStubConfig(): Partial<AcdPageHeaderCardConfig> {
    return { title: "Salon", parent_text: "Accueil" };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-page-header-card-editor");
  }

  public getGridOptions(): Record<string, unknown> {
    return { columns: "full", rows: "auto" };
  }

  public override getCardSize(): number {
    return 1;
  }

  private _title(): string {
    const c = this._config!;
    if (c.title) return c.title;
    const area = c.area ? this.hass?.areas?.[c.area] : undefined;
    return area?.name ?? "";
  }

  private _navigate(path?: string): void {
    if (!path) {
      history.back();
      return;
    }
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
    const title = this._title();
    const parent = c.parent_text ?? this.t("Accueil", "Home");

    return html`
      <div class="bar">
        ${c.show_back
          ? html`<button
              class="back"
              aria-label=${this.t("Retour", "Back")}
              @click=${() => this._navigate(c.back_path)}
            >
              <ha-icon icon="mdi:arrow-left"></ha-icon>
            </button>`
          : nothing}

        <div class="titles">
          ${c.show_breadcrumb
            ? html`<span class="crumb">
                <button
                  class="crumb-link"
                  @click=${() => this._navigate(c.parent_path ?? c.back_path)}
                >
                  ${parent}
                </button>
                <span class="sep">/</span>
                <span class="crumb-current">${title}</span>
              </span>`
            : nothing}
          <span class="title">${title}</span>
          ${c.subtitle
            ? html`<span class="subtitle">${c.subtitle}</span>`
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
        gap: 14px;
        padding: 2px;
        box-sizing: border-box;
      }

      .back {
        flex-shrink: 0;
        width: 42px;
        height: 42px;
        border-radius: 14px;
        border: 1px solid var(--acd-border);
        background: var(--acd-pill);
        color: var(--acd-text);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: 20px;
        transition: border-color 150ms ease, background 150ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .back:hover {
        border-color: var(--acd-accent);
      }
      .back:focus-visible {
        outline: 2px solid var(--acd-accent);
        outline-offset: 2px;
      }

      .titles {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }
      .crumb {
        display: flex;
        align-items: baseline;
        gap: 5px;
        font-size: 11.5px;
        color: var(--acd-text-secondary);
      }
      .crumb-link {
        border: none;
        background: none;
        padding: 0;
        font-family: var(--acd-font);
        font-size: inherit;
        color: inherit;
        cursor: pointer;
      }
      .crumb-link:hover {
        color: var(--acd-text);
      }
      .crumb-current {
        color: var(--acd-text);
        font-weight: 600;
      }
      .title {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.6px;
        line-height: 1.15;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .subtitle {
        font-size: 11.5px;
        color: var(--acd-text-secondary);
      }
    `,
    densityStyles(
      ".title{font-size:21px}.back{width:36px;height:36px;border-radius:12px;--mdc-icon-size:18px}" +
        ".bar{gap:10px}",
      ".crumb{display:none}.title{font-size:18px}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdPageHeaderCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Page Header Card",
  description: "Inner page header: back button, breadcrumb and large title.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-page-header-card": AcdPageHeaderCard;
  }
}
