import { initTyper } from "../shared/kit.js";

/* The page text: the hero plus screen-reader copies of what hangs on the walls. Runs before main.js (and without it,
   when there is no WebGL), so the CV is always readable. Language comes from content.js (TR / EN). */
const CV = window.CV, ui = CV.ui;
const $ = (s) => document.querySelector(s);
for (const el of document.querySelectorAll("[data-t]")) el.textContent = ui[el.dataset.t];
$("#name").innerHTML = CV.nameLines.map((w) => `<span>${w}</span>`).join("");
$("#name").setAttribute("aria-label", CV.name);
$("#intro").textContent = CV.intro;
const dl = (rows) => rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
$("#facts").innerHTML = dl(CV.facts);
$("#work").innerHTML = CV.projects.map((p) => `
  <section class="ghost proj" id="${p.id}" data-step="${p.id}" aria-labelledby="t-${p.id}">
    <h2 id="t-${p.id}">${p.title}</h2><p>${p.kind}. ${p.text}</p>
    <dl>${dl(p.rows)}</dl>
    <p><a class="explore-link" href="project.html?p=${p.id}" data-p="${p.id}">${ui.explore} →</a></p>
  </section>`).join("");
$("#skills").innerHTML = dl(CV.skills);
$("#principles").innerHTML = CV.principles.map(([t, d]) => `<li><b>${t}.</b> ${d}</li>`).join("");
$("#mail").textContent = CV.email;
$("#mail").href = `mailto:${CV.email}`;
$("#links").innerHTML = CV.links.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("");
const sw = $("#lang");
sw.textContent = ui.switchTo;
sw.setAttribute("aria-label", ui.switchLabel);
sw.lang = ui.switchTo.toLowerCase();
sw.addEventListener("click", () => window.setLang(sw.lang));
initTyper($("#typer"), CV.phrases);
