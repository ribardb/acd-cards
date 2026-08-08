import { css, html, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdCameraCardConfig } from "../../types";

const CARD_TYPE = "acd-camera-card";

export class AcdCameraCard extends AcdBaseCard<AcdCameraCardConfig> {
  /** Cache-buster appended to the snapshot URL on each refresh tick. */
  @state() private _bust = Date.now();
  @state() private _failed = false;

  private _timer?: number;

  protected override defaults(): Partial<AcdCameraCardConfig> {
    return {
      show_live_badge: true,
      show_caption: true,
      aspect_ratio: "16/9",
      refresh_interval: 10,
      stream: false,
    };
  }

  public override setConfig(config: AcdCameraCardConfig): void {
    if (!config.entity) {
      throw new Error("Please define a camera entity (`entity`).");
    }
    super.setConfig(config);
    this._failed = false;
    this._restartTimer();
  }

  public static getStubConfig(hass: {
    states: Record<string, unknown>;
  }): Partial<AcdCameraCardConfig> {
    return {
      entity:
        Object.keys(hass.states).find((e) => e.startsWith("camera.")) ??
        "camera.example",
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-camera-card-editor");
  }

  public getGridOptions() {
    return { columns: "full", rows: "auto", min_columns: 6 };
  }

  public override getCardSize(): number {
    return 4;
  }

  /* ---------- refresh ---------- */

  public override connectedCallback(): void {
    super.connectedCallback();
    void this._loadStreamElement();
    this._restartTimer();
  }

  /**
   * `ha-camera-stream` lives in a chunk the frontend only loads on demand.
   * Instantiating a core card that depends on it pulls that chunk in —
   * without this, `stream: true` would silently stay on snapshots.
   */
  private async _loadStreamElement(): Promise<void> {
    if (!this._config?.stream || customElements.get("ha-camera-stream")) {
      return;
    }
    try {
      const helpers = await (
        window as unknown as {
          loadCardHelpers?: () => Promise<{
            createCardElement: (c: Record<string, unknown>) => unknown;
          }>;
        }
      ).loadCardHelpers?.();
      helpers?.createCardElement({
        type: "picture-entity",
        entity: this._config.entity,
        camera_view: "live",
      });
      await customElements.whenDefined("ha-camera-stream");
    } catch {
      /* on garde le repli sur l'aperçu rafraîchi */
    }
    this._restartTimer();
    this.requestUpdate();
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._timer) window.clearInterval(this._timer);
    this._timer = undefined;
  }

  private _restartTimer(): void {
    if (this._timer) window.clearInterval(this._timer);
    this._timer = undefined;
    if (!this.isConnected || this._useStream()) return;
    const seconds = Math.max(this._config?.refresh_interval ?? 10, 2);
    this._timer = window.setInterval(() => {
      this._bust = Date.now();
    }, seconds * 1000);
  }

  /* ---------- data ---------- */

  /** `ha-camera-stream` is lazy-loaded by HA; fall back to snapshots. */
  private _useStream(): boolean {
    return (
      !!this._config?.stream && !!customElements.get("ha-camera-stream")
    );
  }

  private _snapshotUrl(): string | undefined {
    if (this._config?.image) return this._config.image;
    const picture = this.getEntity(this._config?.entity)?.attributes
      .entity_picture as string | undefined;
    if (!picture) return undefined;
    const sep = picture.includes("?") ? "&" : "?";
    return `${picture}${sep}acd=${this._bust}`;
  }

  private _areaName(): string | undefined {
    const id = this._config?.entity;
    if (!id) return undefined;
    const entry = this.hass?.entities?.[id];
    let areaId = entry?.area_id ?? undefined;
    if (!areaId && entry?.device_id) {
      areaId = this.hass?.devices?.[entry.device_id]?.area_id ?? undefined;
    }
    return areaId ? this.hass?.areas?.[areaId]?.name : undefined;
  }

  private _caption(): string {
    const c = this._config!;
    if (c.caption) return c.caption;
    const stateObj = this.getEntity(c.entity);
    const name =
      c.name ??
      (stateObj?.attributes.friendly_name as string | undefined) ??
      c.entity;
    const area = c.area ?? this._areaName();
    return area ? `${area} · ${name}` : name;
  }

  /** The badge claims a live feed, so only show it when one is reachable. */
  private _isLive(): boolean {
    if (this._failed) return false;
    const st = this.getEntity(this._config?.entity)?.state;
    if (!st) return false;
    return !["unavailable", "unknown", "off"].includes(st);
  }

  /* ---------- render ---------- */

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const stateObj = this.getEntity(c.entity);

    if (!stateObj) {
      return html`<ha-card class="error">
        ${this.t("Entité introuvable :", "Entity not found:")} ${c.entity}
      </ha-card>`;
    }

    const url = this._snapshotUrl();
    const frameStyle = styleMap({
      aspectRatio: c.height ? undefined : c.aspect_ratio ?? "16/9",
      height: c.height ? `${c.height}px` : undefined,
    });

    return html`
      <ha-card @click=${() => this.moreInfo(c.entity)}>
        <div class="frame" style=${frameStyle}>
          ${this._useStream()
            ? html`<ha-camera-stream
                .hass=${this.hass}
                .stateObj=${stateObj}
                muted
                playsinline
              ></ha-camera-stream>`
            : url && !this._failed
            ? html`<img
                src=${url}
                alt=${this._caption()}
                @error=${() => {
                  this._failed = true;
                }}
              />`
            : html`<div class="fallback">
                <ha-icon icon="mdi:video-off-outline"></ha-icon>
                <span
                  >${this.t("Aperçu indisponible", "Preview unavailable")}</span
                >
              </div>`}

          ${c.show_live_badge && this._isLive()
            ? html`<span class="badge live">
                <span class="dot"></span>${c.live_text ?? "Live"}
              </span>`
            : nothing}
          ${c.show_caption
            ? html`<span class="badge caption">${this._caption()}</span>`
            : nothing}
        </div>
      </ha-card>
    `;
  }

  static override styles = [
    tokens,
    css`
      :host {
        display: block;
      }

      ha-card {
        /* Colonne flex pour que le cadre remplisse la cellule de la grille
           quand une hauteur lui est imposée (rows fixes), tout en gardant
           le format d'image comme hauteur naturelle sinon. */
        display: flex;
        flex-direction: column;
        padding: 0;
        overflow: hidden;
        background: var(--acd-bg-active);
        border: 1px solid var(--acd-border);
        border-radius: var(--acd-radius);
        box-shadow: var(--acd-shadow);
        font-family: var(--acd-font);
        color: var(--acd-text);
        cursor: pointer;
        box-sizing: border-box;
        height: 100%;
      }
      ha-card.error {
        padding: 12px 14px;
        font-size: 13px;
        color: var(--error-color, #b3261e);
        cursor: default;
        background: var(--acd-bg);
      }

      .frame {
        position: relative;
        width: 100%;
        flex: 1 1 auto;
        overflow: hidden;
        background: var(--acd-bg-active);
      }

      img,
      ha-camera-stream {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .fallback {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: var(--acd-text-secondary);
        font-size: 12px;
        --mdc-icon-size: 26px;
      }

      .badge {
        position: absolute;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 22px;
        padding: 0 10px;
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(4px);
        color: var(--acd-text);
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
        max-width: calc(100% - 24px);
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .badge.live {
        top: 12px;
        left: 12px;
      }
      .badge.caption {
        bottom: 12px;
        left: 12px;
        font-weight: 500;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--acd-live);
        flex-shrink: 0;
      }
    `,
    densityStyles(
      ".badge{height:19px;padding:0 8px;font-size:9px}.badge.live{top:9px;left:9px}.badge.caption{bottom:9px;left:9px}", ".badge.caption{display:none}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdCameraCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Camera Card",
  description:
    "Camera tile: rounded snapshot or live stream, Live badge and room caption.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-camera-card": AcdCameraCard;
  }
}
