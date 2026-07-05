import { getAccessToken } from "../src/scripts/api";

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
  if (!token) {
    console.log("Failed to get token");
    return;
  }
  console.log("Token acquired:", token.substring(0, 10) + "...");

  const contentId = "GE00378240JAJP";
  const targetUrl = `https://cr-play-service.prd.crunchyrollsvc.com/v1/${contentId}/tv/android_tv/play`;
  const url = getProxyUrl(targetUrl);
  
  const res = await fetch(url, {
    headers: getHeaders(token)
  });
  console.log("STATUS:", res.status, res.statusText);
  if (res.ok) {
    const data = await res.json();
    console.log("SUCCESS! SUBTITLES KEYS:", Object.keys(data.subtitles || {}));
    console.log("Subtitles detail:", JSON.stringify(data.subtitles, null, 2));
  } else {
    const text = await res.text();
    console.log("ERROR TEXT:", text);
  }
}

run();
