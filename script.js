const SITE_CONFIG = {
  name: "Emily Zohar",
  ownerName: "Emily Zohar",
  orcidId: "0009-0006-5490-4306",
  maxPublications: 20,

  fallbackPublications: [
    {
      title: "Against Frictionless AI",
      authors: "Emily Zohar",
      year: "2026",
      journal: "Communications Psychology",
      date: "Feb 17, 2026",
      url: "#",
      type: "journal-article"
    },
    {
      title: "Title",
      authors: "Author One, Author Two, Emily Zohar",
      year: "Year",
      journal: "Journal or status",
      date: "Date / status",
      url: "#",
      type: "journal-article"
    }
  ],

    publicationAwards: [
    {
      title: "Effort norms encourage more exertion but not less",
      label: "UTSC Psychology Best Paper Award 2026"
    },
    {
      title: "On top of the hour: Preference for scheduling and starting tasks at the beginning of the hour",
      label: "CPA Best Article Award 2025"
    }
  ]
};

const carousel = document.querySelector("#publication-carousel");
const statusText = document.querySelector("#orcid-status");

const modalBackdrop = document.querySelector("#modal-backdrop");
const modalClose = document.querySelector("#modal-close");
const modalTitle = document.querySelector("#modal-title");
const modalBody = document.querySelector("#modal-body");
const modalRole = document.querySelector("#modal-role");
const modalDates = document.querySelector("#modal-dates");
const modalLink = document.querySelector("#modal-link");

const yearElement = document.querySelector("#year");
const lastUpdatedElement = document.querySelector("#last-updated");

let lastFocusedElement = null;

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

if (lastUpdatedElement) {
  lastUpdatedElement.textContent = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

if (modalBackdrop) {
  modalBackdrop.hidden = true;
}

if (modalLink) {
  modalLink.hidden = true;
}

function getPublicationYearNumber(publication) {
  const year = Number.parseInt(publication.year, 10);
  return Number.isNaN(year) ? 0 : year;
}

function isOwnerFirstAuthor(publication) {
  const authors = String(publication.authors || "")
    .split(",")
    .map((author) => normalizeAuthorName(author))
    .filter(Boolean);

  if (!authors.length) return false;

  const owner = normalizeAuthorName(SITE_CONFIG.ownerName);

  return authors[0] === owner;
}

function sortPublications(publications) {
  return publications.sort((a, b) => {
    const rankA = publicationStatusRank(a);
    const rankB = publicationStatusRank(b);

    // 1. Published before preprints/other work
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // 2. Newer years first
    const yearA = getPublicationYearNumber(a);
    const yearB = getPublicationYearNumber(b);

    if (yearA !== yearB) {
      return yearB - yearA;
    }

    // 3. First-author papers first within same status/year
    const firstAuthorA = isOwnerFirstAuthor(a) ? 1 : 0;
    const firstAuthorB = isOwnerFirstAuthor(b) ? 1 : 0;

    if (firstAuthorA !== firstAuthorB) {
      return firstAuthorB - firstAuthorA;
    }

    // 4. Alphabetical fallback
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

function escapeHtml(value) {
  if (!value) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeDate(publicationDate) {
  if (!publicationDate) return "Date unavailable";

  const year = publicationDate.year?.value;
  const month = publicationDate.month?.value;
  const day = publicationDate.day?.value;

  if (!year) return "Date unavailable";

  const parts = [year];

  if (month) parts.push(month.padStart(2, "0"));
  if (day) parts.push(day.padStart(2, "0"));

  return parts.join("-");
}

function getPublicationYear(summary) {
  return summary["publication-date"]?.year?.value || "Year unavailable";
}

function getExternalIds(summary) {
  return summary["external-ids"]?.["external-id"] || [];
}

function getDoi(summary) {
  const externalIds = getExternalIds(summary);

  const doi = externalIds.find((id) => {
    return (
      String(id["external-id-type"] || "").toLowerCase() === "doi" &&
      id["external-id-value"]
    );
  });

  return doi ? doi["external-id-value"] : "";
}

function getExternalUrl(summary) {
  const explicitUrl = summary.url?.value;

  if (explicitUrl) {
    return explicitUrl;
  }

  const doi = getDoi(summary);

  if (doi) {
    return `https://doi.org/${doi}`;
  }

  return "#";
}

function getAuthorsFromContributors(contributorsObject) {
  const contributors = contributorsObject?.contributor || [];

  if (!contributors.length) {
    return "";
  }

  const authorNames = contributors
    .map((contributor) => {
      return (
        contributor["credit-name"]?.value ||
        contributor["contributor-orcid"]?.path ||
        ""
      );
    })
    .filter(Boolean);

  return authorNames.join(", ");
}

function getAuthorsFromWork(work) {
  const authors = getAuthorsFromContributors(work.contributors);

  if (authors) {
    return authors;
  }

  return "Authors unavailable";
}

async function fetchOrcidWorkDetails(orcidId, putCode) {
  if (!orcidId || !putCode) {
    return null;
  }

  try {
    const response = await fetch(
      `https://pub.orcid.org/v3.0/${orcidId}/work/${putCode}`,
      {
        headers: {
          Accept: "application/vnd.orcid+json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`ORCID work request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Could not fetch ORCID work detail:", error);
    return null;
  }
}

function normalizeTitleForDeduplication(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getPublicationAward(publication) {
  const publicationTitle = normalizeTitleForDeduplication(publication.title);

  const award = SITE_CONFIG.publicationAwards.find((awardItem) => {
    return normalizeTitleForDeduplication(awardItem.title) === publicationTitle;
  });

  return award ? award.label : "";
}

function isPreprint(publication) {
  const type = String(publication.type || "").toLowerCase();
  const journal = String(publication.journal || "").toLowerCase();
  const title = String(publication.title || "").toLowerCase();
  const url = String(publication.url || "").toLowerCase();

  return (
    type.includes("preprint") ||
    journal.includes("preprint") ||
    journal.includes("psyarxiv") ||
    journal.includes("osf") ||
    journal.includes("biorxiv") ||
    journal.includes("medrxiv") ||
    title.includes("preprint") ||
    url.includes("psyarxiv") ||
    url.includes("osf.io") ||
    url.includes("biorxiv") ||
    url.includes("medrxiv")
  );
}

function publicationStatusRank(publication) {
  const type = String(publication.type || "").toLowerCase();

  if (isPreprint(publication)) {
    return 3;
  }

  if (
    type.includes("journal-article") ||
    type.includes("book-chapter") ||
    type.includes("book") ||
    type.includes("conference-paper")
  ) {
    return 1;
  }

  return 2;
}

function deduplicatePublications(publications) {
  const bestByTitle = new Map();

  publications.forEach((publication) => {
    const normalizedTitle = normalizeTitleForDeduplication(publication.title);

    if (!normalizedTitle) return;

    const existing = bestByTitle.get(normalizedTitle);

    if (!existing) {
      bestByTitle.set(normalizedTitle, publication);
      return;
    }

    const currentRank = publicationStatusRank(publication);
    const existingRank = publicationStatusRank(existing);

    if (currentRank < existingRank) {
      bestByTitle.set(normalizedTitle, publication);
      return;
    }

    if (currentRank === existingRank) {
      const currentYear = Number.parseInt(publication.year, 10) || 0;
      const existingYear = Number.parseInt(existing.year, 10) || 0;

      if (currentYear > existingYear) {
        bestByTitle.set(normalizedTitle, publication);
      }
    }
  });

  return Array.from(bestByTitle.values());
}

async function addAuthorsFromDetailedOrcidRecords(publications, orcidId) {
  const publicationsWithAuthors = await Promise.all(
    publications.map(async (publication) => {
      const detailedWork = await fetchOrcidWorkDetails(orcidId, publication.putCode);

      if (!detailedWork) {
        return {
          ...publication,
          authors: "Authors unavailable"
        };
      }

      return {
        ...publication,
        authors: getAuthorsFromWork(detailedWork)
      };
    })
  );

  return publicationsWithAuthors;
}

async function convertOrcidWorksToPublications(orcidJson, orcidId) {
  const groups = orcidJson.group || [];

  const allSummaries = groups.flatMap((group) => {
    return group["work-summary"] || [];
  });

  const publications = allSummaries
    .filter(Boolean)
    .map((summary) => {
      return {
        title: summary.title?.title?.value || "Untitled work",
        authors: "Authors loading...",
        year: getPublicationYear(summary),
        journal: summary["journal-title"]?.value || summary.type || "Publication",
        date: normalizeDate(summary["publication-date"]),
        url: getExternalUrl(summary),
        doi: getDoi(summary),
        type: summary.type || "",
        putCode: summary["put-code"] || ""
      };
    });

  const deduplicated = deduplicatePublications(publications);

  // Fetch authors before sorting, because first-author status depends on authors.
  const publicationsWithAuthors = await addAuthorsFromDetailedOrcidRecords(
    deduplicated,
    orcidId
  );

  const sorted = sortPublications(publicationsWithAuthors);

  return sorted.slice(0, SITE_CONFIG.maxPublications);
}

function normalizeAuthorName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatAuthorsWithBoldEmily(authors) {
  if (!authors) return "Authors unavailable";

  const names = String(authors)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (!names.length) return "Authors unavailable";

  return names
    .map((name) => {
      const normalized = normalizeAuthorName(name);
      const isEmily =
        normalized === "emily zohar" ||
        normalized.startsWith("emily ") && normalized.endsWith(" zohar");

      const safeName = escapeHtml(name);

      return isEmily ? `<strong>${safeName}</strong>` : safeName;
    })
    .join(", ");
}

function renderPublications(publications) {
  if (!carousel) return;

  carousel.innerHTML = "";

  publications.forEach((publication) => {
    const card = document.createElement("article");
    card.className = "publication-card";

    const safeTitle = escapeHtml(publication.title);
    const formattedAuthors = formatAuthorsWithBoldEmily(
      publication.authors || "Authors unavailable"
    );
    const safeDate = escapeHtml(publication.date || publication.year);
    const safeJournal = escapeHtml(publication.journal);
    const safeUrl = escapeHtml(publication.url || "#");

    const awardLabel = getPublicationAward(publication);
    const awardBadge = awardLabel
      ? `<div class="publication-award-badge">${escapeHtml(awardLabel)}</div>`
      : "";

    const statusLabel = isPreprint(publication) ? "Preprint" : "Published";

    const articleLink =
      safeUrl && safeUrl !== "#"
        ? `<a class="article-link" href="${safeUrl}" target="_blank" rel="noopener">View article</a>`
        : `<span class="article-link unavailable">Link unavailable</span>`;

    card.innerHTML = `
     
      <h2>${safeTitle}</h2>
      <p class="publication-authors">${formattedAuthors}</p>
      <p class="publication-meta">${safeDate} · ${statusLabel}</p>
      <p class="publication-journal">${safeJournal}</p>
      
      <div class="publication-spacer"></div>
       ${awardBadge}
      <div class="card-actions single-action">
        ${articleLink}
      </div>
      
    `;

    carousel.appendChild(card);
  });
}

async function loadOrcidPublications() {
  const orcidId = SITE_CONFIG.orcidId.trim();

  if (!orcidId || orcidId === "YOUR-ORCID-ID") {
    if (statusText) {
      statusText.textContent =
        "Using sample publications. Add your ORCID ID in script.js.";
    }

    renderPublications(SITE_CONFIG.fallbackPublications);
    return;
  }

  try {
    const response = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/works`, {
      headers: {
        Accept: "application/vnd.orcid+json"
      }
    });

    if (!response.ok) {
      throw new Error(`ORCID request failed with status ${response.status}`);
    }

    const data = await response.json();
    const publications = await convertOrcidWorksToPublications(data, orcidId);

    if (publications.length === 0) {
      if (statusText) {
        statusText.textContent = "No public works found on ORCID.";
      }

      renderPublications(SITE_CONFIG.fallbackPublications);
      return;
    }

    if (statusText) {
      statusText.textContent = ``;
    }

    renderPublications(publications);
  } catch (error) {
    console.error(error);

    if (statusText) {
      statusText.textContent = "Could not load ORCID. Showing sample publications.";
    }

    renderPublications(SITE_CONFIG.fallbackPublications);
  }
}

function openModal({ title, body, role, dates, link }) {
  if (!modalBackdrop) return;

  lastFocusedElement = document.activeElement;

  if (modalTitle) {
    modalTitle.textContent = title || "";
  }

  if (modalBody) {
    modalBody.textContent = body || "";
  }

  if (modalRole) {
    modalRole.textContent = role || "";
  }

  if (modalDates) {
    modalDates.textContent = dates || "";
  }

  if (modalLink) {
    if (link && link !== "#") {
      modalLink.href = link;
      modalLink.hidden = false;
    } else {
      modalLink.hidden = true;
    }
  }

  modalBackdrop.hidden = false;

  if (modalClose) {
    modalClose.focus();
  }
}

function openModalFromElement(element) {
  openModal({
    title: element.dataset.modalTitle || element.dataset.title,
    body: element.dataset.modalBody || element.dataset.body,
    role: element.dataset.modalRole || element.dataset.role,
    dates: element.dataset.modalDates || element.dataset.dates,
    link: element.dataset.modalLink || element.dataset.link
  });
}

function closeModal() {
  if (!modalBackdrop) return;

  modalBackdrop.hidden = true;

  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
}

function isMobileScreen() {
  return window.matchMedia("(max-width: 850px)").matches;
}

document.querySelectorAll(".logo-button").forEach((button) => {
  button.addEventListener("click", () => {
    const detailId = button.dataset.detailId;

    if (isMobileScreen() && detailId) {
      window.location.href = `experience-detail.html?id=${encodeURIComponent(detailId)}`;
      return;
    }

    openModalFromElement(button);
  });
});

document.querySelectorAll(".media-logo-button").forEach((button) => {
  button.addEventListener("click", () => openModalFromElement(button));
});

if (modalClose) {
  modalClose.addEventListener("click", closeModal);
}

if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      closeModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modalBackdrop && !modalBackdrop.hidden) {
    closeModal();
  }
});

const pubLeft = document.querySelector("#pub-left");
const pubRight = document.querySelector("#pub-right");

if (pubLeft && carousel) {
  pubLeft.addEventListener("click", () => {
    carousel.scrollBy({
      left: -360,
      behavior: "smooth"
    });
  });
}

if (pubRight && carousel) {
  pubRight.addEventListener("click", () => {
    carousel.scrollBy({
      left: 360,
      behavior: "smooth"
    });
  });
}

loadOrcidPublications();

const mediaCarousel = document.querySelector("#media-carousel");
const mediaLeft = document.querySelector("#media-left");
const mediaRight = document.querySelector("#media-right");

if (mediaLeft && mediaCarousel) {
  mediaLeft.addEventListener("click", () => {
    mediaCarousel.scrollBy({
      left: -320,
      behavior: "smooth"
    });
  });
}

if (mediaRight && mediaCarousel) {
  mediaRight.addEventListener("click", () => {
    mediaCarousel.scrollBy({
      left: 320,
      behavior: "smooth"
    });
  });
}