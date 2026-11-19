import { initTyper } from "../shared/kit.js";
import { openSheet } from "./explore.js";

/* The page text: the hero plus screen-reader copies of what hangs on the walls. Runs before main.js (and without it,
   when there is no WebGL), so the CV is always readable. Language comes from content.js (TR / EN). */
const CV = window.CV, ui = CV.ui;
const $ = (s) => document.querySelector(s);
// the content is our own, but escape it anyway so a stray "<" or "&" in a text can never break the page
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
for (const el of document.querySelectorAll("[data-t]")) el.textContent = ui[el.dataset.t];
$("#name").innerHTML = CV.nameLines.map((w) => `<span>${esc(w)}</span>`).join("");
$("#name").setAttribute("aria-label", CV.name);
$("#intro").textContent = CV.intro;
const dl = (rows) => rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
$("#facts").innerHTML = dl(CV.facts);
$("#work").innerHTML = CV.projects.map((p) => `
  <section class="ghost" id="${p.id}" data-step="${p.id}" aria-labelledby="t-${p.id}">
    <h2 id="t-${p.id}">${esc(p.title)}</h2><p>${esc(p.kind)}. ${esc(p.text)}</p>
    <dl>${dl(p.rows)}</dl>
    <p><button class="explore-link" type="button" data-p="${p.id}">${esc(ui.explore)} →</button></p>
  </section>`).join("");
$("#skills").innerHTML = dl(CV.skills);
$("#principles").innerHTML = CV.principles.map(([t, d]) => `<li><b>${esc(t)}.</b> ${esc(d)}</li>`).join("");
$("#mail").textContent = CV.email;
$("#mail").href = `mailto:${CV.email}`;
$("#links").innerHTML = CV.links.filter((l) => /^(https:|mailto:)/.test(l.href)).map((l) => `<li><a href="${esc(l.href)}" rel="noopener">${esc(l.label)}</a></li>`).join("");
const sw = $("#lang");
sw.textContent = ui.switchTo;
sw.setAttribute("aria-label", ui.switchLabel);
sw.lang = ui.switchTo.toLowerCase();
sw.addEventListener("click", () => window.setLang(sw.lang));
// "Explore the project" (in these sections and in the phone card, which copies them) opens the project sheet;
// this works without WebGL too
addEventListener("click", (e) => {
  const b = e.target.closest(".explore-link");
  const p = b && CV.projects.find((x) => x.id === b.dataset.p);
  if (p) openSheet(p);
});
initTyper($("#typer"), CV.phrases);
