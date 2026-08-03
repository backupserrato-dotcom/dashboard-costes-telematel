const TARGET_SECTIONS = ['1', '1.5', '2.5', '4', '6', '10', '16', '25', '35'];

export function parseCableSectionAndColor(desc = '') {
  if (!desc) return { section: 'OTRA', color: 'OTRO', family: 'GENERAL' };
  const d = desc.toString().toLowerCase();

  let family = 'H07Z1-K';
  if (d.includes('es05z1-k')) family = 'ES05Z1-K';
  else if (d.includes('h07z-r')) family = 'H07Z-R';
  else if (d.includes('h07v-k')) family = 'H07V-K';

  let section = 'OTRA';
  const match = d.match(/(?:1x|\b)(1[.,]5|2[.,]5|1|4|6|10|16|25|32|35)(?:\s*cpr|\s*mm2|\s*mm|\s*azul|\s*marr|\s*negr|\s*gris|\s*amar|\s*rojo|\s*blan|\s*viol|\s*naran|\s*verde|\s*\(bob|\s*\(rol|\b)/);
  if (match) {
    let parsed = match[1].replace(',', '.');
    if (parsed === '32') parsed = '35';
    if (TARGET_SECTIONS.includes(parsed)) section = parsed;
  }

  let color = 'OTRO / SIN COLOR';
  if (/\b(azul)\b/.test(d)) color = 'AZUL';
  else if (/\b(marron|marrón|marrn|marr.n)\b/.test(d)) color = 'MARRÓN';
  else if (/\b(negro)\b/.test(d)) color = 'NEGRO';
  else if (/\b(gris)\b/.test(d)) color = 'GRIS';
  else if (/\b(amarillo[/-]verde|am[/-]vd|verde[/-]amarillo)\b/.test(d)) color = 'AMARILLO/VERDE';
  else if (/\b(amarillo)\b/.test(d)) color = 'AMARILLO';
  else if (/\b(blanco)\b/.test(d)) color = 'BLANCO';
  else if (/\b(rojo)\b/.test(d)) color = 'ROJO';
  else if (/\b(violeta|violet)\b/.test(d)) color = 'VIOLETA';
  else if (/\b(naranja)\b/.test(d)) color = 'NARANJA';
  else if (/\b(verde)\b/.test(d)) color = 'VERDE';

  return { section, color, family };
}
