import { css, html, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type {
  AcdSearchCardConfig,
  AreaRegistryEntry,
  HassEntity,
} from "../../types";

const CARD_TYPE = "acd-search-card";

interface Result {
  kind: "area" | "entity";
  id: string;
  label: string;
  sub?: string;
  icon: string;
}

export class AcdSearchCard extends AcdBaseCard<AcdSearchCardConfig> {
  @state() private _query = "";
  @state() private _open = false;

  private _blurTimer?: number;

  protected override defaults(): Partial<AcdSearchCardConfig> {
    return {
      include_areas: true,
      include_entities: true,
      max_results: 8,
    };
  }

  public static getStubConfig(): Partial<AcdSearchCardConfig> {
    return {};
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-search-card-editor");
  }

  public getGridOptions() {
    return { columns: "full", rows: "auto" };
  }

  public override getCardSize(): number {
    return 1;
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._blurTimer) window.clearTimeout(this._blurTimer);
  }

  /* ---------- matching ---------- */

  private _normalize(s: string): string {
    return s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  }

  private _slug(name: string): string {
    return this._normalize(name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private _areaResults(needle: string): Result[] {
    const registry = Object.values(this.hass?.areas ?? {});
    return registry
      .filter((a) => this._normalize(a.name).includes(needle))
      .map((a: AreaRegistryEntry) => ({
        kind: "area" as const,
        id: a.area_id,
        label: a.name,
        sub: this.t("Pièce", "Room"),
        icon: a.icon ?? "mdi:home-variant-outline",
      }));
  }

  private _areaNameOf(entityId: string): string | undefined {
    const entry = this.hass?.entities?.[entityId];
    let areaId = entry?.area_id ?? undefined;
    if (!areaId && entry?.device_id) {
      areaId = this.hass?.devices?.[entry.device_id]?.area_id ?? undefined;
    }
    return areaId ? this.hass?.areas?.[areaId]?.name : undefined;
  }

  private _entityResults(needle: string): Result[] {
    const c = this._config!;
    const domains = c.domains;
    const hidden = this.hass?.entities ?? {};
    const out: Result[] = [];
    for (const [id, st] of Object.entries(this.hass?.states ?? {})) {
      const domain = id.split(".")[0];
      if (domains?.length && !domains.includes(domain)) continue;
      if (hidden[id]?.hidden) continue;
      const name =
        ((st as HassEntity).attributes.friendly_name as string) ?? id;
      if (!this._normalize(name).includes(needle)) continue;
      out.push({
        kind: "entity",
        id,
        label: name,
        sub: this._areaNameOf(id) ?? domain,
        icon:
          ((st as HassEntity).attributes.icon as string) ??
          "mdi:shape-outline",
      });
    }
    return out;
  }

  private _results(): Result[] {
    const needle = this._normalize(this._query);
    if (needle.length < 1) return [];
    const c = this._config!;
    const results: Result[] = [
      ...(c.include_areas ? this._areaResults(needle) : []),
      ...(c.include_entities ? this._entityResults(needle) : []),
    ];
    // Prefix matches first, then alphabetical — cheap but predictable.
    results.sort((a, b) => {
      const aPrefix = this._normalize(a.label).startsWith(needle) ? 0 : 1;
      const bPrefix = this._normalize(b.label).startsWith(needle) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return a.label.localeCompare(b.label);
    });
    return results.slice(0, c.max_results ?? 8);
  }

  /* ---------- actions ---------- */

  private _navigate(path: string): void {
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed"));
  }

  private _pick(result: Result): void {
    this._query = "";
    this._open = false;
    if (result.kind === "entity") {
      this.moreInfo(result.id);
      return;
    }
    const area = this.hass?.areas?.[result.id];
    if (!area) return;
    const pattern = this._config?.navigation_path;
    if (pattern) {
      this._navigate(
        pattern.replace("{area}", area.area_id).replace("{slug}", this._slug(area.name))
      );
      return;
    }
    const dashboard = window.location.pathname.split("/")[1];
    if (dashboard) this._navigate(`/${dashboard}/${this._slug(area.name)}`);
  }

  private _onInput(ev: Event): void {
    this._query = (ev.target as HTMLInputElement).value;
    this._open = true;
  }

  private _onFocus(): void {
    if (this._blurTimer) window.clearTimeout(this._blurTimer);
    this._open = true;
  }

  /** Delayed so a click on a result lands before the panel closes. */
  private _onBlur(): void {
    this._blurTimer = window.setTimeout(() => {
      this._open = false;
    }, 160);
  }

  private _onKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Escape") {
      this._query = "";
      this._open = false;
      (ev.target as HTMLInputElement).blur();
      return;
    }
    if (ev.key === "Enter") {
      const first = this._results()[0];
      if (first) this._pick(first);
    }
  }

  private _clear(): void {
    this._query = "";
    this._open = false;
  }

  /* ---------- render ---------- */

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const results = this._open ? this._results() : [];
    const showPanel = this._open && this._query.length > 0;

    return html`
      <div class="wrap">
        <div class="field ${classMap({ focused: this._open })}">
          <ha-icon class="lead" icon="mdi:magnify"></ha-icon>
          <input
            type="search"
            .value=${this._query}
            placeholder=${c.placeholder ??
            this.t(
              "Rechercher une pièce, un appareil…",
              "Search a room, a device…"
            )}
            @input=${this._onInput}
            @focus=${this._onFocus}
            @blur=${this._onBlur}
            @keydown=${this._onKeydown}
          />
          ${this._query
            ? html`<button class="clear" @click=${this._clear}>
                <ha-icon icon="mdi:close"></ha-icon>
              </button>`
            : nothing}
        </div>

        ${showPanel
          ? html`
              <div class="panel">
                ${results.length === 0
                  ? html`<div class="none">
                      ${this.t("Aucun résultat", "No results")}
                    </div>`
                  : results.map(
                      (r) => html`
                        <button class="result" @click=${() => this._pick(r)}>
                          <ha-icon .icon=${r.icon}></ha-icon>
                          <span class="r-label">${r.label}</span>
                          ${r.sub
                            ? html`<span class="r-sub">${r.sub}</span>`
                            : nothing}
                        </button>
                      `
                    )}
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
        display: block;
        font-family: var(--acd-font);
        color: var(--acd-text);
      }

      .wrap {
        position: relative;
      }

      .field {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 42px;
        padding: 0 14px;
        box-sizing: border-box;
        background: var(--acd-pill);
        border: 1px solid var(--acd-border);
        border-radius: 21px;
        transition: border-color 150ms ease;
      }
      .field.focused {
        border-color: var(--acd-accent);
      }

      .lead {
        flex-shrink: 0;
        --mdc-icon-size: 18px;
        color: var(--acd-text-secondary);
      }

      input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: none;
        font-family: var(--acd-font);
        font-size: 13px;
        color: var(--acd-text);
      }
      input::placeholder {
        color: var(--acd-text-secondary);
      }
      /* Kill the native clear button: we render our own. */
      input::-webkit-search-cancel-button {
        -webkit-appearance: none;
        appearance: none;
      }

      .clear {
        flex-shrink: 0;
        border: none;
        background: none;
        padding: 0;
        cursor: pointer;
        color: var(--acd-text-secondary);
        --mdc-icon-size: 16px;
        display: flex;
        align-items: center;
      }

      .panel {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(100% + 6px);
        z-index: 5;
        max-height: 280px;
        overflow-y: auto;
        padding: 6px;
        box-sizing: border-box;
        background: var(--acd-pill);
        border: 1px solid var(--acd-border);
        border-radius: var(--acd-radius);
        box-shadow: 0 8px 24px rgba(20, 24, 18, 0.12);
      }

      .result {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 9px 10px;
        border: none;
        border-radius: 12px;
        background: none;
        font-family: var(--acd-font);
        text-align: left;
        cursor: pointer;
        color: var(--acd-text);
        --mdc-icon-size: 18px;
      }
      .result:hover {
        background: var(--acd-track);
      }
      .r-label {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .r-sub {
        flex-shrink: 0;
        font-size: 10.5px;
        color: var(--acd-text-secondary);
      }

      .none {
        padding: 12px 10px;
        font-size: 12.5px;
        color: var(--acd-text-secondary);
      }
    `,
    densityStyles(
      ".field{height:38px;padding:0 12px}input{font-size:12.5px}",
      ".r-sub{display:none}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdSearchCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Search Card",
  description:
    "Pill search field: live filtering over areas and entities, tap to navigate or open more-info.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-search-card": AcdSearchCard;
  }
}
