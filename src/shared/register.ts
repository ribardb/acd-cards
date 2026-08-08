export function safeDefine(tag: string, cls: CustomElementConstructor): void {
  if (!customElements.get(tag)) {
    customElements.define(tag, cls);
  }
}

export function registerCard(
  info: {
    type: string;
    name: string;
    description: string;
  },
  preview = true
): void {
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === info.type)) {
    window.customCards.push({ ...info, preview });
  }
}

export function registerBadge(info: {
  type: string;
  name: string;
  description: string;
}): void {
  window.customBadges = window.customBadges || [];
  if (!window.customBadges.some((b) => b.type === info.type)) {
    window.customBadges.push({ ...info, preview: true });
  }
}
