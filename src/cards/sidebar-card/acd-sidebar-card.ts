import { css, html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdSidebarCardConfig, AcdSidebarItem } from "../../types";

const CARD_TYPE = "acd-sidebar-card";
const DEFAULT_BREAKPOINT = 870;
/** Rail height when laid out as a bottom tab bar, safe-area excluded. */
const TABBAR_HEIGHT = 62;

export class AcdSidebarCard extends AcdBaseCard<AcdSidebarCardConfig> {
  @state() private _path = window.location.pathname;
  @state() private _edit = false;

  private _timer?: number;
  private _mq = window.matchMedia(`(max-width: ${DEFAULT_BREAKPOINT}px)`);
  private _prevDock?: string;

  protected override defaults(): Partial<AcdSidebarCardConfig> {
    return {
      hide_header: true,
      hide_ha_sidebar: true,
      show_labels: false,
      width: 76,
      mode: "auto",
      breakpoint: DEFAULT_BREAKPOINT,
      tabbar_labels: true,
    };
  }

  public override setConfig(config: AcdSidebarCardConfig): void {
    super.setConfig(config);
    const bp = this._config?.breakpoint ?? DEFAULT_BREAKPOINT;
    const query = `(max-width: ${bp}px)`;
    if (this._mq.media !== query) {
      this._mq.removeEventListener?.("change", this._onLocation);
      this._mq = window.matchMedia(query);
      if (this.isConnected) {
        this._mq.addEventListener?.("change", this._onLocation);
      }
    }
  }

  /** Bottom tab bar (mobile) vs left icon rail (desktop). */
  private _isTabbar(): boolean {
    const mode = this._config?.mode ?? "auto";
    if (mode === "tabbar") return true;
    if (mode === "rail") return false;
    return this._mq.matches;
  }

  public static getStubConfig(): Partial<AcdSidebarCardConfig> {
    return {
      items: [
        {
          icon: "mdi:home-variant-outline",
          label: "Accueil",
          path: window.location.pathname,
        },
      ],
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-sidebar-card-editor");
  }

  public override getCardSize(): number {
    return 1;
  }

  public getGridOptions(): Record<string, unknown> {
    return { columns: "full", rows: "auto" };
  }

  /* ---------------------------------------------------------- lifecycle */

  private _onLocation = (): void => {
    this._path = window.location.pathname;
    this._sync();
  };

  public override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("location-changed", this._onLocation);
    window.addEventListener("popstate", this._onLocation);
    this._mq.addEventListener?.("change", this._onLocation);
    this._timer = window.setInterval(() => this._sync(), 1500);
    this._sync();
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._onLocation);
    window.removeEventListener("popstate", this._onLocation);
    this._mq.removeEventListener?.("change", this._onLocation);
    if (this._timer) window.clearInterval(this._timer);
    this._restore();
  }

  protected override updated(): void {
    this._sync();
  }

  /* ------------------------------------------------------ hui-root patch */

  private _isPreview(): boolean {
    if (this.parentElement?.localName === "hui-card-preview") return true;
    let node: Node = this;
    for (let i = 0; i < 12; i++) {
      const root = node.getRootNode() as ShadowRoot | Document;
      const host = (root as ShadowRoot).host as HTMLElement | undefined;
      if (!host) return false;
      const tag = host.tagName ?? "";
      if (tag.includes("PREVIEW") || tag.includes("DIALOG")) return true;
      node = host;
    }
    return false;
  }

  private _huiRoot(): HTMLElement | undefined {
    const ha = document.querySelector("home-assistant");
    const main = ha?.shadowRoot?.querySelector("home-assistant-main");
    const panel = main?.shadowRoot?.querySelector("ha-panel-lovelace");
    return (
      (panel?.shadowRoot?.querySelector("hui-root") as HTMLElement) ??
      undefined
    );
  }

  private _sync(): void {
    if (!this.isConnected || !this._config) return;
    const preview = this._isPreview();
    const root = this._huiRoot();
    const editMode =
      !!(root as unknown as { lovelace?: { editMode?: boolean } })?.lovelace
        ?.editMode;
    if (editMode !== this._edit) this._edit = editMode;
    const inline = preview || editMode;
    this.classList.toggle("inline", inline);
    if (!root) return;
    const sr = root.shadowRoot;
    const header = sr?.querySelector(".header") as HTMLElement | null;
    const view = sr?.querySelector("#view") as HTMLElement | null;
    if (preview) return; // never patch the page from a preview instance

    const hide = !!this._config.hide_header && !editMode;
    if (header) header.style.display = hide ? "none" : "";
    if (hide) root.style.setProperty("--header-height", "0px");
    else root.style.removeProperty("--header-height");

    if (view) {
      const tabbar = this._isTabbar();
      view.style.paddingLeft =
        !editMode && !tabbar ? `${this._config.width ?? 76}px` : "";
      // Leaves room for the bar itself plus the iOS home indicator.
      view.style.paddingBottom =
        !editMode && tabbar
          ? `calc(${TABBAR_HEIGHT + 16}px + env(safe-area-inset-bottom, 0px))`
          : "";
    }

    // La barre latérale native de HA est masquée pendant l'affichage du rail
    // (le bouton ☰ l'ouvre alors en superposition).
    if (this._config.hide_ha_sidebar !== false && !editMode) {
      const dock = (this.hass as unknown as { dockedSidebar?: string })
        ?.dockedSidebar;
      if (dock && dock !== "always_hidden") {
        this._prevDock = dock;
        this.fire("hass-dock-sidebar", { dock: "always_hidden" });
      }
    } else if (this._prevDock) {
      const dock = this._prevDock;
      this._prevDock = undefined;
      this.fire("hass-dock-sidebar", { dock });
    }
  }

  private _restore(): void {
    if (this._prevDock) {
      const dock = this._prevDock;
      this._prevDock = undefined;
      this.fire("hass-dock-sidebar", { dock });
    }
    const root = this._huiRoot();
    if (!root) return;
    const sr = root.shadowRoot;
    const header = sr?.querySelector(".header") as HTMLElement | null;
    const view = sr?.querySelector("#view") as HTMLElement | null;
    if (header) header.style.display = "";
    root.style.removeProperty("--header-height");
    if (view) {
      view.style.paddingLeft = "";
      view.style.paddingBottom = "";
    }
  }

  /* -------------------------------------------------------------- items */

  private _activate(item: AcdSidebarItem, ev: Event): void {
    ev.stopPropagation();
    if (item.action === "menu") {
      this.fire("hass-toggle-menu");
      return;
    }
    if (!item.path) return;
    if (item.path !== window.location.pathname) {
      history.pushState(null, "", item.path);
      window.dispatchEvent(new CustomEvent("location-changed"));
    }
    this._path = window.location.pathname;
  }

  private _item(item: AcdSidebarItem, tabbar: boolean) {
    const active = !!item.path && this._path === item.path;
    const withLabel = tabbar
      ? this._config?.tabbar_labels !== false
      : !!this._config?.show_labels;
    return html`
      <button
        class="item ${classMap({ active })}"
        title=${item.label ?? ""}
        aria-current=${active ? "page" : "false"}
        @click=${(ev: Event) => this._activate(item, ev)}
      >
        <ha-icon .icon=${item.icon}></ha-icon>
        ${withLabel && item.label
          ? html`<span class="lbl">${item.label}</span>`
          : nothing}
      </button>
    `;
  }

  protected override render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const items = c.items ?? [];
    const bottom = c.bottom_items ?? [];

    if (this._isPreview() || this._edit) {
      return html`
        <div class="placeholder">
          <span class="ph-logo">${c.logo}</span>
          <span class="ph-text">
            ${this.t(
              "Barre latérale ACD — fixée à gauche hors édition",
              "ACD sidebar — pinned left outside edit mode"
            )}
          </span>
          <span class="ph-items">
            ${items.map(
              (i) => html`<ha-icon class="ph-icon" .icon=${i.icon}></ha-icon>`
            )}
          </span>
        </div>
      `;
    }

    const tabbar = this._isTabbar();
    return html`
      <div
        class="rail ${classMap({ tabbar })}"
        style=${styleMap({ width: tabbar ? undefined : `${c.width ?? 76}px` })}
      >
        ${c.logo && !tabbar ? html`<div class="logo">${c.logo}</div>` : nothing}
        <nav class="items">${items.map((i) => this._item(i, tabbar))}</nav>
        ${tabbar ? nothing : html`<div class="spacer"></div>`}
        ${bottom.length
          ? html`<nav class="items bottom">
              ${bottom.map((i) => this._item(i, tabbar))}
            </nav>`
          : nothing}
      </div>
    `;
  }

  static override styles = [
    tokens,
    css`
      :host {
        display: contents;
      }
      :host(.inline) {
        display: block;
      }

      .rail {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        /* Sous le tiroir natif HA (z-index 6) et les dialogues. */
        z-index: 2;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 16px 0 14px;
        background: var(--acd-bg);
        border-right: 1px solid var(--acd-border);
        font-family: var(--acd-font);
      }

      .logo {
        font-size: 19px;
        font-weight: 800;
        letter-spacing: -0.5px;
        color: var(--acd-accent);
        margin-bottom: 12px;
        user-select: none;
      }

      .items {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .spacer {
        flex: 1;
      }

      .item {
        width: 46px;
        height: 46px;
        border-radius: 14px;
        border: none;
        background: transparent;
        color: var(--acd-text-secondary);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        --mdc-icon-size: 22px;
        transition: background 150ms ease, color 150ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .item:hover:not(.active) {
        background: var(--acd-track);
        color: var(--acd-text);
      }
      .item.active {
        background: var(--acd-accent);
        color: var(--acd-on-accent);
      }
      .lbl {
        font-size: 8.5px;
        font-weight: 600;
        line-height: 1;
      }

      /* ---------- bottom tab bar (mobile) ---------- */

      .rail.tabbar {
        top: auto;
        left: 0;
        right: 0;
        bottom: 0;
        width: auto;
        height: 62px;
        /* iOS home indicator: grow the bar rather than overlap the tabs. */
        padding: 0 4px env(safe-area-inset-bottom, 0px);
        flex-direction: row;
        align-items: stretch;
        justify-content: space-around;
        gap: 0;
        background: var(--acd-pill);
        border-right: none;
        border-top: 1px solid var(--acd-border);
      }
      .rail.tabbar .items {
        flex: 1;
        flex-direction: row;
        align-items: stretch;
        justify-content: space-around;
        gap: 0;
      }
      .rail.tabbar .items.bottom {
        flex: 0 0 auto;
      }
      /* Flat tabs: the active one is coloured, never a filled pill. */
      .rail.tabbar .item {
        flex: 1;
        width: auto;
        min-width: 52px;
        max-width: 96px;
        height: auto;
        border-radius: 12px;
        gap: 4px;
        padding: 8px 2px;
        --mdc-icon-size: 21px;
      }
      .rail.tabbar .item:hover:not(.active) {
        background: transparent;
        color: var(--acd-text);
      }
      .rail.tabbar .item.active {
        background: transparent;
        color: var(--acd-accent);
      }
      .rail.tabbar .item.active .lbl {
        font-weight: 700;
      }
      .rail.tabbar .lbl {
        font-size: 9.5px;
        font-weight: 500;
        line-height: 1;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .placeholder {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: var(--acd-bg);
        border: 1px dashed var(--acd-border);
        border-radius: var(--acd-radius);
        font-family: var(--acd-font);
        color: var(--acd-text-secondary);
        font-size: 12px;
        box-sizing: border-box;
      }
      .ph-logo {
        font-weight: 800;
        color: var(--acd-accent);
        font-size: 16px;
      }
      .ph-items {
        display: flex;
        gap: 6px;
        margin-left: auto;
      }
      .ph-icon {
        --mdc-icon-size: 18px;
      }
    `,
  ];
}

safeDefine(CARD_TYPE, AcdSidebarCard);
registerCard(
  {
    type: CARD_TYPE,
    name: "ACD Sidebar Card",
    description:
      "Fixed left icon rail (mockup style): view navigation, HA menu button, hides the top header.",
  },
  false
);

declare global {
  interface HTMLElementTagNameMap {
    "acd-sidebar-card": AcdSidebarCard;
  }
}
