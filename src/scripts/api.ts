import { API_BASE, USER_AGENT } from "./constants";

export function getProxyUrl(url: string): string {
  if (typeof window === "undefined") return url;
  const useProxy = localStorage.getItem("cr_use_cors_proxy") !== "false";
  return useProxy ? `https://proxy.cors.sh/${url}` : url;
}

function getHeaders(accessToken?: string): Record<string, string> {
  const useProxy = typeof window !== "undefined" && localStorage.getItem("cr_use_cors_proxy") !== "false";
  const headers: Record<string, string> = {};
  
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  
  if (useProxy) {
    headers["User-Agent"] = USER_AGENT;
    headers["x-cors-grants"] = '{"x-cors-button": "allowed"}';
  }
  
  return headers;
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const body = new URLSearchParams();
    body.append("grant_type", "client_id");
    body.append("client_id", "cr_web");
    body.append("device_id", crypto.randomUUID());

    const targetUrl = `${API_BASE}/auth/v1/token`;
    const proxyUrl = getProxyUrl(targetUrl);

    const headers = getHeaders();
    headers["Content-Type"] = "application/x-www-form-urlencoded";

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: headers,
      body: body
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch (e) {
    console.error("Token acquisition failed:", e);
    return null;
  }
}

export async function fetchCrunchyrollEpisodes(accessToken: string, start = 0): Promise<any[] | null> {
  try {
    const params = new URLSearchParams({
      start: String(start),
      n: "60",
      type: "episode",
      sort_by: "newly_added",
      force_locale: crypto.randomUUID()
    });

    const targetUrl = `${API_BASE}/content/v2/discover/browse?${params}`;
    const proxyUrl = getProxyUrl(targetUrl);

    const headers = getHeaders(accessToken);
    const useProxy = typeof window !== "undefined" && localStorage.getItem("cr_use_cors_proxy") !== "false";
    if (useProxy) {
      headers["Cache-Control"] = "no-cache";
    }

    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: headers
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data || [];
  } catch (e) {
    console.error("Failed to fetch episodes:", e);
    return null;
  }
}

export async function fetchSeriesPoster(seriesId: string, accessToken: string): Promise<string | null> {
  try {
    const targetUrl = `${API_BASE}/content/v2/cms/series/${seriesId}`;
    const proxyUrl = getProxyUrl(targetUrl);

    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: getHeaders(accessToken)
    });

    if (!response.ok) return null;
    const data = await response.json();
    const series = data.data?.[0];
    if (!series) return null;

    const images = series.images?.poster_tall?.[0];
    if (!images || images.length === 0) return null;

    let bestImg = images[0];
    for (const img of images) {
      if (img.width >= 240 && img.width <= 480) {
        bestImg = img;
        break;
      }
    }
    return bestImg.source;
  } catch (e) {
    console.error(`Failed to fetch series poster for ${seriesId}:`, e);
    return null;
  }
}

export async function fetchLanguagesConfig(): Promise<{ timedText: any; audio: any } | null> {
  try {
    const timedTextUrl = getProxyUrl("https://static.crunchyroll.com/config/i18n/v3/timed_text_languages.json");
    const audioUrl = getProxyUrl("https://static.crunchyroll.com/config/i18n/v3/audio_languages.json");

    const [timedTextRes, audioRes] = await Promise.all([
      fetch(timedTextUrl).then(res => (res.ok ? res.json() : null)).catch(() => null),
      fetch(audioUrl).then(res => (res.ok ? res.json() : null)).catch(() => null)
    ]);

    if (!timedTextRes || !audioRes) return null;
    return { timedText: timedTextRes, audio: audioRes };
  } catch (e) {
    console.error("Language config fetch failed:", e);
    return null;
  }
}

export async function fetchObject(id: string, accessToken: string): Promise<any | null> {
  try {
    const targetUrl = `${API_BASE}/content/v2/cms/objects/${id}`;
    const proxyUrl = getProxyUrl(targetUrl);
    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: getHeaders(accessToken)
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0] || null;
  } catch (e) {
    console.error(`Failed to fetch object ${id}:`, e);
    return null;
  }
}

export async function fetchSeriesSeasons(seriesId: string, accessToken: string): Promise<any[] | null> {
  try {
    const targetUrl = `${API_BASE}/content/v2/cms/series/${seriesId}/seasons`;
    const proxyUrl = getProxyUrl(targetUrl);
    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: getHeaders(accessToken)
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || [];
  } catch (e) {
    console.error(`Failed to fetch seasons for series ${seriesId}:`, e);
    return null;
  }
}

export async function fetchSeasonEpisodes(seasonId: string, accessToken: string): Promise<any[] | null> {
  try {
    const targetUrl = `${API_BASE}/content/v2/cms/seasons/${seasonId}/episodes`;
    const proxyUrl = getProxyUrl(targetUrl);
    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: getHeaders(accessToken)
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || [];
  } catch (e) {
    console.error(`Failed to fetch episodes for season ${seasonId}:`, e);
    return null;
  }
}

export async function searchSeries(query: string, accessToken: string): Promise<any[] | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      n: "10",
      type: "series"
    });
    const targetUrl = `${API_BASE}/content/v2/discover/search?${params}`;
    const proxyUrl = getProxyUrl(targetUrl);
    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: getHeaders(accessToken)
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.items || [];
  } catch (e) {
    console.error(`Failed to search series for query ${query}:`, e);
    return null;
  }
}
