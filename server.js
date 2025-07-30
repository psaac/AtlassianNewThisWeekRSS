const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const RSS = require("rss");
const dayjs = require("dayjs");

const app = express();
const PORT = 3000;

// 🔧 Génère le slug automatique de la semaine actuelle (ex: jul-21-to-jul-28-2025)
function getCurrentWeekSlug() {
  const today = dayjs();
  const lastMonday = today.startOf("week").subtract(6, "day"); // Lundi de la semaine dernière
  const lastSunday = lastMonday.add(7, "day");

  return `${lastMonday.format("MMM-D").toLowerCase()}-to-${lastSunday
    .format("MMM-D-YYYY")
    .toLowerCase()}`;
}

function getPreviousWeekSlug() {
  const today = dayjs();
  const lastMonday = today.startOf("week").subtract(13, "day"); // Lundi de la semaine précédente
  const lastSunday = lastMonday.add(7, "day");

  return `${lastMonday.format("MMM-D").toLowerCase()}-to-${lastSunday
    .format("MMM-D-YYYY")
    .toLowerCase()}`;
}

function getDateFromSlug(slug) {
  const match = slug.match(
    /([a-z]{3})-(\d{1,2})-to-([a-z]{3})-(\d{1,2})-(\d{4})/i
  );
  if (!match) return new Date(); // fallback

  const [, , , monthStr, dayStr, yearStr] = match;
  const month = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  }[monthStr.toLowerCase()];

  return new Date(parseInt(yearStr), month, parseInt(dayStr));
}

function getYearFromSlug(slug) {
  const match = slug.match(/-(\d{4})$/);
  if (!match) return new Date().getFullYear(); // fallback

  return parseInt(match[1]);
}

function getMonthFromSlug(slug) {
  const match = slug.match(/-to-([a-z]{3})-/i);
  if (!match) return new Date().getMonth(); // fallback
  const monthStr = match[1].toLowerCase();
  return {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  }[monthStr];
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

// 🧠 Fonction principale de scraping RSS
async function generateRSSFromConfluence(slug, tag) {
  const url = `https://confluence.atlassian.com/cloud/blog/${getYearFromSlug(
    slug
  )}/${getMonthFromSlug(slug)}/atlassian-cloud-changes-${slug}`;
  const pubDate = getDateFromSlug(slug);

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const items = [];
    $("span.aui-lozenge").each((_, el) => {
      const span = $(el);
      const statusText = span.text().trim();

      if (statusText === tag) {
        const parent = span.closest("li, p, table, div");

        if (parent.length) {
          // Nettoyer le texte du parent pour le titre
          const rawText = parent.text().trim();
          const cleanedTitle =
            rawText
              .replace(/NEW THIS WEEK/i, "")
              .replace(/ROLLING OUT/i, "")
              .replace(/COMING SOON/i, "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 80) + "...";

          const cleanedElement = parent.clone();
          cleanedElement.find("span.status-macro").remove();

          items.push({
            title: cleanedTitle,
            description: $.html(cleanedElement),
            url,
            date: pubDate,
          });
        }
      }
    });

    const feed = new RSS({
      title: `Atlassian Cloud - ${capitalizeWords(tag.toLowerCase())} (${
        items.length
      } items)`,
      description: `Weekly updates from Atlassian marked as "${tag}" - Week of ${slug}`,
      feed_url: `https://yourdomain.com/rss.xml`,
      site_url: url,
      language: "en",
      pubDate,
    });
    items.forEach((item) => feed.item(item));

    return feed.xml({ indent: true });
  } catch (error) {
    console.error("Error fetching or parsing page:", error);
    return null;
  }
}

// 🌐 Route : RSS de la semaine en cours
app.get("/rss", async (req, res) => {
  const slug = getCurrentWeekSlug();
  const tag = req.query.tag || "NEW THIS WEEK";
  const xml = await generateRSSFromConfluence(slug, tag);
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
  const tag = req.query.tag || "NEW THIS WEEK";
  const xml = await generateRSSFromConfluence(slug, tag);
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
  const tag = req.query.tag || "NEW THIS WEEK";
  const xml = await generateRSSFromConfluence(slug, tag);
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
