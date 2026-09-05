/**
 * Pure helpers die LinkedIn-zoek-URL's bouwen uit een doelgroepprofiel.
 * Geen API-calls: LinkedIn heeft geen zoek- of uitnodig-API, dus we sturen
 * de gebruiker met kant-en-klare filters naar de eigen zoekpagina.
 */

export type SearchUrlInput = {
  jobTitles: string[];
  keywords: string[];
  exclusions?: string[];
  industry?: string | null;
  region?: string | null;
};

function quote(term: string) {
  const t = term.trim();
  if (!t) return "";
  return t.includes(" ") ? `"${t}"` : t;
}

function orGroup(terms: string[]) {
  const parts = terms.map(quote).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `(${parts.join(" OR ")})`;
}

/** Boolean-zoekstring zoals LinkedIn die in het zoekveld begrijpt. */
export function buildBooleanQuery(input: SearchUrlInput): string {
  const groups: string[] = [];
  const titles = orGroup(input.jobTitles.slice(0, 8));
  if (titles) groups.push(titles);
  const keywords = orGroup(input.keywords.slice(0, 6));
  if (keywords) groups.push(keywords);
  if (input.industry) groups.push(quote(input.industry));
  let query = groups.join(" AND ");
  for (const ex of (input.exclusions ?? []).slice(0, 5)) {
    const e = quote(ex);
    if (e) query += ` NOT ${e}`;
  }
  return query.trim();
}

export type BuiltSearchUrl = { label: string; url: string; kind: "people" | "companies" | "sales_navigator" };

function peopleUrl(keywords: string) {
  const p = new URLSearchParams({ keywords, origin: "GLOBAL_SEARCH_HEADER" });
  return `https://www.linkedin.com/search/results/people/?${p.toString()}`;
}

/**
 * LinkedIn's gewone zoekfunctie ondersteunt AND/NOT niet meer en behandelt een
 * lange booleanstring als één letterlijke zoekterm — dat levert nul resultaten.
 * Daarom bouwen we hier korte, brede zoekopdrachten (één per functietitel,
 * eventueel met regio) en houden we de volledige booleanstring alleen voor
 * Sales Navigator, dat boolean wél begrijpt.
 */
export function buildSearchUrls(input: SearchUrlInput): BuiltSearchUrl[] {
  const region = input.region?.trim() ? input.region.trim() : "";
  const urls: BuiltSearchUrl[] = [];

  for (const title of input.jobTitles.slice(0, 6)) {
    const t = title.trim();
    if (!t) continue;
    const q = region ? `${t} ${region}` : t;
    urls.push({
      label: region ? `${t} · ${region}` : t,
      url: peopleUrl(q),
      kind: "people",
    });
  }

  for (const kw of input.keywords.slice(0, 4)) {
    const k = kw.trim();
    if (!k) continue;
    const q = region ? `${k} ${region}` : k;
    urls.push({
      label: `Bedrijven: ${k}`,
      url: `https://www.linkedin.com/search/results/companies/?${new URLSearchParams({
        keywords: q,
        origin: "GLOBAL_SEARCH_HEADER",
      }).toString()}`,
      kind: "companies",
    });
  }

  if (input.industry?.trim()) {
    urls.push({
      label: `Bedrijven: ${input.industry.trim()}`,
      url: `https://www.linkedin.com/search/results/companies/?${new URLSearchParams({
        keywords: region ? `${input.industry.trim()} ${region}` : input.industry.trim(),
        origin: "GLOBAL_SEARCH_HEADER",
      }).toString()}`,
      kind: "companies",
    });
  }

  const boolean = buildBooleanQuery(input);
  if (boolean) {
    urls.push({
      label: "Sales Navigator (boolean)",
      url: `https://www.linkedin.com/sales/search/people?${new URLSearchParams({ keywords: boolean }).toString()}`,
      kind: "sales_navigator",
    });
  }

  if (urls.length === 0) {
    urls.push({ label: "Mensen zoeken op LinkedIn", url: peopleUrl(region), kind: "people" });
  }
  return urls;
}

