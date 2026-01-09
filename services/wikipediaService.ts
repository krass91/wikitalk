
import { Language } from '../types';

export interface WikiResult {
  title: string;
  extract: string;
  url: string;
  thumbnail?: string;
  score?: number;
}

/**
 * Strips common question starters to focus on the core subject of the search.
 */
const cleanQuery = (query: string, lang: Language): string => {
  const fillers: Record<Language, string[]> = {
    en: ['who is', 'who was', 'what is', 'what was', 'tell me about', 'where is', 'how about', 'the', 'a', 'an'],
    bg: ['кой е', 'коя е', 'какво е', 'кои са', 'кажи ми за', 'къде е', 'кой беше', 'кои бяха'],
    ru: ['кто такой', 'кто такая', 'что такое', 'расскажи о', 'где находится', 'кто был', 'что это']
  };

  let cleaned = query.toLowerCase().replace(/[?？!！]/g, '').trim();
  
  // Try to remove fillers at the start
  for (const f of fillers[lang]) {
    if (cleaned.startsWith(f + ' ')) {
      cleaned = cleaned.substring(f.length + 1).trim();
      break;
    }
  }

  return cleaned || query;
};

/**
 * Calculates a relevance score for a result title based on the user's query.
 */
const calculateRelevance = (title: string, query: string, cleanedQuery: string): number => {
  const t = title.toLowerCase();
  const q = query.toLowerCase();
  const cq = cleanedQuery.toLowerCase();
  
  let score = 0;

  // Exact matches are gold
  if (t === q || t === cq) score += 100;
  // Starts with match is silver
  else if (t.startsWith(cq)) score += 80;
  // Contains cleaned query is bronze
  else if (t.includes(cq)) score += 50;

  // Word overlap scoring
  const qWords = cq.split(/\s+/).filter(w => w.length > 2);
  if (qWords.length > 0) {
    let matches = 0;
    qWords.forEach(word => {
      if (t.includes(word)) matches++;
    });
    score += (matches / qWords.length) * 40;
  }

  return score;
};

export const searchWikipedia = async (query: string, lang: Language): Promise<WikiResult[]> => {
  const endpoint = `https://${lang}.wikipedia.org/w/api.php`;
  const cleaned = cleanQuery(query, lang);
  
  // We'll search for more items initially to rank them better
  const fetchResults = async (searchTerm: string) => {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: searchTerm,
      gsrlimit: '10', // Get more candidates for ranking
      prop: 'extracts|info|pageimages',
      exintro: '1',
      explaintext: '1',
      exsentences: '5',
      inprop: 'url',
      piprop: 'thumbnail',
      pithumbsize: '400',
      format: 'json',
      origin: '*',
      redirects: '1'
    });

    try {
      const response = await fetch(`${endpoint}?${params.toString()}`);
      const data = await response.json();
      if (!data.query?.pages) return [];
      
      return Object.values(data.query.pages).map((p: any) => ({
        title: p.title,
        extract: p.extract || '',
        url: p.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
        thumbnail: p.thumbnail?.source,
        score: calculateRelevance(p.title, query, cleaned)
      }));
    } catch (e) {
      console.error("Fetch error for term:", searchTerm, e);
      return [];
    }
  };

  try {
    // Try both cleaned and raw search in parallel for best coverage
    const [cleanedResults, rawResults] = await Promise.all([
      fetchResults(cleaned),
      cleaned !== query ? fetchResults(query) : Promise.resolve([])
    ]);

    // Merge and deduplicate by title
    const allResultsMap = new Map<string, WikiResult>();
    [...cleanedResults, ...rawResults].forEach(res => {
      const existing = allResultsMap.get(res.title);
      if (!existing || (res.score || 0) > (existing.score || 0)) {
        allResultsMap.set(res.title, res);
      }
    });

    // Sort by relevance score
    const sortedResults = Array.from(allResultsMap.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    // Fallback: If no results from generator search, try Opensearch
    if (sortedResults.length === 0) {
      const openParams = new URLSearchParams({
        action: 'opensearch',
        search: cleaned,
        limit: '5',
        namespace: '0',
        format: 'json',
        origin: '*'
      });
      const openResponse = await fetch(`${endpoint}?${openParams.toString()}`);
      const openData = await openResponse.json();
      
      if (openData[1] && openData[1].length > 0) {
        // Opensearch found titles, now get details
        const titles = openData[1];
        const detailParams = new URLSearchParams({
          action: 'query',
          prop: 'extracts|info|pageimages',
          titles: titles.join('|'),
          exintro: '1',
          explaintext: '1',
          inprop: 'url',
          piprop: 'thumbnail',
          pithumbsize: '400',
          format: 'json',
          origin: '*'
        });
        const detailResponse = await fetch(`${endpoint}?${detailParams.toString()}`);
        const detailData = await detailResponse.json();
        
        if (detailData.query?.pages) {
          return Object.values(detailData.query.pages)
            .filter((p: any) => !p.missing)
            .map((p: any) => ({
              title: p.title,
              extract: p.extract || '',
              url: p.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
              thumbnail: p.thumbnail?.source,
              score: calculateRelevance(p.title, query, cleaned)
            }))
            .sort((a, b) => (b.score || 0) - (a.score || 0));
        }
      }
    }

    return sortedResults.slice(0, 5); // Return top 5 most relevant
  } catch (error) {
    console.error('Wikipedia Search Engine Error:', error);
    return [];
  }
};
