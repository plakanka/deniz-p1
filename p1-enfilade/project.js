import { projectHTML, wireGallery, openViewer } from "./explore.js";

/* D4: a project's own page (project.html?p=<id>), built from content.js like the boards in the house. */
const CV = window.CV, ui = CV.ui, IMG = "../shared/img/";
const $ = (s) => document.querySelector(s);
const ps = CV.projects, i = ps.findIndex((p) => p.id === new URLSearchParams(location.search).get("p"));
if (i < 0) location.replace("./");
const p = ps[i], next = ps[(i + 1) % ps.length];
document.title = `${p.title} · ${CV.name}`;

// back to the house: the browser's back keeps the scroll position (and so the camera) where it was
const back = $("#back");
back.textContent = `← ${ui.back}`;
back.href = `./#${p.id}`;
back.addEventListener("click", (e) => {
  try { if (document.referrer && new URL(document.referrer).pathname.replace(/index\.html$/, "") === location.pathname.replace(/project\.html$/, "")) { e.preventDefault(); history.back(); } } catch {}
});
$("#pp-name").textContent = CV.name;
const sw = $("#lang");
sw.textContent = ui.switchTo; sw.setAttribute("aria-label", ui.switchLabel);
sw.addEventListener("click", () => window.setLang(ui.switchTo.toLowerCase()));

const hero = p.gallery[0];
$("#pp").innerHTML = `
  <section class="pp-hero" style="background-image:url('${IMG + hero.src}')" aria-label="${p.title}">
    <div class="pp-hero-in"><p class="s-kind">${p.kind}</p><h1>${p.title}</h1></div>
  </section>
  <article class="pp-body">${projectHTML(p, { heading: "h2", sizes: ["(max-width: 760px) 100vw, 33vw", "min(1180px, 100vw)"] })}</article>
  <nav class="pp-next" aria-label="${ui.nextProject}">
    <a href="project.html?p=${next.id}" style="background-image:url('${IMG + next.gallery[0].thumb}')">
      <small>${ui.nextProject}</small><b>${next.title}</b></a>
    <a class="pp-home" href="./#${p.id}">← ${ui.back}</a>
  </nav>`;
$("#pp .s-title").classList.add("pp-hidden-title");        // the hero carries the title; keep it for structure only
wireGallery($("#pp"), p);
$(".pp-hero").addEventListener("click", () => openViewer(p.gallery, 0, { title: p.title }));
