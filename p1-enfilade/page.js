import { initTyper } from "../shared/kit.js";

/* The page text: the hero plus screen-reader copies of what hangs on the walls. Runs before main.js (and without it,
   when there is no WebGL), so the CV is always readable. */
const CV = window.CV;
const $ = (s) => document.querySelector(s);
$("#first").textContent = CV.first;
$("#last").textContent = CV.last;
$("#intro").textContent = CV.intro;
$("#facts").innerHTML = CV.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
$("#work").innerHTML = CV.projects.map((p) => `
  <section class="ghost" id="${p.id}" data-step="${p.id}" aria-labelledby="t-${p.id}">
    <h2 id="t-${p.id}">${p.title}</h2><p>${p.kind}, ${p.year}. ${p.text}</p>
    <p>Area ${p.area}. Location ${p.place}. Role: ${p.role}.</p>
  </section>`).join("");
$("#path-list").innerHTML = CV.path.map(([y, w, wh]) => `<li>${y}: ${w}, ${wh}</li>`).join("");
$("#principles").innerHTML = CV.principles.map(([t, d]) => `<li><b>${t}.</b> ${d}</li>`).join("");
$("#mail").textContent = CV.email;
$("#mail").href = `mailto:${CV.email}`;
$("#links").innerHTML = CV.links.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("");
initTyper($("#typer"), CV.phrases);
