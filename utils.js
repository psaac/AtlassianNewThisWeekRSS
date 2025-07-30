import axios from "axios";
export function capitalizeWords(str) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function fetchHtml(url) {
  try {
    const response = await axios.get(url);
    //const $ = cheerio.load(response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching or parsing page:", error);
    return null;
  }
}
