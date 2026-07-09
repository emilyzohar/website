const EXPERIENCE_DETAILS = {
  uoft: {
    title: "Work and Play Lab, University of Toronto",
    role: "PhD Student",
    dates: "2023–present",
    body:
      "• PhD student researching effort willingness under the supervision of Michael Inzlicht.",
    link: "https://michaelinzlicht.com/"
  },
  beworks: {
    title: "BEworks",
    role: "Research Consultant",
    dates: "2022–2023",
    body:
      "• Conducted literature reviews and evidence syntheses for consulting teams across private and public sector engagements.\n\n" +
      "• Supported senior strategists and associates on think tank and client projects, translating behavioural science evidence into practical recommendations.\n\n" +
      "• Designed and delivered MURAL-based digital workshops for internal and external clients; built and deployed surveys in Qualtrics.\n\n" +
      "• Independently developed an Information Presentation Best Practices resource that was adopted organization-wide and considered for external commercialization.",
    link: "https://beworks.com/"
  },

  bcfg: {
    title: "Behavior Change for Good",
    role: "Research Assistant",
    dates: "2023–2024",
    body:
      "• Led an arm of a large-scale, multi-year research initiative focused on designing interventions that change behaviour for the public good.\n\n" +
      "• Designed and supported an intervention teaching first-year undergraduates how to use their calendars more effectively.\n\n" +
      "• Examined whether calendar-based planning could improve academic achievement and retention.\n\n" +
      "• The calendaring intervention was selected as the sole intervention included in the 2024 pilot.",
    link: "https://behaviorchangeforgood.org/"
  }
};

function getExperienceIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderExperienceDetail() {
  const id = getExperienceIdFromUrl();
  const detail = EXPERIENCE_DETAILS[id];

  const title = document.querySelector("#detail-title");
  const role = document.querySelector("#detail-role");
  const dates = document.querySelector("#detail-dates");
  const body = document.querySelector("#detail-body");
  const link = document.querySelector("#detail-link");

  if (!detail) {
    title.textContent = "Experience not found";
    role.textContent = "";
    dates.textContent = "";
    body.textContent = "Return to the main page and select an experience.";
    link.hidden = true;
    return;
  }

  document.title = `${detail.title} | Experience`;

  title.textContent = detail.title;
  role.textContent = detail.role;
  dates.textContent = detail.dates;
  body.textContent = detail.body;

  if (detail.link) {
    link.href = detail.link;
    link.hidden = false;
  } else {
    link.hidden = true;
  }
}

renderExperienceDetail();