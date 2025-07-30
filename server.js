import express from "express";
import * as cheerio from "cheerio";
import RSS from "rss";
import {
  getCurrentWeekSlug,
  getPreviousWeekSlug,
  getDateFromSlug,
  getYearFromSlug,
  getMonthFromSlug,
} from "./atlassianSlug.js";
import { capitalizeWords, fetchHtml } from "./utils.js"; // Assuming you have a utility function for capitalization
// import { JSDOM } from "jsdom";

const app = express();
const PORT = 3000;

// Cache handling
const cache = {};
const CACHE_DURATION_MS = 60 * 60 * 1000; // 60 minutes

function getCacheKey(slug, filter) {
  return `${slug}_${filter}`;
}

function getWikiUrl(slug) {
  return `https://confluence.atlassian.com/cloud/blog/${getYearFromSlug(
    slug
  )}/${getMonthFromSlug(slug)}/atlassian-cloud-changes-${slug}`;
}

function parseFilteredItems(slug, html, filter) {
  const key = getCacheKey(slug, filter);
  const now = Date.now();
  const pubDate = getDateFromSlug(slug);
  const url = getWikiUrl(slug);
  const $ = cheerio.load(html);

  const items = [];
  $("span.aui-lozenge").each((_, el) => {
    const span = $(el);
    const statusText = span.text().trim();

    if (statusText === filter) {
      const parent = span.closest("li, p, table, div");

      if (parent.length) {
        const cleanedElement = parent.clone();
        cleanedElement.find("span.status-macro").remove();
        cleanedElement.find("h4").remove(); // Remove any h4 tags if they exist

        items.push({
          title: parent.find("h4").text().trim(),
          description: $.html(cleanedElement),
          url: url,
          date: pubDate,
        });
      }
    }
  });

  // Update cache
  cache[key] = {
    items,
    timestamp: now,
  };

  return items;
}

function generateFeed(items, filter, slug) {
  const feed = new RSS({
    title: `Atlassian Cloud - ${capitalizeWords(filter.toLowerCase())} (${
      items.length
    } items)`,
    description: `Weekly updates from Atlassian marked as "${filter}" - Week of ${slug}`,
    feed_url: `https://yourdomain.com/rss.xml`,
    site_url: getWikiUrl(slug),
    language: "en",
    pubDate: getDateFromSlug(slug),
  });
  items.forEach((item) => feed.item(item));

  return feed.xml({ indent: true });
}

// 🧠 Fonction principale de scraping RSS
async function generateRSSFromConfluence(slug, filter) {
  const key = getCacheKey(slug, filter);
  const now = Date.now();
  let items = [];

  // Serve from cache if valid
  if (cache[key] && now - cache[key].timestamp < CACHE_DURATION_MS) {
    console.log(`Serving from cache: ${key}`);
    items = cache[key].items;
  } else {
    const html = await fetchHtml(getWikiUrl(slug));
    items = parseFilteredItems(slug, html, filter);
  }
  return generateFeed(items, filter, slug);
}

// 🌐 Routes
// 🌐 Route : Home
// --- Route HTML avec filtre en dropdown ---
app.get("/:slug", async (req, res) => {
  try {
    const filter = req.query.filter || "NEW THIS WEEK";
    const slug = req.params.slug || getCurrentWeekSlug();
    // Cache handling
    const key = getCacheKey(slug, filter);
    const now = Date.now();
    const url = getWikiUrl(slug);
    let items = [];
    if (cache[key] && now - cache[key].timestamp < CACHE_DURATION_MS) {
      console.log(`Serving from cache: ${key}`);
      items = cache[key].items;
    } else {
      const html = await fetchHtml(url);
      items = parseFilteredItems(slug, html, filter);
    }

    // Affiche une page avec dropdown pour changer le filtre en JS
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Atlassian Cloud - ${filter}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 2rem; background-color: #121212; color: white; }
  .rss-item { margin-bottom: 1rem; padding: 1rem; border-left: 4px solid #0052CC; background: hsl(30, 20%, 10%);}
  .rss-item h3 { margin: 0; }
  .rss-button {
    background-color: #ff6600;
    color: white;
    border: none;
    padding: 8px 15px;
    cursor: pointer;
    border-radius: 5px;
    font-weight: bold;
  }
  .rss-button:hover {
    background-color: #e65c00;
  }
</style>
</head>
<body>
<h2><a href="${url}">Atlassian Cloud - ${filter} - ${slug} (${
      items.length
    } items)</a>

<a href="/rss${req.params.slug ? `/${req.params.slug}` : ""}${
      filter ? `?filter=${encodeURIComponent(filter)}` : ""
    }" target="_blank" rel="noopener noreferrer">
  <button class="rss-button">RSS</button>
</a>
</h2>

<label for="filter-select">Filter: </label>
<select id="filter-select">
  <option value="NEW THIS WEEK" ${
    filter === "NEW THIS WEEK" ? "selected" : ""
  }>NEW THIS WEEK</option>
  <option value="COMING SOON" ${
    filter === "COMING SOON" ? "selected" : ""
  }>COMING SOON</option>
  <option value="ROLLING OUT" ${
    filter === "ROLLING OUT" ? "selected" : ""
  }>ROLLING OUT</option>
</select>

<div id="items">
  ${items
    .map(
      (item) => `
    <div class="rss-item">
      <h2>${item.title}</h2>
      <p>${item.description}</p>
    </div>`
    )
    .join("")}
</div>

<script>
  document.getElementById("filter-select").addEventListener("change", e => {
    const selectedFilter = e.target.value;
    // Recharge la page avec le filtre choisi (tu peux améliorer en fetch API)
    const params = new URLSearchParams(window.location.search);
    params.set("filter", selectedFilter);
    window.location.search = params.toString();
  });
</script>
</body>
</html>
    `);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 🌐 Route : RSS de la semaine en cours
app.get("/rss", async (req, res) => {
  const slug = getCurrentWeekSlug();
  const filter = req.query.filter || "NEW THIS WEEK";
  const xml = await generateRSSFromConfluence(slug, filter);
  if (xml) {
    res.set("Content-Type", "application/rss+xml");
    res.send(xml);
  } else {
    res.status(500).send("Failed to generate RSS");
  }
});

// 🌐 Route : RSS of previous week
app.get("/rss/previous", async (req, res) => {
  const slug = getPreviousWeekSlug();
  const filter = req.query.filter || "NEW THIS WEEK";
  const xml = await generateRSSFromConfluence(slug, filter);
  if (xml) {
    res.set("Content-Type", "application/rss+xml");
    res.send(xml);
  } else {
    res.status(500).send("Failed to generate RSS");
  }
});

// 🌐 Route : RSS d'une semaine spécifique
app.get("/rss/:slug", async (req, res) => {
  const slug = req.params.slug;
  const filter = req.query.filter || "NEW THIS WEEK";
  const xml = await generateRSSFromConfluence(slug, filter);
  if (xml) {
    res.set("Content-Type", "application/rss+xml");
    res.send(xml);
  } else {
    res.status(500).send("Failed to generate RSS");
  }
});

app.listen(PORT, () => {
  console.log(`✅ RSS Server running at http://localhost:${PORT}`);
});
