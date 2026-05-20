import L from "leaflet";

function pinIcon(svg: string, width: number, height: number) {
  return L.divIcon({
    className: "map-pin-icon",
    html: `<div style="width:${width}px;height:${height}px;line-height:0">${svg}</div>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 4],
  });
}

const shadow = `
  <filter id="pinShadow" x="-30%" y="-20%" width="160%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.28"/>
  </filter>`;

/** Blue map pin — card shop / venue hub */
const shopSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44" aria-hidden="true">
  <defs>
    <linearGradient id="shopPinGrad" x1="18" y1="1" x2="18" y2="42" gradientUnits="userSpaceOnUse">
      <stop stop-color="#60a5fa"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
    ${shadow}
  </defs>
  <g filter="url(#pinShadow)">
    <path d="M18 2C11.4 2 6.5 7.4 6.5 13.8c0 7.2 11.5 24.2 11.5 24.2s11.5-17 11.5-24.2C29.5 7.4 24.6 2 18 2z" fill="url(#shopPinGrad)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="18" cy="14" r="7.5" fill="#fff"/>
    <rect x="12.5" y="10.5" width="5.5" height="7.5" rx="1.2" fill="#2563eb" transform="rotate(-10 15.25 14.25)"/>
    <rect x="15" y="10" width="5.5" height="7.5" rx="1.2" fill="#93c5fd" transform="rotate(8 17.75 13.75)"/>
    <circle cx="18" cy="14" r="7.5" fill="none" stroke="#e0e7ff" stroke-width="0.75" opacity="0.6"/>
  </g>
</svg>`;

/** Green map pin — other players' custom spots */
const playerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" aria-hidden="true">
  <defs>
    <linearGradient id="playerPinGrad" x1="16" y1="1" x2="16" y2="38" gradientUnits="userSpaceOnUse">
      <stop stop-color="#4ade80"/>
      <stop offset="1" stop-color="#15803d"/>
    </linearGradient>
    ${shadow.replace('pinShadow', 'pinShadowP')}
  </defs>
  <g filter="url(#pinShadowP)">
    <path d="M16 2C10.2 2 6 6.6 6 12.2c0 6.2 10 23.8 10 23.8s10-17.6 10-23.8C26 6.6 21.8 2 16 2z" fill="url(#playerPinGrad)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="16" cy="12.5" r="6.5" fill="#fff"/>
    <circle cx="16" cy="10.5" r="2.8" fill="#16a34a"/>
    <path d="M11.5 18.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4v1.5H11.5V18.5z" fill="#16a34a"/>
  </g>
</svg>`;

/** Green map pin — own custom spot (ring highlight) */
const ownPlayerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 38 46" aria-hidden="true">
  <defs>
    <linearGradient id="ownPinGrad" x1="19" y1="1" x2="19" y2="44" gradientUnits="userSpaceOnUse">
      <stop stop-color="#4ade80"/>
      <stop offset="1" stop-color="#15803d"/>
    </linearGradient>
    ${shadow.replace('pinShadow', 'pinShadowO')}
  </defs>
  <g filter="url(#pinShadowO)">
    <circle cx="19" cy="14" r="13" fill="#86efac" opacity="0.45"/>
    <circle cx="19" cy="14" r="10.5" fill="none" stroke="#fff" stroke-width="2" opacity="0.9"/>
    <path d="M19 2C12.5 2 7.5 7.2 7.5 13.2c0 6.8 11.5 25.8 11.5 25.8S30.5 20 30.5 13.2C30.5 7.2 25.5 2 19 2z" fill="url(#ownPinGrad)" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="19" cy="13.5" r="7" fill="#fff"/>
    <circle cx="19" cy="11.5" r="3" fill="#16a34a"/>
    <path d="M14 19.5c0-2.6 2.2-4.2 5-4.2s5 1.6 5 4.2v1.5H14V19.5z" fill="#16a34a"/>
  </g>
</svg>`;

/** Legend miniatures (inline, for UI only) */
export const legendShopSvg = `<svg width="14" height="17" viewBox="0 0 36 44" aria-hidden="true"><path d="M18 2C11.4 2 6.5 7.4 6.5 13.8c0 7.2 11.5 24.2 11.5 24.2s11.5-17 11.5-24.2C29.5 7.4 24.6 2 18 2z" fill="#2563eb" stroke="#fff" stroke-width="2"/><circle cx="18" cy="14" r="5" fill="#fff"/><rect x="14" y="11.5" width="4" height="5.5" rx="1" fill="#2563eb"/><rect x="16" y="11" width="4" height="5.5" rx="1" fill="#93c5fd"/></svg>`;

export const legendPlayerSvg = `<svg width="14" height="17" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 2C10.2 2 6 6.6 6 12.2c0 6.2 10 23.8 10 23.8s10-17.6 10-23.8C26 6.6 21.8 2 16 2z" fill="#16a34a" stroke="#fff" stroke-width="2"/><circle cx="16" cy="12.5" r="4.5" fill="#fff"/><circle cx="16" cy="11" r="2" fill="#16a34a"/><path d="M12.5 16.5c0-1.8 1.5-3 3.5-3s3.5 1.2 3.5 3v1H12.5v-1z" fill="#16a34a"/></svg>`;

/** Amber pin — search preview before publishing */
const previewSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38" aria-hidden="true">
  <defs>
    <linearGradient id="previewPinGrad" x1="15" y1="1" x2="15" y2="36" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fcd34d"/>
      <stop offset="1" stop-color="#d97706"/>
    </linearGradient>
    ${shadow}
  </defs>
  <g filter="url(#pinShadow)" opacity="0.92">
    <path d="M15 2C9.5 2 5.5 6.5 5.5 11.5c0 5.5 9.5 20.5 9.5 20.5s9.5-15 9.5-20.5C24.5 6.5 20.5 2 15 2z" fill="url(#previewPinGrad)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="15" cy="11.5" r="5" fill="#fff"/>
    <circle cx="15" cy="11.5" r="2.5" fill="#d97706"/>
  </g>
</svg>`;

export const shopBaseIcon = pinIcon(shopSvg, 36, 44);
export const campfireIcon = pinIcon(playerSvg, 32, 40);
export const ownCampfireIcon = pinIcon(ownPlayerSvg, 38, 46);
export const previewPinIcon = pinIcon(previewSvg, 30, 38);

export function shopIconWithCount(count = 0) {
  if (count <= 0) return shopBaseIcon;

  const label = count > 99 ? "99+" : String(count);

  return L.divIcon({
    className: "map-pin-icon",
    html: `
      <div style="position:relative;width:44px;height:48px;line-height:0">
        <div style="position:absolute;left:4px;top:4px;width:36px;height:44px">${shopSvg}</div>
        <span style="
          position:absolute;
          right:0;
          top:0;
          min-width:18px;
          height:18px;
          padding:0 4px;
          border-radius:9999px;
          border:2px solid #fff;
          background:#ef4444;
          color:#fff;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          font:700 11px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          box-shadow:0 2px 5px rgba(15,23,42,0.28);
          box-sizing:border-box;
        ">${label}</span>
      </div>
    `,
    iconSize: [44, 48],
    iconAnchor: [22, 48],
    popupAnchor: [0, -44],
  });
}
