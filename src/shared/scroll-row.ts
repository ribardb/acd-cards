import { LitElement, css, html, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { safeDefine } from "./register";

/**
 * `acd-scroll-row` — horizontal scroll container shared by the mobile cards.
 *
 * Free scrolling (no snap by default), hidden scrollbar, iOS momentum, and a
 * gradient mask on whichever edge still has content to reveal. Children are
 * never shrunk, so partially visible tiles hint at the overflow.
 *
 * Consumers tune it with CSS custom properties:
 *   --acd-scroll-gap      gap between children      (default 8px)
 *   --acd-scroll-inset    horizontal padding        (default 0)
 *   --acd-scroll-fade     fade width on the edges   (default 18px)
 */
export class AcdScrollRow extends LitElement {
  /** Snap each child to the left edge when the drag is released. */
  @property({ type: Boolean }) public snap = false;

  @state() private _atStart = true;
  @state() private _atEnd = true;

  private _ro?: ResizeObserver;
  private _mo?: MutationObserver;

  public override connectedCallback(): void {
    super.connectedCallback();
    this._ro = new ResizeObserver(() => this._sync());
    this._ro.observe(this);
    // Children arrive/leave as entities update — keep the fades honest.
    this._mo = new MutationObserver(() => this._sync());
    this._mo.observe(this, { childList: true, subtree: true });
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._mo?.disconnect();
    this._ro = undefined;
    this._mo = undefined;
  }

  protected override firstUpdated(): void {
    this._sync();
  }

  private get _track(): HTMLElement | null {
    return (this.renderRoot?.querySelector(".track") as HTMLElement) ?? null;
  }

  private _sync = (): void => {
    const track = this._track;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    // 2px tolerance: sub-pixel layouts never report an exact 0 / max.
    const atStart = max <= 2 || track.scrollLeft <= 2;
    const atEnd = max <= 2 || track.scrollLeft >= max - 2;
    if (atStart !== this._atStart) this._atStart = atStart;
    if (atEnd !== this._atEnd) this._atEnd = atEnd;
  };

  /** Scrolls by one viewport width — used by optional arrow controls. */
  public scrollByPage(direction: 1 | -1): void {
    const track = this._track;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  }

  protected override render(): TemplateResult {
    return html`
      <div
        class="track ${classMap({
          "fade-start": !this._atStart,
          "fade-end": !this._atEnd,
          snap: this.snap,
        })}"
        @scroll=${this._sync}
      >
        <slot @slotchange=${this._sync}></slot>
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      min-width: 0;
    }

    .track {
      display: flex;
      align-items: stretch;
      gap: var(--acd-scroll-gap, 8px);
      padding: var(--acd-scroll-inset, 0);
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .track::-webkit-scrollbar {
      display: none;
    }

    .track.snap {
      scroll-snap-type: x mandatory;
      scroll-padding-left: var(--acd-scroll-inset, 0);
    }
    .track.snap ::slotted(*) {
      scroll-snap-align: start;
    }

    /* Children keep their intrinsic width: overflow is the point. */
    ::slotted(*) {
      flex: 0 0 auto;
    }

    /* Gradient masks, applied only on the edge that has hidden content. */
    .track.fade-start.fade-end {
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0,
        #000 var(--acd-scroll-fade, 18px),
        #000 calc(100% - var(--acd-scroll-fade, 18px)),
        transparent 100%
      );
      mask-image: linear-gradient(
        to right,
        transparent 0,
        #000 var(--acd-scroll-fade, 18px),
        #000 calc(100% - var(--acd-scroll-fade, 18px)),
        transparent 100%
      );
    }
    .track.fade-start:not(.fade-end) {
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0,
        #000 var(--acd-scroll-fade, 18px)
      );
      mask-image: linear-gradient(
        to right,
        transparent 0,
        #000 var(--acd-scroll-fade, 18px)
      );
    }
    .track:not(.fade-start).fade-end {
      -webkit-mask-image: linear-gradient(
        to right,
        #000 calc(100% - var(--acd-scroll-fade, 18px)),
        transparent 100%
      );
      mask-image: linear-gradient(
        to right,
        #000 calc(100% - var(--acd-scroll-fade, 18px)),
        transparent 100%
      );
    }

    @media (prefers-reduced-motion: reduce) {
      .track {
        scroll-behavior: auto;
      }
    }
  `;
}

safeDefine("acd-scroll-row", AcdScrollRow);

declare global {
  interface HTMLElementTagNameMap {
    "acd-scroll-row": AcdScrollRow;
  }
}
