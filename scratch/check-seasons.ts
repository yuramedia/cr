const spreadsheetId = "1YSXp5jxPE4LMAyaPH5sl9xXbZiSjnD_zRRZbZ26Rk44"
const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv`

async function run() {
    const res = await fetch(url)
    if (!res.ok) return
    const tsv = await res.text()
    const lines = tsv.split("\n")

    const seenSeasons = new Set()

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split("\t").map(p => p.trim())
        const title = parts[0] || ""
        if (/season\s*\d+/i.test(title) || /\bS\d+\b/i.test(title)) {
            seenSeasons.add(title)
        }
    }

    console.log("SEASONS FOUND IN SPREADSHEET:", Array.from(seenSeasons))
}

run()
