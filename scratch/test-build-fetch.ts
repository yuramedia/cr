import { getAccessToken, fetchCrunchyrollEpisodes } from "../src/scripts/api";

async function run() {
  console.log("Acquiring token...");
  const token = await getAccessToken();
  if (!token) {
    console.log("FAIL: Token acquisition failed.");
    return;
  }
  console.log("Token acquired:", token.substring(0, 10) + "...");

  console.log("Fetching latest episodes...");
  const eps = await fetchCrunchyrollEpisodes(token, 0);
  if (!eps || eps.length === 0) {
    console.log("FAIL: No episodes fetched.");
    return;
  }
  console.log(`SUCCESS: Fetched ${eps.length} episodes.`);
  console.log("First episode:", {
    id: eps[0].id,
    title: eps[0].title,
    series: eps[0].episode_metadata?.series_title,
    thumbnail: eps[0].images?.thumbnail?.[0]?.[0]?.source
  });
}

run();
