import { css, html, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdDatetimeCardConfig, HassEntity } from "../../types";

const CARD_TYPE = "acd-datetime-card";

/** Rafraîchissement des prévisions du jour (min/max). */
const FORECAST_MS = 30 * 60 * 1000;

/** Condition météo → icône MDI + libellé FR/EN. */
const CONDITIONS: Record<string, [string, string, string]> = {
  "clear-night": ["mdi:weather-night", "Nuit claire", "Clear night"],
  cloudy: ["mdi:weather-cloudy", "Nuageux", "Cloudy"],
  exceptional: ["mdi:alert-circle-outline", "Exceptionnel", "Exceptional"],
  fog: ["mdi:weather-fog", "Brouillard", "Fog"],
  hail: ["mdi:weather-hail", "Grêle", "Hail"],
  lightning: ["mdi:weather-lightning", "Orage", "Lightning"],
  "lightning-rainy": [
    "mdi:weather-lightning-rainy",
    "Orage pluvieux",
    "Thunderstorm",
  ],
  partlycloudy: [
    "mdi:weather-partly-cloudy",
    "Partiellement nuageux",
    "Partly cloudy",
  ],
  pouring: ["mdi:weather-pouring", "Pluie forte", "Pouring"],
  rainy: ["mdi:weather-rainy", "Pluvieux", "Rainy"],
  snowy: ["mdi:weather-snowy", "Neigeux", "Snowy"],
  "snowy-rainy": ["mdi:weather-snowy-rainy", "Pluie et neige", "Sleet"],
  sunny: ["mdi:weather-sunny", "Ensoleillé", "Sunny"],
  windy: ["mdi:weather-windy", "Venteux", "Windy"],
  "windy-variant": ["mdi:weather-windy-variant", "Venteux", "Windy"],
};

interface ForecastDay {
  temperature?: number;
  templow?: number;
}

/**
 * Heure, date du jour et météo courante dans une seule tuile.
 *
 * L'horloge tourne pour de vrai (timer interne, pas de dépendance à un
 * capteur d'heure), et toute la typographie est exprimée en unités de
 * conteneur : la carte reste lisible quelle que soit la taille à laquelle
 * on la redimensionne dans la grille.
 */
export class AcdDatetimeCard extends AcdBaseCard<AcdDatetimeCardConfig> {
  @state() private _now = new Date();
  @state() private _forecast?: ForecastDay;

  private _timer?: number;
  private _forecastAt = 0;

  protected override defaults(): Partial<AcdDatetimeCardConfig> {
    return {
      weather_entity: "weather.forecast_maison",
      show_seconds: false,
      show_weather: true,
      show_greeting: true,
      show_range: true,
    };
  }

  public static getStubConfig(hass: {
    states: Record<string, unknown>;
  }): Partial<AcdDatetimeCardConfig> {
    return {
      weather_entity:
        Object.keys(hass.states).find((e) => e.startsWith("weather.")) ??
        "weather.home",
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-datetime-card-editor");
  }

  /** Bornes larges : la tuile est pensée pour être redimensionnée. */
  public getGridOptions(): Record<string, unknown> {
    return {
      columns: 12,
      rows: 3,
      min_columns: 4,
      min_rows: 2,
      max_rows: 12,
    };
  }

  public override getCardSize(): number {
    return 3;
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    this._timer = window.setInterval(() => {
      this._now = new Date();
    }, 1000);
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._timer) window.clearInterval(this._timer);
  }

  protected override updated(): void {
    void this._maybeFetchForecast();
  }

  /* --------------------------------------------------------------- data */

  private get _weather(): HassEntity | undefined {
    return this.getEntity(this._config?.weather_entity);
  }

  /**
   * Min/max du jour : `forecast` n'est plus un attribut de l'entité, il faut
   * passer par le service `weather.get_forecasts`. Un échec est sans
   * conséquence — la ligne min/max disparaît simplement.
   */
  private async _maybeFetchForecast(): Promise<void> {
    const c = this._config;
    if (!c?.show_weather || !c.show_range || !this.hass || !c.weather_entity) {
      return;
    }
    const now = Date.now();
    if (this._forecast && now - this._forecastAt < FORECAST_MS) return;
    this._forecastAt = now;
    try {
      const res = (await (
        this.hass.callService as unknown as (
          domain: string,
          service: string,
          data: Record<string, unknown>,
          target: Record<string, unknown>,
          notify: boolean,
          returnResponse: boolean
        ) => Promise<{ response?: Record<string, { forecast?: ForecastDay[] }> }>
      )(
        "weather",
        "get_forecasts",
        { type: "daily" },
        { entity_id: c.weather_entity },
        false,
        true
      )) as { response?: Record<string, { forecast?: ForecastDay[] }> };
      const list = res?.response?.[c.weather_entity]?.forecast;
      if (Array.isArray(list) && list.length) this._forecast = list[0];
    } catch {
      this._forecast = undefined;
    }
  }

  private _greeting(): string {
    const h = this._now.getHours();
    if (h < 6) return this.t("Bonne nuit", "Good night");
    if (h < 12) return this.t("Bonjour", "Good morning");
    if (h < 18) return this.t("Bon après-midi", "Good afternoon");
    return this.t("Bonsoir", "Good evening");
  }

  private _locale(): string {
    return this.hass?.language?.startsWith("fr") ? "fr-FR" : "en-GB";
  }

  /* ------------------------------------------------------------- render */

  private _weatherBlock(): TemplateResult | typeof nothing {
    const c = this._config!;
    const stateObj = this._weather;
    if (!c.show_weather || !stateObj) return nothing;

    const entry = CONDITIONS[stateObj.state];
    const icon = entry?.[0] ?? "mdi:weather-cloudy";
    const label = entry
      ? this.t(entry[1], entry[2])
      : (this.hass?.formatEntityState?.(stateObj) ?? stateObj.state);

    const temp = stateObj.attributes.temperature as number | undefined;
    const f = this._forecast;
    const range =
      c.show_range && f && (f.templow != null || f.temperature != null)
        ? `${f.templow != null ? Math.round(f.templow) : "—"}° / ${
            f.temperature != null ? Math.round(f.temperature) : "—"
          }°`
        : "";

    return html`
      <div class="right" @click=${this._openWeather}>
        <div class="wx">
          <span class="temp"
            >${temp == null ? "—" : Math.round(temp)}<span class="unit"
              >°C</span
            ></span
          >
          <span class="cond">${label}</span>
          ${range ? html`<span class="range">${range}</span>` : nothing}
        </div>
        <span class="chip"><ha-icon .icon=${icon}></ha-icon></span>
      </div>
    `;
  }

  private _openWeather = (): void => {
    const id = this._config?.weather_entity;
    if (id) this.moreInfo(id);
  };

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config) return nothing;
    const c = this._config;
    const d = this._now;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");

    return html`
      <ha-card>
        <div class="left">
          ${c.show_greeting
            ? html`<span class="greeting">${this._greeting()}</span>`
            : nothing}
          <span class="time"
            >${hh}:${mm}${c.show_seconds
              ? html`<span class="sec">:${ss}</span>`
              : nothing}</span
          >
          <span class="date"
            >${d.toLocaleDateString(this._locale(), {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}</span
          >
        </div>
        ${this._weatherBlock()}
      </ha-card>
    `;
  }

  static override styles = [
    tokens,
    css`
      :host {
        display: block;
        height: 100%;
      }

      /* container-type: size autorise les unités cqi ET cqh : la
         typographie suit la largeur comme la hauteur du redimensionnement. */
      ha-card {
        container-type: size;
        box-sizing: border-box;
        height: 100%;
        min-height: 84px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: clamp(8px, 3cqi, 20px);
        padding: clamp(12px, 4cqi, 22px) clamp(14px, 5cqi, 24px);
        background: var(--acd-pill);
        border: 1px solid var(--acd-border);
        border-radius: var(--acd-radius);
        box-shadow: var(--acd-shadow);
        font-family: var(--acd-font);
        color: var(--acd-text);
      }

      .left {
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .greeting {
        font-size: clamp(10px, min(3.2cqi, 11cqh), 15px);
        font-weight: 600;
        letter-spacing: 0.02em;
        color: var(--acd-text-secondary);
      }

      .time {
        font-size: clamp(24px, min(11cqi, 38cqh), 64px);
        font-weight: 700;
        line-height: 1.04;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .time .sec {
        font-size: 0.45em;
        font-weight: 600;
        color: var(--acd-text-secondary);
        margin-left: 2px;
      }

      .date {
        margin-top: 2px;
        font-size: clamp(11px, min(3.6cqi, 12cqh), 17px);
        font-weight: 500;
        color: var(--acd-text-secondary);
        text-transform: capitalize;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .right {
        display: flex;
        align-items: center;
        gap: clamp(6px, 2.5cqi, 14px);
        flex: 0 0 auto;
        cursor: pointer;
      }

      .wx {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .temp {
        font-size: clamp(16px, min(6.5cqi, 22cqh), 34px);
        font-weight: 700;
        line-height: 1.1;
        font-variant-numeric: tabular-nums;
      }
      .temp .unit {
        font-size: 0.55em;
        font-weight: 500;
      }

      .cond {
        font-size: clamp(10px, min(3.2cqi, 11cqh), 15px);
        color: var(--acd-text-secondary);
        white-space: nowrap;
      }

      .range {
        font-size: clamp(9px, min(2.9cqi, 10cqh), 13px);
        color: var(--acd-text-secondary);
        font-variant-numeric: tabular-nums;
      }

      .chip {
        flex: 0 0 auto;
        width: clamp(34px, 13cqi, 64px);
        height: clamp(34px, 13cqi, 64px);
        border-radius: var(--acd-radius-inner);
        background: var(--acd-track);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chip ha-icon {
        --mdc-icon-size: clamp(18px, 7cqi, 34px);
        color: var(--acd-accent);
      }
    `,
    densityStyles(
      `.greeting{display:none}
       .date{margin-top:1px}`,
      `.cond{display:none}
       .range{display:none}`
    ),
  ];
}

safeDefine(CARD_TYPE, AcdDatetimeCard);

registerCard({
  type: CARD_TYPE,
  name: "ACD Date & météo",
  description:
    "Heure, date du jour et météo courante, redimensionnable à volonté.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-datetime-card": AcdDatetimeCard;
  }
}
