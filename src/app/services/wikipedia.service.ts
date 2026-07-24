export interface WikipediaSearchResult {
  title: string;
  description: string;
  url: string;
}

export class WikipediaService {
  private async fetch(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Wikipedia API error: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  }

  async search(
    query: string,
    limit: number = 5
  ): Promise<WikipediaSearchResult[]> {
    const data = await this.fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${limit}&format=json`
    );
    const [, titles, descriptions, urls] = data as [
      string,
      string[],
      string[],
      string[]
    ];
    return titles.map((title, i) => ({
      title,
      description: descriptions[i] || "",
      url:
        urls[i] ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
    }));
  }

  async fetchSummary(
    title: string
  ): Promise<{ title: string; extract: string; pageId: number; url: string }> {
    const data = await this.fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    return {
      title: data.title,
      extract: data.extract,
      pageId: data.pageid,
      url:
        data.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
    };
  }

  async fetchWikitext(title: string): Promise<string> {
    const data = await this.fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&titles=${encodeURIComponent(title)}&format=json`
    );
    const pages = data.query?.pages;
    if (!pages) throw new Error(`No pages found for title: ${title}`);
    const pageId = Object.keys(pages)[0];
    if (pageId === "-1") throw new Error(`Article not found: ${title}`);
    const revisions = pages[pageId]?.revisions;
    if (!revisions || revisions.length === 0)
      throw new Error(`No content found for: ${title}`);
    return revisions[0]["*"] || "";
  }
}
