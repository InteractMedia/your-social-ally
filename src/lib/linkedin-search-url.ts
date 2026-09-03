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

export function buildSearchUrls(input: SearchUrlInput): BuiltSearchUrl[] {
  const query = buildBooleanQuery(input);
  const peopleParams = new URLSearchParams({ keywords: query, origin: "GLOBAL_SEARCH_HEADER" });
  const companyQuery = buildBooleanQuery({
    jobTitles: [],
    keywords: input.keywords,
    industry: input.industry,
    exclusions: input.exclusions,
  });
  const companyParams = new URLSearchParams({
    keywords: companyQuery || (input.industry ?? ""),
    origin: "GLOBAL_SEARCH_HEADER",
  });
  const navParams = new URLSearchParams({ keywords: query });

  const urls: BuiltSearchUrl[] = [
    {
      label: "Mensen zoeken op LinkedIn",
      url: `https://www.linkedin.com/search/results/people/?${peopleParams.toString()}`,
      kind: "people",
    },
    {
      label: "Bedrijven zoeken op LinkedIn",
      url: `https://www.linkedin.com/search/results/companies/?${companyParams.toString()}`,
      kind: "companies",
    },
    {
      label: "Sales Navigator (uitgebreide filters)",
      url: `https://www.linkedin.com/sales/search/people?${navParams.toString()}`,
      kind: "sales_navigator",
    },
  ];
  if (input.region) {
    const regional = new URLSearchParams({
      keywords: `${query} ${quote(input.region)}`.trim(),
      origin: "GLOBAL_SEARCH_HEADER",
    });
    urls.splice(1, 0, {
      label: `Mensen in ${input.region}`,
      url: `https://www.linkedin.com/search/results/people/?${regional.toString()}`,
      kind: "people",
    });
  }
  return urls;
}
