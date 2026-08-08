import { css, html, nothing, type TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { AcdBaseCard } from "../../shared/base-card";
import { tokens } from "../../shared/tokens";
import { densityStyles } from "../../shared/density";
import { safeDefine, registerCard } from "../../shared/register";
import type { AcdDeviceCardConfig, HassEntity } from "../../types";

const CARD_TYPE = "acd-device-card";

/** Domaines pilotables par un simple toggle. */
const TOGGLEABLE = [
  "switch",
  "input_boolean",
  "fan",
  "media_player",
  "automation",
  "script",
  "siren",
  "remote",
  "humidifier",
];

const DOMAIN_ICONS: Record<string, string> = {
  switch: "mdi:power-socket-eu",
  media_player: "mdi:television",
  fan: "mdi:fan",
  lock: "mdi:lock",
  sensor: "mdi:gauge",
  binary_sensor: "mdi:motion-sensor",
  automation: "mdi:robot",
  script: "mdi:script-text",
  scene: "mdi:palette",
  remote: "mdi:remote",
  siren: "mdi:bullhorn",
  humidifier: "mdi:air-humidifier",
  vacuum: "mdi:robot-vacuum",
  camera: "mdi:cctv",
};

/**
 * Tuile d'appareil générique, calquée sur la maquette : pastille d'icône,
 * interrupteur, nom, sous-titre, barre de progression optionnelle et ligne
 * de pied. Elle sert de repli dans la grille d'une pièce pour les domaines
 * qui n'ont pas de carte ACD dédiée (téléviseur, enceinte, prise…).
 */
export class AcdDeviceCard extends AcdBaseCard<AcdDeviceCardConfig> {
  protected override defaults(): Partial<AcdDeviceCardConfig> {
    return {
      show_toggle: true,
      show_bar: true,
      show_footer: true,
      compact: false,
    };
  }

  public override setConfig(config: AcdDeviceCardConfig): void {
    if (!config.entity) {
      throw new Error("Please define an entity (`entity`).");
    }
    super.setConfig(config);
  }

  public static getStubConfig(hass: {
    states: Record<string, unknown>;
  }): Partial<AcdDeviceCardConfig> {
    return {
      entity:
        Object.keys(hass.states).find((e) => e.startsWith("switch.")) ??
        "switch.example",
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("acd-device-card-editor");
  }

  public getGridOptions(): Record<string, unknown> {
    return { columns: 6, rows: "auto", min_columns: 4 };
  }

  public override getCardSize(): number {
    return 2;
  }

  private get _stateObj(): HassEntity | undefined {
    return this.getEntity(this._config?.entity);
  }

  private _domain(): string {
    return (this._config?.entity ?? "").split(".")[0];
  }

  /* --------------------------------------------------------------- état */

  private _isOffline(stateObj: HassEntity): boolean {
    return ["unavailable", "unknown"].includes(stateObj.state);
  }

  private _isOn(stateObj: HassEntity): boolean {
    return !["off", "idle", "standby", "unavailable", "unknown", "closed"].includes(
      stateObj.state
    );
  }

  /** Valeur 0-100 de la barre, selon ce que le domaine sait exposer. */
  private _level(stateObj: HassEntity): number | undefined {
    const a = stateObj.attributes;
    if (a.brightness != null) return Math.round((a.brightness / 255) * 100);
    if (a.current_position != null) return Number(a.current_position);
    if (a.volume_level != null) return Math.round(a.volume_level * 100);
    if (a.percentage != null) return Number(a.percentage);
    if (a.battery_level != null) return Number(a.battery_level);
    const numeric = Number(stateObj.state);
    return this._domain() === "sensor" && Number.isFinite(numeric)
      ? undefined
      : undefined;
  }

  private _stateText(stateObj: HassEntity): string {
    if (this._isOffline(stateObj)) return this.t("Hors ligne", "Offline");
    if (stateObj.state === "standby") return this.t("En veille", "Standby");
    const formatted = this.hass?.formatEntityState?.(stateObj);
    return formatted ?? stateObj.state;
  }

  /** Ligne de pied : dernier usage, avertissement, ou détail d'état. */
  private _footer(stateObj: HassEntity): TemplateResult | typeof nothing {
    const c = this._config!;
    if (!c.show_footer) return nothing;
    if (c.footer) return html`<span class="foot">${c.footer}</span>`;

    if (this._isOffline(stateObj)) {
      return html`<span class="foot warn">
        <ha-icon icon="mdi:alert-outline"></ha-icon>
        ${this.t("Reconnexion requise", "Reconnection required")}
      </span>`;
    }

    const level = this._level(stateObj);
    if (level != null) {
      const suffix =
        this._domain() === "cover"
          ? this.t("d'ouverture", "open")
          : this._domain() === "media_player"
          ? this.t("de volume", "volume")
          : this.t("de niveau", "level");
      return html`<span class="foot">${level} % ${suffix}</span>`;
    }

    const changed = stateObj.last_changed;
    if (!changed) return nothing;
    const when = new Date(changed);
    const fr = this.hass?.language?.startsWith("fr");
    const label = when.toLocaleString(fr ? "fr-FR" : "en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return html`<span class="foot"
      >${this.t("Dernier usage :", "Last used:")} ${label}</span
    >`;
  }

  /* ------------------------------------------------------------ actions */

  private _toggle = (ev: Event): void => {
    ev.stopPropagation();
    const stateObj = this._stateObj;
    if (!stateObj || this._isOffline(stateObj)) return;
    const domain = this._domain();
    const service = TOGGLEABLE.includes(domain) ? domain : "homeassistant";
    this.hass.callService(service, "toggle", {
      entity_id: this._config!.entity,
    });
  };

  private _openInfo = (): void => {
    this.moreInfo(this._config!.entity);
  };

  /* ------------------------------------------------------------- render */

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const stateObj = this._stateObj;
    if (!stateObj) {
      return html`<ha-card class="error">
        ${this.t("Entité introuvable :", "Entity not found:")} ${c.entity}
      </ha-card>`;
    }

    const domain = this._domain();
    const offline = this._isOffline(stateObj);
    const on = !offline && this._isOn(stateObj);
    const name = c.name ?? stateObj.attributes.friendly_name ?? c.entity;
    const icon =
      c.icon ?? stateObj.attributes.icon ?? DOMAIN_ICONS[domain] ?? "mdi:power";
    const level = c.show_bar ? this._level(stateObj) : undefined;
    const subtitle = c.subtitle ?? this._stateText(stateObj);
    const canToggle =
      c.show_toggle &&
      !offline &&
      (TOGGLEABLE.includes(domain) || ["light", "cover"].includes(domain));
    const compact = !!c.compact;

    const chip = html`<span class="chip"
      ><ha-icon .icon=${icon}></ha-icon
    ></span>`;
    const toggle = canToggle
      ? html`<button
          class="toggle ${classMap({ active: on })}"
          aria-label=${this.t("Allumer/éteindre", "Toggle")}
          @click=${this._toggle}
        >
          <span class="knob"></span>
        </button>`
      : nothing;
    const titles = html`
      <div class="titles">
        <span class="name">${name}</span>
        <span class="secondary">${subtitle}</span>
      </div>
    `;

    return html`
      <ha-card
        class=${classMap({ on, offline, compact })}
        @click=${this._openInfo}
      >
        ${compact
          ? html`<div class="top">${chip}${titles}${toggle}</div>`
          : html`<div class="top">${chip}${toggle}</div>
              ${titles}`}

        ${level != null
          ? html`<span class="bar"
              ><span
                class="fill"
                style=${styleMap({ width: `${Math.min(level, 100)}%` })}
              ></span
            ></span>`
          : nothing}
        ${this._footer(stateObj)}
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
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 14px;
        background: var(--acd-pill);
        border: 1px solid var(--acd-border);
        border-radius: var(--acd-radius);
        box-shadow: var(--acd-shadow);
        font-family: var(--acd-font);
        color: var(--acd-text);
        height: 100%;
        box-sizing: border-box;
        cursor: pointer;
        transition: background 180ms ease, border-color 180ms ease;
      }
      /* Actif : la tuile prend le vert olive de la maquette. */
      ha-card.on {
        background: var(--acd-bg-active);
        border-color: transparent;
      }
      ha-card.offline {
        opacity: 0.72;
      }
      ha-card.error {
        font-size: 13px;
        color: var(--error-color, #b3261e);
        cursor: default;
      }

      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .chip {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: var(--acd-track);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--acd-text);
        --mdc-icon-size: 20px;
      }
      ha-card.on .chip {
        background: rgba(255, 255, 255, 0.55);
      }

      /* Mode compact : la pastille rejoint le titre sur une seule ligne,
         au lieu de le surplomber. Orthogonal à la densité, qui ne touche
         qu'aux marges et aux tailles. */
      ha-card.compact .top .titles {
        flex: 1;
      }

      .toggle {
        flex-shrink: 0;
        width: 42px;
        height: 25px;
        border-radius: 13px;
        border: none;
        padding: 3px;
        background: var(--acd-track);
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: background 180ms ease;
      }
      .toggle .knob {
        width: 19px;
        height: 19px;
        border-radius: 50%;
        background: var(--acd-pill);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transition: transform 180ms ease;
      }
      .toggle.active {
        background: var(--acd-accent);
      }
      .toggle.active .knob {
        transform: translateX(17px);
      }

      .titles {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }
      .name {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .secondary {
        font-size: 11.5px;
        color: var(--acd-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bar {
        display: block;
        height: 4px;
        border-radius: 2px;
        background: var(--acd-track);
        overflow: hidden;
      }
      .fill {
        display: block;
        height: 100%;
        border-radius: 2px;
        background: var(--acd-accent);
        transition: width 220ms ease;
      }

      .foot {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: var(--acd-text-secondary);
        --mdc-icon-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .foot.warn {
        color: var(--acd-danger);
      }
    `,
    densityStyles(
      "ha-card{padding:11px;gap:6px}.chip{width:32px;height:32px;border-radius:10px;--mdc-icon-size:17px}" +
        ".name{font-size:13px}.secondary{font-size:10.5px}.foot{font-size:10px}",
      ".foot{display:none}.chip{width:28px;height:28px}"
    ),
  ];
}

safeDefine(CARD_TYPE, AcdDeviceCard);
registerCard({
  type: CARD_TYPE,
  name: "ACD Device Card",
  description:
    "Generic device tile: icon chip, toggle, level bar and status footer.",
});

declare global {
  interface HTMLElementTagNameMap {
    "acd-device-card": AcdDeviceCard;
  }
}
