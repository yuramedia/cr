const API_BASE = "https://beta-api.crunchyroll.com";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function getAccessToken() {
  const body = new URLSearchParams();
  body.append("grant_type", "client_id");
  body.append("client_id", "cr_web");
  body.append("device_id", crypto.randomUUID());

  const response = await fetch(`${API_BASE}/auth/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT
    },
    body: body
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token;
}

async function run() {
  const token = await getAccessToken();
  if (!token) {
    console.log("Failed to get token");
    return;
  }

  const contentId = "GE00378240JAJP"; // Use direct Japanese audio / English subtitle content ID
  const url = `${API_BASE}/playback/v2/${contentId}/web/chrome/play`;
  
  const res = await fetch(url, {
    headers: { 
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT
    }
  });
  console.log("STATUS:", res.status, res.statusText);
  if (res.ok) {
    const data = await res.json();
    console.log("PLAY DATA SUBTITLES:", JSON.stringify(data.subtitles, null, 2));
  } else {
    const text = await res.text();
    console.log("ERROR TEXT:", text);
  }
}

run();
