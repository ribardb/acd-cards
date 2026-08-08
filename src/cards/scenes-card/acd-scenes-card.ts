import { css, html, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import "../../shared/scroll-row";
import type { AcdScenesCardConfig, HassEntity } from "../../types";

const CARD_TYPE = "acd-scenes-card";

/** Icône déduite du nom quand la scène n'en déclare pas. */
const NAME_ICONS: Array<[RegExp, string]> = [
  [/matin|jour|lumineux|réveil|reveil/i, "mdi:white-balance-sunny"],
  [/cinéma|cinema|tv|film/i, "mdi:television-classic"],
  [/nuit|coucher|veilleuse|dodo/i, "mdi:weather-night"],
  [/absent|départ|depart|away/i, "mdi:exit-run"],
  [/arrivée|arrivee|retour/i, "mdi:home-import-outline"],
  [/détente|detente|relax|zen|atténué|attenue/i, "mdi:sofa-outline"],
  [/repas|dîner|diner|table/i, "mdi:silverware-fork-knife"],
  [/lecture|travail|bureau/i, "mdi:book-open-page-variant"],
];

/**
 * Rangée de scènes d'une pièce, façon maquette : pastilles horizontales,
 * la dernière activée mise en avant. Les scènes sont lues dans la zone
 * Home Assistant, donc une nouvelle scène apparaît sans configuration.
 */
export class AcdScenesCard extends AcdBaseCard<AcdScenesCardConfig> {
  /** Dernière scène activée depuis la carte, avant que HA ne rafraîchisse. */
  @state() private _pending?: string;

  protected override defaults(): Partial<AcdScenesCardConfig> {
    return { show_add_button: false, highlight_last: true, snap: false };
  }

  public static getStubConfig(): Partial<AcdScenesCardConfig> {
    return {};
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-scenes-card-editor");
  }

  public getGridOptions(): Record<string, unknown> {
    return { columns: "full", rows: "auto", min_columns: 6 };
  }

  public override getCardSize(): number {
    return 1;
  }

  /* ------------------------------------------------------------- scènes */

  private _areaEntityIds(areaId: string): string[] {
    const deviceIds = new Set(
      Object.values(this.hass?.devices ?? {})
        .filter((d) => d.area_id === areaId)
        .map((d) => d.id)
    );
    return Object.values(this.hass?.entities ?? {})
      .filter(
        (e) =>
          !e.hidden &&
          (e.area_id === areaId ||
            (e.area_id == null && !!e.device_id && deviceIds.has(e.device_id)))
      )
      .map((e) => e.entity_id);
  }

  private _scenes(): HassEntity[] {
    const c = this._config;
    if (!c || !this.hass) return [];
    const ids = c.entities?.length
      ? c.entities
      : c.area
      ? this._areaEntityIds(c.area).filter((id) => id.startsWith("scene."))
      : [];
    return ids
      .map((id) => this.hass!.states[id])
      .filter((s): s is HassEntity => !!s);
  }

  private _icon(stateObj: HassEntity): string {
    const declared = stateObj.attributes.icon as string | undefined;
    if (declared) return declared;
    const name = (stateObj.attributes.friendly_name as string) ?? "";
    for (const [pattern, icon] of NAME_ICONS) {
      if (pattern.test(name)) return icon;
    }
    return "mdi:palette-outline";
  }

  private _label(stateObj: HassEntity): string {
    const full = (stateObj.attributes.friendly_name as string) ?? stateObj.entity_id;
    // « Salon Détente » → « Détente » : le nom de la pièce est déjà en titre.
    const area = this._config?.area;
    const areaName = area ? this.hass?.areas?.[area]?.name : undefined;
    if (areaName && full.toLowerCase().startsWith(areaName.toLowerCase())) {
      const trimmed = full.slice(areaName.length).trim();
      if (trimmed) return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
    return full;
  }

  /** La scène la plus récemment appliquée porte l'état le plus récent. */
  private _activeId(scenes: HassEntity[]): string | undefined {
    if (this._pending) return this._pending;
    if (this._config?.highlight_last === false) return undefined;
    let best: HassEntity | undefined;
    let bestTime = 0;
    for (const scene of scenes) {
      const time = Date.parse(scene.state);
      if (Number.isFinite(time) && time > bestTime) {
        bestTime = time;
        best = scene;
      }
    }
    // Au-delà de 12 h, on ne prétend plus qu'une scène est « en cours ».
    if (!best || Date.now() - bestTime > 12 * 3600 * 1000) return undefined;
    return best.entity_id;
  }

  private _apply(id: string, ev: Event): void {
    ev.stopPropagation();
    this._pending = id;
    this.hass.callService("scene", "turn_on", { entity_id: id });
  }

  /* ------------------------------------------------------------- render */

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const scenes = this._scenes();
    if (!scenes.length && !c.show_add_button) return nothing;
    const active = this._activeId(scenes);

    return html`
      <acd-scroll-row class="row" .snap=${!!c.snap}>
        ${scenes.map((scene) => {
          const on = scene.entity_id === active;
          return html`
            <button
              class="scene ${classMap({ active: on })}"
              title=${this._label(scene)}
              @click=${(ev: Event) => this._apply(scene.entity_id, ev)}
            >
              <ha-icon .icon=${this._icon(scene)}></ha-icon>
              <span class="lbl">${this._label(scene)}</span>
            </button>
          `;
        })}
        ${c.show_add_button
          ? html`<button
              class="scene add"
              @click=${() => {
                history.pushState(null, "", "/config/scene/edit/new");
                window.dispatchEvent(new CustomEvent("location-changed"));
              }}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
              <span class="lbl">${this.t("Nouvelle scène", "New scene")}</span>
            </button>`
          : nothing}
      </acd-scroll-row>
    `;
  }

  static override styles = [
    tokens,
    css`
      :host {
        display: block;
        font-family: var(--acd-font);
      }
      .row {
        --acd-scroll-gap: 8px;
        --acd-scroll-inset: 0 2px;
        --acd-scroll-fade: 16px;
      }

      .scene {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 38px;
        padding: 0 16px 0 13px;
        border-radius: 999px;
        border: 1px solid var(--acd-border);
        background: var(--acd-pill);
        font-family: var(--acd-font);
        font-size: 13px;
        font-weight: 600;
        color: var(--acd-text);
        cursor: pointer;
        white-space: nowrap;
        --mdc-icon-size: 17px;
        transition: background 160ms ease, color 160ms ease,
          border-color 160ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .scene:hover {
        border-color: var(--acd-accent);
      }
      /* Scène en cours : pastille pleine, comme « Matin » dans la maquette. */
      .scene.active {
        background: var(--acd-accent);
        border-color: transparent;
        color: var(--acd-on-accent);
      }
      .scene.add {
        border-style: dashed;
        color: var(--acd-text-secondary);
      }
      .scene:focus-visible {
        outline: 2px solid var(--acd-accent);
        outline-offset: 2px;
      }
    `,
    densityStyles(
      ".scene{height:34px;font-size:12px;padding:0 13px 0 11px;--mdc-icon-size:15px}",
      ".scene .lbl{display:none}.scene{padding:0 11px;gap:0}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdScenesCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Scenes Card",
  description:
    "Horizontal scene chips for an area, highlighting the last one applied.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-scenes-card": AcdScenesCard;
  }
}
