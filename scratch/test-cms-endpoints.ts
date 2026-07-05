const API_BASE = "https://beta-api.crunchyroll.com";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function getProxyUrl(url) {
  return `https://proxy.cors.sh/${url}`;
}

async function getAccessToken() {
  const body = new URLSearchParams();
  body.append("grant_type", "client_id");
  body.append("client_id", "cr_web");
  body.append("device_id", crypto.randomUUID());

  const response = await fetch(getProxyUrl(`${API_BASE}/auth/v1/token`), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      "x-cors-grants": '{"x-cors-button": "allowed"}'
    },
    body: body
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token;
}

async function testFetchObject(id, token) {
  const url = getProxyUrl(`${API_BASE}/content/v2/cms/objects/${id}`);
  console.log(`Fetching object ${id} from: ${url}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT }
  });
  if (!res.ok) {
    console.log(`Failed to fetch object ${id}:`, res.status, res.statusText);
    return null;
  }
  const data = await res.json();
  return data.data?.[0];
}

async function testFetchEpisodesForSeason(seasonId, token) {
  // Season episodes can be fetched via browse with season_id filter or specific endpoint
  const url = getProxyUrl(`${API_BASE}/content/v2/cms/seasons/${seasonId}/episodes`);
  console.log(`Fetching episodes for season ${seasonId} from: ${url}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT }
  });
  if (!res.ok) {
    console.log(`Failed to fetch season episodes:`, res.status, res.statusText);
    return null;
  }
  const data = await res.json();
  return data.data || [];
}

async function run() {
  const token = await getAccessToken();
  if (!token) {
    console.log("No token.");
    return;
  }

  // Let's test with a known series, season, and episode from our logs:
  // e.g. Series ID: GT0037163, Episode ID: G8WUN8N5P or similar (we can query objects first)
  const episodeObj = await testFetchObject("G8WUN8N5P", token); // Let's see if it works
  if (episodeObj) {
    console.log("Episode Object fetched:", episodeObj.title, "Number:", episodeObj.episode_metadata?.episode_number);
  }

  const seriesObj = await testFetchObject("GRMG8ZQZR", token); // Series ID test
  if (seriesObj) {
    console.log("Series Object fetched:", seriesObj.title, "Description:", seriesObj.description.substring(0, 100));
  }
}

run();
