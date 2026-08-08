import { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import type { HassEntity, HomeAssistant, LovelaceCardConfig } from "../types";

/**
 * Shared foundation for every ACD card:
 * hass/config handling, entity access, events, localization helper.
 */
export abstract class AcdBaseCard<
  C extends LovelaceCardConfig
> extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() protected _config?: C;

  /** Per-card default config values (all display options are optional). */
  protected defaults(): Partial<C> {
    return {};
  }

  public setConfig(config: C): void {
    this._config = { ...this.defaults(), ...config };
    // Pilote les paliers de densité (voir shared/density.ts) : en mode
    // "auto" l'attribut reste absent, ce qui laisse agir les container
    // queries de la carte.
    const density = config.density;
    if (density && density !== "auto") {
      this.setAttribute("data-density", density);
    } else {
      this.removeAttribute("data-density");
    }
  }

  protected getEntity(entityId?: string): HassEntity | undefined {
    return entityId ? this.hass?.states[entityId] : undefined;
  }

  /** Tiny FR/EN localizer driven by the HA user language. */
  protected t(fr: string, en: string): string {
    return this.hass?.language?.startsWith("fr") ? fr : en;
  }

  protected fire(type: string, detail?: unknown): void {
    this.dispatchEvent(
      new CustomEvent(type, { detail, bubbles: true, composed: true })
    );
  }

  protected moreInfo(entityId: string): void {
    this.fire("hass-more-info", { entityId });
  }

  public getCardSize(): number {
    return 3;
  }
}
