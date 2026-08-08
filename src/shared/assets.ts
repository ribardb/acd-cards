/**
 * Built-in images shipped with the collection (inline data URIs).
 * Usage in a card config: `image: pendant` — any URL still works as before.
 * Shared style: whites #ffffff→#deddd5 (radial gradient), dark olive #2c2d29.
 */
const GRADIENT = `<defs><radialGradient id='g' cx='40%' cy='30%' r='75%'><stop offset='0%' stop-color='#ffffff'/><stop offset='55%' stop-color='#f8f7f3'/><stop offset='100%' stop-color='#deddd5'/></radialGradient></defs>`;

const SVGS: Record<string, string> = {
  /* Suspension : câble depuis le haut, douille, globe. */
  pendant: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 244'>${GRADIENT}<line x1='100' y1='0' x2='100' y2='76' stroke='#2c2d29' stroke-width='4' stroke-linecap='round'/><rect x='87' y='72' width='26' height='20' rx='7' fill='#2c2d29'/><circle cx='100' cy='162' r='72' fill='url(#g)'/><ellipse cx='76' cy='132' rx='22' ry='13' fill='#ffffff' opacity='0.9' transform='rotate(-18 76 132)'/></svg>`,
  /* Lampadaire : dôme, mât, socle. */
  "floor-lamp": `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 244'>${GRADIENT}<path d='M54 80 A46 46 0 0 1 146 80 Z' fill='url(#g)'/><ellipse cx='82' cy='54' rx='16' ry='9' fill='#ffffff' opacity='0.9' transform='rotate(-22 82 54)'/><line x1='100' y1='80' x2='100' y2='228' stroke='#2c2d29' stroke-width='5' stroke-linecap='round'/><ellipse cx='100' cy='230' rx='36' ry='7' fill='#2c2d29'/></svg>`,
  /* Lampe de bureau : socle, bras incliné, douille, globe. */
  "desk-lamp": `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 244'>${GRADIENT}<rect x='40' y='222' width='78' height='14' rx='7' fill='#2c2d29'/><line x1='72' y1='224' x2='114' y2='118' stroke='#2c2d29' stroke-width='5' stroke-linecap='round'/><rect x='104' y='92' width='26' height='20' rx='7' fill='#2c2d29' transform='rotate(-24 117 102)'/><circle cx='132' cy='140' r='42' fill='url(#g)'/><ellipse cx='118' cy='122' rx='14' ry='9' fill='#ffffff' opacity='0.9' transform='rotate(-18 118 122)'/></svg>`,
  /* Spot plafond : platine, tige, cylindre orienté, face éclairante. */
  spot: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 244'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='#3a4136'/><stop offset='100%' stop-color='#2c2d29'/></linearGradient></defs><rect x='58' y='0' width='84' height='12' rx='6' fill='#2c2d29'/><line x1='100' y1='12' x2='100' y2='46' stroke='#2c2d29' stroke-width='5' stroke-linecap='round'/><g transform='rotate(20 100 100)'><rect x='72' y='48' width='56' height='84' rx='18' fill='url(#g)'/><ellipse cx='100' cy='132' rx='26' ry='10' fill='#f6efdc'/></g></svg>`,
  /* Ampoule nue : câble, culot, verre en poire. */
  bulb: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 244'>${GRADIENT}<line x1='100' y1='0' x2='100' y2='54' stroke='#2c2d29' stroke-width='4' stroke-linecap='round'/><rect x='86' y='52' width='28' height='30' rx='7' fill='#2c2d29'/><path d='M88 82 C88 106 64 114 64 150 A36 36 0 0 0 136 150 C136 114 112 106 112 82 Z' fill='url(#g)'/><ellipse cx='84' cy='128' rx='12' ry='8' fill='#ffffff' opacity='0.9' transform='rotate(-20 84 128)'/></svg>`,
  /* Robot aspirateur vu de 3/4 : corps rond, bandeau capteur, brosse. */
  robot: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 180'><defs><radialGradient id='rb' cx='38%' cy='26%' r='78%'><stop offset='0%' stop-color='#ffffff'/><stop offset='58%' stop-color='#f6f5f1'/><stop offset='100%' stop-color='#dcdbd3'/></radialGradient><linearGradient id='rs' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='#e6e5df'/><stop offset='100%' stop-color='#c9c8c0'/></linearGradient></defs><ellipse cx='110' cy='158' rx='78' ry='12' fill='#2c2d29' opacity='0.07'/><path d='M28 96 A82 82 0 0 1 192 96 L192 112 A82 82 0 0 1 28 112 Z' fill='url(#rs)'/><ellipse cx='110' cy='96' rx='82' ry='46' fill='url(#rb)'/><ellipse cx='110' cy='96' rx='60' ry='32' fill='none' stroke='#d3d2ca' stroke-width='2'/><circle cx='110' cy='88' r='17' fill='#2c2d29'/><circle cx='110' cy='88' r='7' fill='#4a5142'/><circle cx='104' cy='83' r='2.6' fill='#ffffff' opacity='0.8'/><path d='M46 104 A70 40 0 0 0 174 104' fill='none' stroke='#d3d2ca' stroke-width='2'/><g transform='translate(46 118)'><circle r='4' fill='#2c2d29' opacity='0.5'/><g stroke='#2c2d29' stroke-width='2.4' stroke-linecap='round' opacity='0.5'><line x1='0' y1='0' x2='-16' y2='-7'/><line x1='0' y1='0' x2='-17' y2='3'/><line x1='0' y1='0' x2='-12' y2='12'/></g></g><ellipse cx='142' cy='72' rx='24' ry='11' fill='#ffffff' opacity='0.55' transform='rotate(-14 142 72)'/></svg>`,
  /* Base de charge seule (pour l'état « à la base »). */
  dock: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 180'>${GRADIENT}<ellipse cx='110' cy='158' rx='60' ry='10' fill='#2c2d29' opacity='0.07'/><path d='M62 148 L158 148 L150 120 L70 120 Z' fill='url(#g)'/><rect x='84' y='52' width='52' height='72' rx='16' fill='url(#g)' stroke='#d3d2ca' stroke-width='2'/><rect x='98' y='70' width='24' height='6' rx='3' fill='#2c2d29' opacity='0.5'/><rect x='98' y='84' width='24' height='6' rx='3' fill='#2c2d29' opacity='0.5'/><circle cx='110' cy='108' r='6' fill='#4c9a5f'/></svg>`,
};

export const BUILTIN_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(SVGS).map(([key, svg]) => [
    key,
    `data:image/svg+xml,${encodeURIComponent(svg)}`,
  ])
);

/** Resolves a config image value: built-in key or passthrough URL. */
export function resolveImage(image?: string): string | undefined {
  if (!image) return undefined;
  return BUILTIN_IMAGES[image] ?? image;
}
