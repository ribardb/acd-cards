import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Tracks the host card's own width so a card can adapt its layout to the
 * space it was given rather than to the viewport. This keeps a single YAML
 * working on both a desktop dashboard and a phone: a full-width card on a
 * 375pt screen reports ~343px, the same card in a desktop section reports
 * far more.
 */
export class WidthController implements ReactiveController {
  public width = 0;

  private _host: ReactiveControllerHost & HTMLElement;
  private _ro?: ResizeObserver;

  constructor(host: ReactiveControllerHost & HTMLElement) {
    this._host = host;
    host.addController(this);
  }

  public hostConnected(): void {
    this._ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      // Ignore sub-pixel jitter to avoid update loops.
      if (Math.abs(w - this.width) < 0.5) return;
      this.width = w;
      this._host.requestUpdate();
    });
    this._ro.observe(this._host);
    this.width = this._host.getBoundingClientRect().width;
  }

  public hostDisconnected(): void {
    this._ro?.disconnect();
    this._ro = undefined;
  }

  /** True while the card is narrower than `breakpoint` (0 = unknown yet). */
  public isNarrow(breakpoint: number): boolean {
    return this.width > 0 && this.width < breakpoint;
  }
}
