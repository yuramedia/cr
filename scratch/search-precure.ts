const BASIC_AUTH = "cmpzMGx0eDBkYndrbGl3eGR6ZGY6NFY3cmYyMS1VRlhlWi01WEFkMFhfUVB3cjFndV9pMXM="
const USER_AGENT = "Crunchyroll/ANDROIDTV/3.65.0_22347 (Android 12; en-US; SHIELD Android TV Build/SR1A.211012.001)"

async function search(query) {
    console.log(`\n=== Searching for: "${query}" ===`)
    try {
        const body = new URLSearchParams()
        body.append("grant_type", "client_id")
        body.append("device_id", "test-device-precure-search")

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
        if (!token) return

        const searchRes = await fetch(
            `https://proxy.cors.sh/https://beta-api.crunchyroll.com/content/v2/discover/search?q=${encodeURIComponent(query)}&n=5`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "User-Agent": USER_AGENT
                }
            }
        )

        const searchData = await searchRes.json()
        if (searchData.data) {
            searchData.data.forEach((group: any) => {
                const items = group.items || []
                console.log(`Group type: ${group.type}, count: ${group.count}, items returned: ${items.length}`)
                items.forEach((item: any) => {
                    console.log(`- [${item.id}] ${item.title} (${item.type})`)
                })
            })
        } else {
            console.log("No data object returned:", searchData)
        }
    } catch (e: any) {
        console.log("Error:", e.message)
    }
}

async function run() {
    await search("Precure")
    await search("Pretty Cure")
    await search("Detective Precure")
}

run()
