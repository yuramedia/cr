import { getAccessToken } from "../src/scripts/api";

const API_BASE = "https://beta-api.crunchyroll.com";

async function run() {
  const token = await getAccessToken();
  if (!token) {
    console.log("Failed to get token");
    return;
  }
  console.log("Token acquired:", token.substring(0, 10) + "...");

  const contentId = "GE00378240JAJP";
  const targetUrl = `${API_BASE}/playback/v2/${contentId}/web/chrome/play`;
  const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  
  const res = await fetch(url, {
    headers: { 
      Authorization: `Bearer ${token}`
    }
  });
  console.log("STATUS:", res.status, res.statusText);
  if (res.ok) {
    const data = await res.json();
    console.log("SUCCESS! SUBTITLES KEYS:", Object.keys(data.subtitles || {}));
    if (Array.isArray(data.subtitles)) {
      console.log("First subtitle:", data.subtitles[0]);
    } else {
      console.log("Subtitles detail:", JSON.stringify(data.subtitles, null, 2));
    }
  } else {
    const text = await res.text();
    console.log("ERROR TEXT:", text);
  }
}

run();
