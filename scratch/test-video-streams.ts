import { getAccessToken } from "../src/scripts/api";

const API_BASE = "https://beta-api.crunchyroll.com";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function getProxyUrl(url) {
  return `https://proxy.cors.sh/${url}`;
}

function getHeaders(accessToken) {
  const headers = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  headers["User-Agent"] = USER_AGENT;
  headers["x-cors-grants"] = '{"x-cors-button": "allowed"}';
  return headers;
}

async function run() {
  const token = await getAccessToken();
  if (!token) return;

  const contentId = "GE00378240JAJP";
  const targetUrl = `${API_BASE}/content/v2/cms/videos/${contentId}/streams`;
  const url = getProxyUrl(targetUrl);
  
  const res = await fetch(url, {
    headers: getHeaders(token)
  });
  console.log("STATUS:", res.status, res.statusText);
  if (res.ok) {
    const data = await res.json();
    console.log("SUCCESS! DATA KEYS:", Object.keys(data.data?.[0] || {}));
    console.log("SUBTITLES KEYS:", Object.keys(data.data?.[0]?.subtitles || {}));
    console.log("Subtitles detail:", JSON.stringify(data.data?.[0]?.subtitles, null, 2));
  } else {
    const text = await res.text();
    console.log("ERROR TEXT:", text);
  }
}

run();
