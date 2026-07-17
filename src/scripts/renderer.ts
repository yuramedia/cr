// DOM rendering utilities for episode cards and views
import type { Episode, SeriesGroup, LanguageMap } from "../types"
import { formatReleaseDate, getDateGroupKey } from "./formatters"

// Template cache
let cardTemplate: HTMLTemplateElement | null = null

/**
 * Initialize template reference
 */
export function initTemplates(): void {
    cardTemplate = document.getElementById("episode-card-template") as HTMLTemplateElement
}

/**
 * Create episode card DOM node from template
 */
export function createEpisodeCard(
    ep: Episode,
    langMap: LanguageMap,
    watchedId: string | null,
    onWatchClick?: (episodeId: string) => void
): HTMLElement {
    if (!cardTemplate) {
        initTemplates()
    }

    const clone = cardTemplate!.content.cloneNode(true) as DocumentFragment
    const card = clone.querySelector(".episode-card") as HTMLElement

    // Set data attributes
    card.dataset.episodeId = ep.id
    card.dataset.seriesTitle = ep.seriesTitle
    card.dataset.episodeNumber = String(ep.episodeNumber)

    // Image
    const img = card.querySelector(".card-image") as HTMLImageElement
    if (ep.thumbnail) {
        img.src = ep.thumbnail
        img.classList.remove("img-placeholder")
    }
    img.alt = ep.seriesTitle

    // Wrap image in link
    const imgContainer = img.parentElement
    if (imgContainer) {
        const link = document.createElement("a")
        link.href = `/eps/${ep.id}`
        link.className = "block w-full h-full"
        img.parentNode?.insertBefore(link, img)
        link.appendChild(img)
    }

    // Episode badge
    const badge = card.querySelector(".episode-badge")
    if (badge) {
        badge.textContent = `EPISODE ${ep.episodeNumber}`
    }

    // Series title with link
    const seriesTitleEl = card.querySelector(".series-title")
    if (seriesTitleEl) {
        seriesTitleEl.innerHTML = `<a href="/series/${ep.seriesId}" class="hover:text-accent-orange-hover hover:underline transition-colors">${ep.seriesTitle}</a>`
    }

    // Episode title with link
    const epTitle = card.querySelector(".episode-title")
    if (epTitle) {
        epTitle.innerHTML = `<a href="/eps/${ep.id}" class="hover:text-accent-orange-hover transition-colors">${ep.title}</a>`
        ;(epTitle as HTMLElement).title = ep.title
    }

    // Description
    const desc = card.querySelector(".episode-description")
    if (desc) {
        desc.textContent = ep.description
        ;(desc as HTMLElement).title = ep.description
    }

    // Release date
    const releaseEl = card.querySelector(".val-release")
    if (releaseEl) {
        releaseEl.textContent = formatReleaseDate(ep.releasedAt)
    }

    // Audio badge
    const audioContainer = card.querySelector(".val-audio")
    if (audioContainer) {
        const audioLabel = ep.audioLocale ? langMap[ep.audioLocale] || ep.audioLocale : "-"
        const audioSpan = document.createElement("span")
        audioSpan.className =
            "bg-accent-orange/12 border border-accent-orange/20 text-accent-orange px-1.5 py-0.5 rounded font-bold text-[0.725rem]"
        audioSpan.textContent = audioLabel
        audioContainer.appendChild(audioSpan)
    }

    // Subtitles
    const subsContainer = card.querySelector(".val-subs")
    if (subsContainer) {
        renderSubtitles(subsContainer as HTMLElement, ep.subtitles, langMap)
    }

    // IDs
    const seriesIdEl = card.querySelector(".val-series-id")
    const seasonIdEl = card.querySelector(".val-season-id")
    const episodeIdEl = card.querySelector(".val-episode-id")
    if (seriesIdEl) seriesIdEl.textContent = ep.seriesId
    if (seasonIdEl) seasonIdEl.textContent = ep.seasonId
    if (episodeIdEl) episodeIdEl.textContent = ep.episodeId

    // Watch button
    const actionBtn = card.querySelector(".seen-action-btn") as HTMLAnchorElement
    if (actionBtn) {
        actionBtn.href = `https://www.crunchyroll.com/watch/${ep.id}`
        actionBtn.dataset.watchId = ep.id
        actionBtn.textContent = watchedId === ep.id ? "Watch Episode (Last Seen)" : "Watch Episode"

        if (watchedId === ep.id) {
            card.classList.add("watched")
        }

        if (onWatchClick) {
            actionBtn.addEventListener("click", () => onWatchClick(ep.id))
        }
    }

    return card
}

/**
 * Render subtitle badges with collapse support
 */
function renderSubtitles(container: HTMLElement, subtitles: string[], langMap: LanguageMap): void {
    if (!subtitles || subtitles.length === 0) {
        container.textContent = "-"
        return
    }

    const limit = 3
    const showCollapse = subtitles.length > limit

    subtitles.forEach((sub, idx) => {
        const cleanName = langMap[sub] || sub
        const subItem = document.createElement("bidi-item")
        subItem.textContent = cleanName

        if (showCollapse && idx >= limit - 1) {
            subItem.classList.add("extra-sub")
            subItem.style.display = "none"
        }

        container.appendChild(subItem)
    })

    if (showCollapse) {
        const moreBtn = document.createElement("button")
        moreBtn.className =
            "text-accent-orange font-extrabold cursor-pointer hover:text-white transition-colors duration-200 select-none bg-accent-orange/10 border border-accent-orange/20 px-2 py-0.5 rounded hover:bg-accent-orange/20 text-[0.65rem] uppercase font-sans shrink-0"
        moreBtn.textContent = `+${subtitles.length - limit + 1} more`
        moreBtn.addEventListener("click", e => {
            e.stopPropagation()
            container.querySelectorAll(".extra-sub").forEach(el => {
                ;(el as HTMLElement).style.display = ""
            })
            moreBtn.remove()
        })
        container.appendChild(moreBtn)
    }
}

/**
 * Create compact row for list view
 */
export function createCompactRow(ep: Episode, langMap: LanguageMap, watchedId: string | null): HTMLElement {
    const row = document.createElement("div")
    row.className =
        "compact-row flex items-center gap-4 bg-bg-card border border-white/5 p-3 rounded-lg hover:border-white/10 transition-colors duration-200"
    row.dataset.episodeId = ep.id

    // Thumbnail
    const img = document.createElement("img")
    if (ep.thumbnail) {
        img.src = ep.thumbnail
        img.classList.remove("img-placeholder")
    }
    img.className = "w-16 sm:w-20 aspect-video object-cover rounded shrink-0 bg-[#0b0b0d]"
    img.loading = "lazy"
    img.decoding = "async"

    const imgLink = document.createElement("a")
    imgLink.href = `/eps/${ep.id}`
    imgLink.className = "shrink-0"
    imgLink.appendChild(img)
    row.appendChild(imgLink)

    // Text block
    const textBlock = document.createElement("div")
    textBlock.className = "flex-grow min-w-0"

    // Series title
    const seriesTitle = document.createElement("div")
    seriesTitle.className = "text-accent-orange text-[0.65rem] font-bold uppercase truncate"
    const seriesLink = document.createElement("a")
    seriesLink.href = `/series/${ep.seriesId}`
    seriesLink.className = "hover:text-accent-orange-hover hover:underline transition-colors"
    seriesLink.textContent = ep.seriesTitle
    seriesTitle.appendChild(seriesLink)
    textBlock.appendChild(seriesTitle)

    // Episode title
    const epTitle = document.createElement("div")
    epTitle.className = "text-white text-xs sm:text-sm font-semibold truncate"
    const epLink = document.createElement("a")
    epLink.href = `/eps/${ep.id}`
    epLink.className = "hover:text-accent-orange-hover transition-colors"
    epLink.textContent = ep.title
    epTitle.appendChild(epLink)
    textBlock.appendChild(epTitle)

    // Meta
    const metaStr = document.createElement("div")
    metaStr.className = "text-text-muted text-[0.7rem] mt-0.5 uppercase"
    metaStr.textContent = `EPISODE ${ep.episodeNumber} • ${formatReleaseDate(ep.releasedAt)}`
    textBlock.appendChild(metaStr)

    row.appendChild(textBlock)

    // Right block
    const rightBlock = document.createElement("div")
    rightBlock.className = "flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0"

    // Audio badge
    const audioLabel = ep.audioLocale ? langMap[ep.audioLocale] || ep.audioLocale : "-"
    const audioBadge = document.createElement("div")
    audioBadge.className =
        "text-[0.65rem] text-text-secondary bg-[#1c1c24] px-1.5 py-0.5 rounded border border-white/5 font-semibold uppercase"
    audioBadge.textContent = audioLabel
    rightBlock.appendChild(audioBadge)

    // Watch link
    const watchLink = document.createElement("a")
    watchLink.href = `https://www.crunchyroll.com/watch/${ep.id}`
    watchLink.target = "_blank"
    watchLink.rel = "noopener noreferrer"
    watchLink.className =
        "bg-accent-orange hover:bg-accent-orange-hover text-white text-[0.7rem] font-bold px-3 py-1.5 rounded-lg transition-colors duration-200 uppercase"
    watchLink.textContent = "Watch"
    watchLink.dataset.watchId = ep.id
    rightBlock.appendChild(watchLink)

    row.appendChild(rightBlock)

    if (watchedId === ep.id) {
        row.classList.add("border-accent-blue/30", "bg-accent-blue/3")
    }

    return row
}

/**
 * Create date section header
 */
export function createDateSection(dateStr: string): HTMLElement {
    const section = document.createElement("section")
    section.className = "feed-section flex flex-col gap-6"
    section.dataset.date = dateStr

    const headerWrapper = document.createElement("div")
    headerWrapper.className = "flex items-center justify-center w-full relative my-4"

    const line = document.createElement("div")
    line.className = "absolute left-0 right-0 h-px bg-white/5 z-0"
    headerWrapper.appendChild(line)

    const header = document.createElement("div")
    header.className =
        "bg-bg-primary text-accent-orange text-xs font-extrabold tracking-widest px-6 py-1.5 border border-white/5 rounded-full z-10 uppercase"
    header.textContent = dateStr
    headerWrapper.appendChild(header)

    section.appendChild(headerWrapper)

    const grid = document.createElement("div")
    grid.className = "feed-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
    section.appendChild(grid)

    return section
}

/**
 * Group episodes by date
 */
export function groupEpisodesByDate(episodes: Episode[]): Map<string, Episode[]> {
    const groups = new Map<string, Episode[]>()

    episodes.forEach(ep => {
        const dateKey = getDateGroupKey(ep.releasedAt)
        if (!groups.has(dateKey)) {
            groups.set(dateKey, [])
        }
        groups.get(dateKey)!.push(ep)
    })

    return groups
}

/**
 * Group episodes by series
 */
export function groupEpisodesBySeries(episodes: Episode[]): Map<string, SeriesGroup> {
    const groups = new Map<string, SeriesGroup>()

    episodes.forEach(ep => {
        if (!groups.has(ep.seriesTitle)) {
            groups.set(ep.seriesTitle, {
                seriesTitle: ep.seriesTitle,
                seriesId: ep.seriesId,
                thumbnail: ep.thumbnail,
                posterTall: ep.posterTall,
                description: ep.description,
                episodes: []
            })
        }
        groups.get(ep.seriesTitle)!.episodes.push(ep)
    })

    return groups
}

/**
 * Show/hide element
 */
export function toggleElement(el: HTMLElement | null, show: boolean): void {
    if (!el) return
    el.classList.toggle("hidden", !show)
}

/**
 * Show toast notification
 */
export function showToast(message: string, duration = 2500): void {
    const toast = document.getElementById("copied-toast")
    const toastText = document.getElementById("toast-text")

    if (toast && toastText) {
        toastText.textContent = ` ${message}`
        toast.classList.add("show")

        setTimeout(() => {
            toast.classList.remove("show")
        }, duration)
    }
}
