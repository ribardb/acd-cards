import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { classMap } from "lit/directives/class-map.js";
import { safeDefine } from "./register";
import { tokens } from "./tokens";

/**
 * Reusable ACD slider (0–100), touch-first.
 *
 * Two visual modes:
 *  - "fill"  : rounded track with a white filled pill + leading icon and a
 *              trailing % label — the brightness bar of the reference design.
 *  - "thumb" : gradient track with a round draggable thumb — used for
 *              color temperature and hue.
 *
 * Pointer capture is taken on the track itself so the drag follows the
 * finger 1:1, even outside the element. Transitions are disabled while
 * dragging for precise, lag-free tracking.
 *
 * Fires `value-changed` (detail: number, rounded) on release.
 */
export class AcdSlider extends LitElement {
  @property({ type: Number }) public value = 0;
  @property({ type: Boolean }) public disabled = false;
  @property({ type: Boolean }) public thumb = false;
  @property() public icon = "";
  @property() public track = "";
  @property({ type: Boolean, attribute: "show-label" }) public showLabel =
    false;

  @state() private _drag?: number;

  private get _displayed(): number {
    return this._drag ?? this.value;
  }

  private _valueFromEvent(ev: PointerEvent): number {
    const rect = this.getBoundingClientRect();
    const pct = ((ev.clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  private _onPointerDown = (ev: PointerEvent): void => {
    if (this.disabled) return;
    ev.preventDefault();
    ev.stopPropagation();
    const target = ev.currentTarget as HTMLElement;
    target.setPointerCapture(ev.pointerId);
    this._drag = this._valueFromEvent(ev);
  };

  private _onPointerMove = (ev: PointerEvent): void => {
    if (this._drag === undefined) return;
    ev.preventDefault();
    this._drag = this._valueFromEvent(ev);
  };

  private _onPointerUp = (ev: PointerEvent): void => {
    if (this._drag === undefined) return;
    const target = ev.currentTarget as HTMLElement;
    if (target.hasPointerCapture(ev.pointerId)) {
      target.releasePointerCapture(ev.pointerId);
    }
    const value = Math.round(this._valueFromEvent(ev));
    this._drag = undefined;
    this.value = value;
    this.dispatchEvent(new CustomEvent("value-changed", { detail: value }));
  };

  private _onPointerCancel = (): void => {
    // Drag interrupted (e.g. system gesture): revert without firing.
    this._drag = undefined;
  };

  protected override render() {
    const v = this._displayed;
    const dragging = this._drag !== undefined;
    const classes = classMap({ disabled: this.disabled, dragging });

    if (this.thumb) {
      return html`
        <div
          class="track thumb-track ${classes}"
          style=${styleMap({ background: this.track || undefined })}
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerCancel}
        >
          <div class="thumb" style=${styleMap({ left: `${v}%` })}>
            ${dragging
              ? html`<span class="bubble">${Math.round(v)}%</span>`
              : nothing}
          </div>
        </div>
      `;
    }
    return html`
      <div
        class="track fill-track ${classes}"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
      >
        <div class="fill" style=${styleMap({ width: `${Math.max(v, 14)}%` })}>
          ${this.icon
            ? html`<ha-icon class="fill-icon" .icon=${this.icon}></ha-icon>`
            : nothing}
        </div>
        ${this.showLabel
          ? html`<span class="label">${Math.round(v)}%</span>`
          : nothing}
      </div>
    `;
  }

  static override styles = [
    tokens,
    css`
      :host {
        display: block;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      .track {
        position: relative;
        height: 44px;
        border-radius: 22px;
        background: var(--acd-track);
        cursor: pointer;
        overflow: hidden;
        touch-action: none;
      }
      .track.disabled {
        opacity: 0.4;
        pointer-events: none;
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--acd-pill);
        border-radius: 22px;
        box-shadow: var(--acd-shadow);
        display: flex;
        align-items: center;
        padding-inline-start: 12px;
        box-sizing: border-box;
        transition: width 120ms ease-out;
        pointer-events: none;
      }
      .track.dragging .fill {
        transition: none;
      }
      .fill-icon {
        --mdc-icon-size: 18px;
        color: var(--acd-text);
      }
      .label {
        position: absolute;
        top: 50%;
        right: 14px;
        transform: translateY(-50%);
        font-family: var(--acd-font);
        font-size: 13px;
        font-weight: 600;
        color: var(--acd-text);
        pointer-events: none;
      }
      .thumb-track {
        height: 16px;
        border-radius: 8px;
        margin: 14px 0;
        overflow: visible;
      }
      /* Invisible extended hit area for finger-friendly dragging */
      .thumb-track::before {
        content: "";
        position: absolute;
        inset: -14px 0;
      }
      .thumb {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.22);
        transition: left 120ms ease-out;
        pointer-events: none;
      }
      .thumb-track.dragging .thumb {
        transition: none;
        width: 32px;
        height: 32px;
      }
      .bubble {
        position: absolute;
        bottom: calc(100% + 10px);
        left: 50%;
        transform: translateX(-50%);
        background: var(--acd-accent);
        color: var(--acd-on-accent);
        font-family: var(--acd-font);
        font-size: 12px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 8px;
        white-space: nowrap;
      }
    `,
  ];
}

safeDefine("acd-slider", AcdSlider);

declare global {
  interface HTMLElementTagNameMap {
    "acd-slider": AcdSlider;
  }
}
