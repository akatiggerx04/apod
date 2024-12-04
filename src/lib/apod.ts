const urlBase = "https://apod.nasa.gov/apod/";
const corsProxy = "https://apodcors.tiggerx04.workers.dev/?apod=";

interface APODProps {
  url?: string;
  hdurl?: string;
  title?: string;
  explanation?: string;
  credits: string | null;
  copyright: string | null;
  media_type: string;
  date: string;
  link: string;
}

// Cache manager class
class APODCache {
  private cache: Map<string, APODProps>;
  private enabled: boolean;
  private cacheKey: string;

  constructor() {
    this.cache = new Map();
    this.enabled =
      typeof window !== "undefined" && window.localStorage !== undefined;
    this.cacheKey = "apod_cache";
    this.loadCache();
  }

  private loadCache(): void {
    if (!this.enabled) return;
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        this.cache = new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.warn("Failed to load APOD cache:", e);
    }
  }

  private saveCache(): void {
    if (!this.enabled) return;
    try {
      const obj = Object.fromEntries(this.cache);
      localStorage.setItem(this.cacheKey, JSON.stringify(obj));
    } catch (e) {
      console.warn("Failed to save APOD cache:", e);
    }
  }

  get(key: string): APODProps | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: APODProps): void {
    this.cache.set(key, value);
    this.saveCache();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

const cache = new APODCache();

// Format a date into APOD's required format (YYMMDD)
function formatDate(dt: Date): string {
  const year = dt.getFullYear().toString().slice(-2);
  const month = (dt.getMonth() + 1).toString().padStart(2, "0");
  const day = dt.getDate().toString().padStart(2, "0");
  return year + month + day;
}

// Parse the HTML of an APOD page to extract metadata.
async function parseAPODPage(
  url: string,
  date: Date,
): Promise<APODProps | null> {
  const response = await fetch(`${corsProxy}${url}`);
  if (response.status === 404) return null;

  const text = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");

  const props = {} as APODProps;
  let mediaType = "image";
  let mediaUrl = "";
  let hdUrl = "";

  const img = doc.querySelector("img");
  const iframe = doc.querySelector("iframe");

  if (img) {
    const imgParentAnchor = img.closest("a");
    mediaUrl = img.getAttribute("src") || "";
    if (!mediaUrl.startsWith("http")) {
      mediaUrl = urlBase + mediaUrl;
    }

    if (
      imgParentAnchor &&
      imgParentAnchor.getAttribute("href")?.startsWith("image/")
    ) {
      hdUrl = urlBase + imgParentAnchor.getAttribute("href");
    } else {
      hdUrl = mediaUrl;
    }
  } else if (iframe) {
    mediaType = "video";
    mediaUrl = iframe.src;
  } else {
    mediaType = "other";
  }

  const title = extractTitle(doc);
  const explanation = extractExplanation(doc);
  const { credits, copyright } = extractCredits(doc);

  if (mediaUrl) props.url = mediaUrl;
  if (hdUrl) props.hdurl = hdUrl;
  if (title) props.title = title;
  if (explanation) props.explanation = explanation;
  props.credits = credits;
  props.copyright = copyright;

  props.media_type = mediaType;
  props.date = new Date(date)
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .join("-");

  props.link = `https://apod.nasa.gov/apod/ap${formatDate(new Date(props.date))}.html`;

  return props;
}

// Extract the APOD title
function extractTitle(doc: Document): string {
  const centerElement = doc.querySelector<HTMLElement>("center");
  if (centerElement) {
    const boldText = centerElement.querySelector("b");
    if (boldText) {
      return boldText.textContent?.trim() || "";
    }
  }
  const pageTitle = doc.title.split(" - ").pop()?.trim() || "";
  return pageTitle.replace(/^APOD:\s*\d{4}\s*\w+\s*\d+\s*[–-]\s*/, "").trim();
}

// Extract the explanation text
function extractExplanation(doc: Document): string {
  const explanationHeader = Array.from(doc.querySelectorAll("b")).find(
    (el) => el.textContent?.trim().toLowerCase() === "explanation:",
  );

  if (!explanationHeader) return "";

  let explanation = "";
  let currentNode = explanationHeader.nextSibling;

  while (
    currentNode &&
    !currentNode.textContent?.includes("Tomorrow's picture")
  ) {
    if (
      currentNode.nodeType === Node.TEXT_NODE ||
      currentNode.nodeType === Node.ELEMENT_NODE
    ) {
      explanation += currentNode.textContent || "";
    }
    currentNode = currentNode.nextSibling;
  }

  return explanation.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

// Extract credits and copyright information
function extractCredits(doc: Document): {
  credits: string | null;
  copyright: string | null;
} {
  const centerElements = doc.querySelectorAll<HTMLElement>("center");
  let credits = null;
  let copyright = null;

  for (const centerElement of centerElements) {
    const creditElements = centerElement.querySelectorAll("b");
    for (const element of creditElements) {
      if (
        element.textContent?.toLowerCase().includes("credit") ||
        element.textContent?.toLowerCase().includes("copyright")
      ) {
        const nodes = Array.from(element.parentElement?.childNodes || []);
        const labelIndex = nodes.indexOf(element);
        const nodesAfter = nodes.slice(labelIndex + 1);

        let text = nodesAfter
          .filter((node): node is ChildNode => {
            return (
              node instanceof Node &&
              (node.nodeType === Node.TEXT_NODE ||
                (node.nodeType === Node.ELEMENT_NODE &&
                  (node as Element).nodeName !== "BR" &&
                  !(node as Element).textContent
                    ?.toLowerCase()
                    .includes("credit") &&
                  !(node as Element).textContent
                    ?.toLowerCase()
                    .includes("copyright")))
            );
          })
          .map((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              return (node as Element).textContent?.trim();
            }
            return node.textContent?.trim();
          })
          .filter((text) => text)
          .join(" ")
          .trim();

        if (text) {
          const formattedText = text
            .replace(/\s*,\s*/g, ", ")
            .replace(/\s*;\s*/g, "; ")
            .replace(/\s+/g, " ")
            .replace(/;\s*Processing:/g, "; Processing:")
            .replace(/&(?!\s)/g, "& ")
            .replace(/(?<=\S)&(?=\S)/g, " & ")
            .replace(/\(\s*/g, "(")
            .replace(/\s*\)/g, ")")
            .replace(/(?<=\S)\/(?=\S)|(?=\S)\/(?<=\S)|(?<=\S)\/(?=\S)/g, " / ")
            .replace(/\s{2,}/g, " ")
            .trim();

          if (element.textContent?.toLowerCase().includes("copyright")) {
            copyright = formattedText;
          } else if (element.textContent?.toLowerCase().includes("credit")) {
            credits = formattedText;
          }
        }
      }
    }

    if (credits && copyright && credits === copyright) {
      credits = null;
    }

    if (credits && copyright) break;
  }

  return { credits: credits || null, copyright: copyright || null };
}

// Fetch APOD data
export async function fetchAPOD(
  startDate: string | Date,
  endDate: string | Date | null = null,
  useDefaultDate = false,
): Promise<APODProps | APODProps[] | null> {
  try {
    if (!endDate) {
      // Single date fetch
      let date = startDate ? new Date(startDate) : new Date();
      let formattedDate = formatDate(date);

      // Check cache first
      if (cache.has(formattedDate)) {
        const cachedValue = cache.get(formattedDate);
        if (cachedValue) {
          return cachedValue;
        }
      }

      let url = formattedDate
        ? `${urlBase}ap${formattedDate}.html`
        : `${urlBase}astropix.html`;

      let result = await parseAPODPage(url, date);
      if (!result && useDefaultDate) {
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        formattedDate = formatDate(prevDate);
        url = `${urlBase}ap${formattedDate}.html`;
        result = await parseAPODPage(url, prevDate);
      }

      if (result) {
        cache.set(formattedDate, result);
      }
      return result;
    }

    // Date range fetch
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    let currentDate = start;

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fetch in parallel with concurrency limit
    const concurrencyLimit = 5;
    const results: APODProps[] = [];

    for (let i = 0; i < dates.length; i += concurrencyLimit) {
      const chunk = dates.slice(i, i + concurrencyLimit);
      const promises = chunk.map(async (date) => {
        const formattedDate = formatDate(date);

        // Check cache first
        if (cache.has(formattedDate)) {
          return cache.get(formattedDate);
        }

        const url = `${urlBase}ap${formattedDate}.html`;
        const result = await parseAPODPage(url, date);
        if (result) {
          cache.set(formattedDate, result);
        }
        return result;
      });

      const chunkResults = await Promise.all(promises);
      results.push(
        ...chunkResults.filter(
          (result): result is APODProps => result !== null,
        ),
      );
    }

    return results.reverse();
  } catch (err) {
    console.error("Error fetching APOD:", err);
    throw err;
  }
}
