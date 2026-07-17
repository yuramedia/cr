import { getAccessToken } from "../src/scripts/api"

const API_BASE = "https://beta-api.crunchyroll.com"
const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

function getProxyUrl(url) {
    return `https://proxy.cors.sh/${url}`
}

async function run() {
    const token = await getAccessToken()
    if (!token) return

    const contentId = "GE00378240JAJP"
    const targetUrl = `${API_BASE}/content/v2/cms/objects/${contentId}?locale=en-US`
    const url = getProxyUrl(targetUrl)

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": USER_AGENT,
            "x-cors-grants": '{"x-cors-button": "allowed"}'
        }
    })
    if (res.ok) {
        const data = await res.json()
        const ep = data.data?.[0]
        console.log("EPISODE METADATA KEYS:", Object.keys(ep?.episode_metadata || {}))
        console.log("EPISODE METADATA DETAIL:", JSON.stringify(ep?.episode_metadata, null, 2))
    }
}

run()
