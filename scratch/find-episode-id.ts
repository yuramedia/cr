const API_BASE = "https://beta-api.crunchyroll.com"
const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

function getProxyUrl(url) {
    return `https://proxy.cors.sh/${url}`
}

async function getAccessToken() {
    const body = new URLSearchParams()
    body.append("grant_type", "client_id")
    body.append("client_id", "cr_web")
    body.append("device_id", crypto.randomUUID())

    const response = await fetch(getProxyUrl(`${API_BASE}/auth/v1/token`), {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
            "x-cors-grants": '{"x-cors-button": "allowed"}'
        },
        body: body
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.access_token
}

async function run() {
    const token = await getAccessToken()
    if (!token) return

    const url = getProxyUrl(`${API_BASE}/content/v2/discover/browse?n=50&sort_by=newly_added`)
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT }
    })
    if (res.ok) {
        const data = await res.json()
        const eps = data.data || []
        for (const ep of eps) {
            if (ep.title && ep.title.toLowerCase().includes("christmas")) {
                console.log("FOUND EPISODE:", {
                    id: ep.id,
                    title: ep.title,
                    series_title: ep.episode_metadata?.series_title,
                    series_id: ep.episode_metadata?.series_id,
                    season_id: ep.episode_metadata?.season_id
                })
            }
            if (ep.episode_metadata?.series_title && ep.episode_metadata.series_title.toLowerCase().includes("polar")) {
                console.log("FOUND POLAR EPISODE:", {
                    id: ep.id,
                    title: ep.title,
                    series_title: ep.episode_metadata?.series_title,
                    series_id: ep.episode_metadata?.series_id,
                    season_id: ep.episode_metadata?.season_id
                })
            }
        }
    }
}

run()
