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

async function run() {
  const token = await getAccessToken();
  if (!token) return;

  const seasonId = "GRNQCJ9MJ"; // from previous output
  const url = getProxyUrl(`${API_BASE}/content/v2/cms/seasons/${seasonId}/episodes`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT }
  });
  if (res.ok) {
    const data = await res.json();
    const ep = data.data?.[0];
    if (ep) {
      console.log("EPISODE TOP KEYS:", Object.keys(ep));
      console.log("EPISODE METADATA:", JSON.stringify(ep.episode_metadata, null, 2));
      console.log("RELEASE DATE FIELDS:", {
        premium_available_date: ep.episode_metadata?.premium_available_date,
        sequence_number_tnt: ep.episode_metadata?.sequence_number_tnt,
        availability_starts: ep.episode_metadata?.availability_starts
      });
    }
  }
}

run();
