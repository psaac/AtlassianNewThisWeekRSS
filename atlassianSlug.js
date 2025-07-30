import dayjs from "dayjs";

// 🔧 Génère le slug automatique de la semaine actuelle (ex: jul-21-to-jul-28-2025)
export function getCurrentWeekSlug() {
  const today = dayjs();
  const lastMonday = today.startOf("week").subtract(6, "day"); // Lundi de la semaine dernière
  const lastSunday = lastMonday.add(7, "day");

  return `${lastMonday.format("MMM-D").toLowerCase()}-to-${lastSunday
    .format("MMM-D-YYYY")
    .toLowerCase()}`;
}

export function getPreviousWeekSlug() {
  const today = dayjs();
  const lastMonday = today.startOf("week").subtract(13, "day"); // Lundi de la semaine précédente
  const lastSunday = lastMonday.add(7, "day");

  return `${lastMonday.format("MMM-D").toLowerCase()}-to-${lastSunday
    .format("MMM-D-YYYY")
    .toLowerCase()}`;
}

export function getDateFromSlug(slug) {
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

export function getYearFromSlug(slug) {
  const match = slug.match(/-(\d{4})$/);
  if (!match) return new Date().getFullYear(); // fallback

  return parseInt(match[1]);
}

export function getMonthFromSlug(slug) {
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
