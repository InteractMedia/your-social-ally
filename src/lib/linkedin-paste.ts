/**
 * Parser voor prospects die je vanuit LinkedIn kopieert.
 * Ondersteunt regels als:
 *   Jan Jansen | Facility Manager | Acme BV | https://www.linkedin.com/in/janjansen
 *   Jan Jansen, Acme BV, https://linkedin.com/in/janjansen
 *   https://www.linkedin.com/in/janjansen
 */

export type ParsedProspect = {
  full_name: string;
  job_title: string | null;
  company_name: string | null;
  linkedin_url: string | null;
};

const URL_RE = /https?:\/\/[^\s,|]+/i;

function slugToName(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!match) return "Onbekende prospect";
  return decodeURIComponent(match[1])
    .replace(/-[a-z0-9]{6,}$/i, "")
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function parseProspectLines(input: string): ParsedProspect[] {
  const out: ParsedProspect[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const urlMatch = line.match(URL_RE);
    const url = urlMatch ? urlMatch[0].replace(/[.,;]$/, "") : null;
    const rest = (url ? line.replace(url, "") : line)
      .split(/[|;\t]|,(?![^()]*\))/)
      .map((p) => p.trim())
      .filter(Boolean);

    const name = rest[0] || (url ? slugToName(url) : "");
    if (!name) continue;

    out.push({
      full_name: name.slice(0, 120),
      job_title: rest[1] ? rest[1].slice(0, 160) : null,
      company_name: rest[2] ? rest[2].slice(0, 160) : null,
      linkedin_url: url,
    });
  }
  return out;
}
