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

// 🧠 Fonction principale de scraping RSS
async function generateRSSFromConfluence(slug) {
  const url = `https://confluence.atlassian.com/cloud/blog/2025/07/atlassian-cloud-changes-${slug}`;
  const pubDate = getDateFromSlug(slug);

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const feed = new RSS({
      title: "Atlassian Cloud - New This Week",
      description: 'Weekly updates from Atlassian marked as "NEW THIS WEEK"',
      feed_url: `https://yourdomain.com/rss.xml`,
      site_url: url,
      language: "en",
      pubDate,
    });

    $("span.aui-lozenge-success").each((_, el) => {
      const span = $(el);
      const statusText = span.text().trim();

      if (statusText === "NEW THIS WEEK" || statusText === "ROLLING OUT") {
        const parent = span.closest("li, p, table, div");

        if (parent.length) {
          // Nettoyer le texte du parent pour le titre
          const rawText = parent.text().trim();
          const cleanedTitle =
            rawText
              .replace(/NEW THIS WEEK/i, "")
              .replace(/ROLLING OUT/i, "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 80) + "...";

          const cleanedElement = parent.clone();
          cleanedElement.find("span.status-macro").remove();

          feed.item({
            title: cleanedTitle,
            description: $.html(cleanedElement),
            url,
            date: pubDate,
          });
        }
      }
    });

    return feed.xml({ indent: true });
  } catch (error) {
    console.error("Error fetching or parsing page:", error);
    return null;
  }
}

// 🌐 Route : RSS de la semaine en cours
app.get("/rss", async (req, res) => {
  const slug = getCurrentWeekSlug();
  const xml = await generateRSSFromConfluence(slug);
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
  const xml = await generateRSSFromConfluence(slug);
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
