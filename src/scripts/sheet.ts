// Google Sheets Subtitle Pipeline & Formats integration
import type { LanguageMap } from "../types"

// Sheet data storage
export const sheetDataMap = new Map<string, string[]>()

// Language columns configuration
const COL_LANGS = [
    { name: "English", code: "ENG", index: 4 },
    { name: "Spanish (LA)", code: "SPA-LA", index: 5 },
    { name: "Spanish (ES)", code: "SPA-ES", index: 6 },
    { name: "Portuguese", code: "POR", index: 7 },
    { name: "French", code: "FRA", index: 8 },
    { name: "German", code: "DEU", index: 9 },
    { name: "Arabic", code: "ARA", index: 10 },
    { name: "Italian", code: "ITA", index: 11 },
    { name: "Russian", code: "RUS", index: 12 },
    { name: "Chinese (zho)", code: "ZHO", index: 13 },
    { name: "Chinese (HK)", code: "ZH-HK", index: 14 },
    { name: "Thai", code: "THA", index: 15 },
    { name: "Malay", code: "MAY", index: 16 },
    { name: "Vietnamese", code: "VIE", index: 17 },
    { name: "Indonesian", code: "IND", index: 18 },
    { name: "Polish", code: "POL", index: 19 }
]

/**
 * Normalize series title for spreadsheet matching
 */
export function normalizeTitleForSheet(title: string): string {
    if (!title) return ""

    let cleanTitle = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents

    let season = 1
    const seasonMatch = cleanTitle.match(/(?:season\s*|s)(\d+)\b/)
    if (seasonMatch) {
        season = parseInt(seasonMatch[1], 10)
        cleanTitle = cleanTitle.replace(/(?:season\s*|s)\d+\b/g, "")
    }

    const base = cleanTitle.replace(/[^a-z0-9]/g, "")
    return `${base}_s${season}`
}

/**
 * Load spreadsheet data from Google Sheets
 */
export async function loadSpreadsheetData(): Promise<void> {
    try {
        const spreadsheetId = "1YSXp5jxPE4LMAyaPH5sl9xXbZiSjnD_zRRZbZ26Rk44"
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv`

        const res = await fetch(url)
        if (!res.ok) return

        const tsv = await res.text()
        const lines = tsv.split("\n")

        sheetDataMap.clear()

        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split("\t").map(p => p.trim())
            if (parts.length < 2) continue

            const seriesName = parts[0]
            const epNum = parts[1]
            if (!seriesName || !epNum) continue

            const key = `${normalizeTitleForSheet(seriesName)}_${epNum}`
            sheetDataMap.set(key, parts)
        }

        console.log(`Loaded ${sheetDataMap.size} subtitle pipeline mappings.`)

        // Update visible cards
        updateVisibleCardsPipeline()
    } catch (e) {
        console.error("Error loading spreadsheet:", e)
    }
}

/**
 * Populate pipeline data for a card element
 */
export function populatePipelineForCard(card: HTMLElement, seriesTitle: string, episodeNumber: string | number): void {
    if (!card) return

    const container = card.querySelector(".sub-pipeline-container") as HTMLElement
    if (!container) return

    const key = `${normalizeTitleForSheet(seriesTitle)}_${episodeNumber}`
    const row = sheetDataMap.get(key)

    if (!row) {
        container.classList.add("hidden")
        return
    }

    container.classList.remove("hidden")

    const grid = container.querySelector(".pipeline-grid") as HTMLElement
    const notes = container.querySelector(".pipeline-notes") as HTMLElement
    const toggleBtn = container.querySelector(".toggle-pipeline-btn") as HTMLElement
    const details = container.querySelector(".pipeline-details") as HTMLElement
    const arrow = container.querySelector(".pipeline-arrow") as HTMLElement

    // Setup toggle button
    if (!toggleBtn?.getAttribute("data-bound")) {
        toggleBtn?.setAttribute("data-bound", "true")
        toggleBtn?.addEventListener("click", e => {
            e.stopPropagation()
            const isHidden = details?.classList.contains("hidden")
            if (isHidden) {
                details?.classList.remove("hidden")
                arrow?.classList.add("rotate-180")
            } else {
                details?.classList.add("hidden")
                arrow?.classList.remove("rotate-180")
            }
        })
    }

    // Build language grid
    if (grid) {
        let html = ""
        COL_LANGS.forEach(lang => {
            const val = row[lang.index]
            if (val && val !== "- / -" && val !== "-/-" && val !== "-") {
                html += `<div class="flex justify-between items-center text-[0.625rem] bg-white/3 border border-white/5 rounded px-2 py-1">
          <span class="text-text-muted font-bold">${lang.code}</span>
          <span class="text-accent-orange font-semibold">${val}</span>
        </div>`
            }
        })
        grid.innerHTML = html
    }

    // Notes
    if (notes) {
        const notesVal = row[20]
        if (notesVal?.trim()) {
            notes.innerHTML = `<span class="font-bold text-accent-orange">Notes:</span> ${notesVal}`
            notes.classList.remove("hidden")
        } else {
            notes.classList.add("hidden")
        }
    }
}

/**
 * Update pipeline data for all visible cards
 */
export function updateVisibleCardsPipeline(): void {
    const cards = document.querySelectorAll(".episode-card")
    cards.forEach(card => {
        const seriesTitle = card.getAttribute("data-series-title")
        const epNum = card.getAttribute("data-episode-number")
        if (seriesTitle && epNum) {
            populatePipelineForCard(card as HTMLElement, seriesTitle, epNum)
        }
    })
}

/**
 * Check if series exists in sheet data
 */
export function hasSheetData(seriesTitle: string): boolean {
    const normalized = normalizeTitleForSheet(seriesTitle)
    for (const key of sheetDataMap.keys()) {
        if (key.startsWith(normalized)) return true
    }
    return false
}

/**
 * Get pipeline data for a specific episode
 */
export function getPipelineData(seriesTitle: string, episodeNumber: string | number): string[] | null {
    const key = `${normalizeTitleForSheet(seriesTitle)}_${episodeNumber}`
    return sheetDataMap.get(key) || null
}

/**
 * Build pipeline HTML for detail pages
 */
export function buildPipelineHTML(seriesTitle: string, episodeNumber: string | number, _langMap: LanguageMap): string {
    const row = getPipelineData(seriesTitle, episodeNumber)

    if (!row) {
        return `
      <div class="mt-8 bg-bg-card border border-white/5 rounded-2xl p-6 text-center py-12">
        <p class="text-text-secondary text-sm">No spreadsheet formatting details matching this episode's title and number.</p>
      </div>
    `
    }

    let gridItems = ""
    COL_LANGS.forEach(lang => {
        const val = row[lang.index]
        if (val && val !== "- / -" && val !== "-/-" && val !== "-") {
            gridItems += `
        <div class="flex justify-between items-center bg-[#1c1c24] border border-white/5 rounded-xl px-4 py-3">
          <span class="text-xs text-text-secondary font-bold tracking-wider">${lang.name} (${lang.code})</span>
          <span class="text-sm text-accent-orange font-extrabold">${val}</span>
        </div>
      `
        }
    })

    const notesVal = row[20]
    const notesHtml = `
    <div class="bg-white/2 border border-white/5 rounded-xl p-4 mt-6 text-sm">
      <span class="font-bold text-accent-orange uppercase tracking-wider block mb-1 text-[0.675rem]">Editor Notes</span>
      <p class="leading-relaxed font-sans ${notesVal?.trim() ? "text-text-primary" : "text-text-muted italic"}">
        ${notesVal?.trim() || "No editor notes available for this episode."}
      </p>
    </div>
  `

    return `
    <div class="mt-8 bg-bg-card border border-white/5 rounded-2xl p-6">
      <h3 class="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
        <span class="text-accent-orange">\ud83d\udcca</span> Subtitle Pipeline Formatting Details
      </h3>
      ${gridItems ? `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">${gridItems}</div>` : '<p class="text-text-secondary text-sm">No formatting records available for this episode.</p>'}
      ${notesHtml}
    </div>
  `
}
