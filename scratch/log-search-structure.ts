const BASIC_AUTH = "cmpzMGx0eDBkYndrbGl3eGR6ZGY6NFY3cmYyMS1VRlhlWi01WEFkMFhfUVB3cjFndV9pMXM="
const USER_AGENT = "Crunchyroll/ANDROIDTV/3.65.0_22347 (Android 12; en-US; SHIELD Android TV Build/SR1A.211012.001)"

async function run() {
    try {
        const body = new URLSearchParams()
        body.append("grant_type", "client_id")
        body.append("device_id", "test-device-frieren")

        const tokenRes = await fetch("https://proxy.cors.sh/https://beta-api.crunchyroll.com/auth/v1/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${BASIC_AUTH}`,
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                "User-Agent": USER_AGENT
            },
            body: body.toString()
        })

        const tokenData = await tokenRes.json()
        const token = tokenData.access_token
        if (!token) {
            console.log("No token")
            return
        }

        const searchRes = await fetch(
            "https://proxy.cors.sh/https://beta-api.crunchyroll.com/content/v2/discover/search?q=Frieren&n=2",
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "User-Agent": USER_AGENT
                }
            }
        )

        const searchData = await searchRes.json()
        console.log("Raw search response keys:", Object.keys(searchData))
        console.log("Raw search data:", JSON.stringify(searchData, null, 2))
    } catch (e: any) {
        console.log("Error:", e.message)
    }
}

run()
