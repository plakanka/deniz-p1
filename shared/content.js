// CV content, from her portfolio (portfolyo.pdf, Nov 2026), in Turkish (her own text, lightly shortened) and English.
// Plain script (not a module) so it also works when a page is opened straight from disk.
// Language: ?lang=tr|en in the URL, else the last choice (localStorage "lang"), else the browser's language.
(() => {
  const email = "edenizakkaya@gmail.com";
  const software = "AutoCAD, SketchUp, 3ds Max, D5 Render, V-Ray, Adobe Photoshop, Adobe Illustrator";
  // board palettes sampled from her renders (dark interiors, her red as the accent)
  const pal = {
    about: { bg: "#63534D", ink: "#F2EEEA", accent: "#D8D2CE" },
    kolektif: { bg: "#453C38", ink: "#F0EBE6", accent: "#D2464B" },
    hafele: { bg: "#373130", ink: "#F0EBE3", accent: "#D23A40" },
    atolye: { bg: "#3A3132", ink: "#EEEBE8", accent: "#B8323E" },
  };
  const sw = {
    kolektif: ["#837A72", "#453C38", "#2E2320", "#201B18", "#12100F"],
    hafele: ["#D2C9BA", "#6B655D", "#373130", "#271D1D", "#141312"],
    atolye: ["#828383", "#757575", "#61605F", "#3A3132", "#151313"],
  };

  const CVS = {
    en: {
      lang: "en",
      name: "Emine Deniz Akkaya",
      nameLines: ["emine", "deniz", "akkaya"],
      first: "emine deniz", last: "akkaya",
      role: "Interior architect", city: "",
      email, links: [],
      phrases: [
        "I'm Deniz.",
        "I'm an interior architect.",
        "I design spaces around experience, use and people.",
        "I care how a space feels, not only how it looks.",
        "Cinema, fashion, painting, music and dance feed my work.",
      ],
      intro:
        "I'm Deniz, a graduate of Interior Architecture and Environmental Design at Hacettepe University. " +
        "I see design as a way to build a meaningful relationship between people and space, and I focus " +
        "not only on how a space looks but on how it feels and is lived in.",
      facts: [
        ["Name", "Emine Deniz Akkaya"],
        ["Education", "Hacettepe University, Interior Architecture and Environmental Design"],
        ["Software", software],
        ["Languages", "English (B2)"],
        ["Email", email],
      ],
      projects: [
        {
          id: "kolektif", title: "GSF Collective Space", kind: "Collective space", img: "kolektif.jpg",
          text:
            "The unused courtyard of Hacettepe University's Faculty of Fine Arts gets new uses and becomes a " +
            "place where students make things together and meet. Fixed container structures are placed to " +
            "support the courtyard, linking indoor and outdoor space: a building about making, sharing and solidarity.",
          rows: [["Place", "Hacettepe University, Faculty of Fine Arts"], ["Drawings", "Façade analysis, concept diagram, floor plans, sections, exploded perspective"]],
          palette: pal.kolektif, swatches: sw.kolektif,
        },
        {
          id: "hafele", title: "Häfele kiosk and fair stand", kind: "Kiosk and fair stand", img: "hafele.jpg",
          text:
            "The brand's identity turned into a spatial experience, with the products shown clearly. The concept, " +
            "a hidden joint, comes from Häfele's fittings and the way they meet the mass they hold. Function, " +
            "looks and visitor experience shape a space for the meeting of brand and visitor.",
          rows: [["Client", "Häfele"], ["Concept", "Hidden joint"], ["Drawings", "Plans, elevations, sections for the kiosk and the stand"]],
          palette: pal.hafele, swatches: sw.hafele,
        },
        {
          id: "atolye", title: "Interdisciplinary art and design workshop", kind: "Workshop", img: "atolye.jpg",
          text:
            "Art and design never reach a final form; every new work reshapes them. So: transformation instead " +
            "of completion, permeability instead of fixed borders, constant rebuilding instead of a fixed order. " +
            "The space is a living organism that changes with the art.",
          rows: [["Drawings", "Ground and mezzanine plans, sections, tone study, stair details"]],
          palette: pal.atolye, swatches: sw.atolye,
        },
      ],
      skills: [
        ["Design", "Interior design, furniture design, spatial planning, concept development"],
        ["Drawing", "Technical drawing and detailing, construction drawings, presentation boards"],
        ["3D", "3D modelling and visualisation, material and furniture selection"],
        ["Software", software],
        ["Personal", "Teamwork, problem solving, attention to detail, time management, curiosity, creative thinking"],
        ["Language", "English (B2)"],
      ],
      principles: [
        ["How it feels", "Not only how a space looks, but how it feels and is lived in."],
        ["People and space", "Design is a way to build a meaningful relationship between the two."],
        ["Other arts", "Cinema, fashion, painting, music, dance and collage feed my approach."],
        ["Colour and texture", "Personal studies in colour, texture, composition and visual narrative give my projects new angles."],
      ],
      path: [["", "Interior Architecture and Environmental Design", "Hacettepe University"]],
      ui: {
        about: "About", work: "Work", path: "Skills", contact: "Contact", entrance: "Entrance",
        hint: "Scroll to walk through the house", studio: "Studio", archive: "Skills", exit: "Exit",
        skillsTitle: "Skills and approach", skills: "Skills", approach: "How I work",
        contactTitle: "Let's talk about a space.", switchTo: "TR", switchLabel: "Türkçe",
        explore: "Explore the project", clickHint: "Click the board to explore the project", scrollHint: "Keep scrolling for more renders",
        renders: "Renders", sheets: "Drawings and sheets", render: "Render", sheet: "Sheet", close: "Close", prev: "Previous", next: "Next",
        zoom: "Click the image to zoom in", leave: "Esc or scroll to leave", back: "Back to the house", nextProject: "Next project", of: "of",
      },
    },

    tr: {
      lang: "tr",
      name: "Emine Deniz Akkaya",
      nameLines: ["emine", "deniz", "akkaya"],
      first: "emine deniz", last: "akkaya",
      role: "İç mimar", city: "",
      email, links: [],
      phrases: [
        "Ben Deniz.",
        "İç mimarım.",
        "Mekanı deneyim, işlev ve kullanıcı etkileşimi üzerinden ele alıyorum.",
        "Bir mekanın nasıl hissettirdiğine odaklanıyorum.",
        "Sinema, moda, resim, müzik ve danstan besleniyorum.",
      ],
      intro:
        "Ben Deniz. Hacettepe Üniversitesi İç Mimarlık ve Çevre Tasarımı Bölümü mezunuyum. Tasarımı, kullanıcı " +
        "ile mekan arasında anlamlı bir ilişki kurma aracı olarak ele alıyorum; bir mekanın yalnızca nasıl " +
        "göründüğüne değil, nasıl hissettirdiğine ve deneyimlendiğine odaklanıyorum.",
      facts: [
        ["Ad", "Emine Deniz Akkaya"],
        ["Eğitim", "Hacettepe Üniversitesi, İç Mimarlık ve Çevre Tasarımı"],
        ["Programlar", software],
        ["Yabancı dil", "İngilizce (B2)"],
        ["E-posta", email],
      ],
      projects: [
        {
          id: "kolektif", title: "GSF Kolektif Mekan", kind: "Kolektif mekan", img: "kolektif.jpg",
          text:
            "Güzel Sanatlar Fakültesi'ndeki kullanılmayan avluya yeni işlevler yüklenerek öğrencilerin birlikte " +
            "üretebileceği ve sosyalleşebileceği bir mekana dönüştürülmesi amaçlanmıştır. Sabit konteyner yapılar " +
            "avlunun kullanımını destekleyecek şekilde konumlandırılarak kapalı ve açık alanlar arasında bir ilişki kurulmuştur.",
          rows: [["Yer", "Hacettepe Üniversitesi Güzel Sanatlar Fakültesi"], ["Çizimler", "Cephe analizi, kavram şeması, kat planları, kesitler, patlatılmış perspektif"]],
          palette: pal.kolektif, swatches: sw.kolektif,
        },
        {
          id: "hafele", title: "Häfele Kiosk ve Fuar Standı", kind: "Kiosk ve fuar standı", img: "hafele.jpg",
          text:
            "Markanın kurumsal kimliğinin mekansal bir deneyime dönüşmesi ve ürünlerin etkili bir şekilde " +
            "sergilenmesi amaçlanmıştır. Fonksiyonellik, estetik ve kullanıcı deneyimi doğrultusunda şekillenen " +
            "tasarım, marka ile kullanıcı arasındaki etkileşimi destekleyen bir mekan kurgusu sunar.",
          rows: [["Firma", "Häfele"], ["Kavram", "Gizli birleşim"], ["Çizimler", "Kiosk ve stand için planlar, görünüşler, kesitler"]],
          palette: pal.hafele, swatches: sw.hafele,
        },
        {
          id: "atolye", title: "Sanat ve Tasarım Disiplinlerarası Atölye", kind: "Atölye", img: "atolye.jpg",
          text:
            "Sanat ve tasarımın nihai bir biçime ulaşmayan, her üretimle yeniden şekillenen doğasından yola " +
            "çıkılmıştır. Tamamlanmışlık yerine dönüşüm, kesin sınırlar yerine geçirgenlik, sabit bir düzen yerine " +
            "sürekli yeniden yapılanma esas alınmış; mekan, sanatla birlikte değişen yaşayan bir organizma olarak yorumlanmıştır.",
          rows: [["Çizimler", "Zemin ve asma kat planları, kesitler, leke çalışması, merdiven detayları"]],
          palette: pal.atolye, swatches: sw.atolye,
        },
      ],
      skills: [
        ["Tasarım", "İç mekan tasarımı, mobilya tasarımı, mekansal planlama, konsept geliştirme"],
        ["Çizim", "Teknik çizim ve detay çözümü, uygulama projesi hazırlama, sunum ve pafta hazırlama"],
        ["3D", "3D modelleme ve görselleştirme, malzeme ve mobilya seçimi"],
        ["Program", software],
        ["Kişisel", "Takım çalışması, problem çözme, detay odaklı çalışma, zaman yönetimi, araştırma ve öğrenmeye açıklık, yaratıcı düşünme"],
        ["Dil", "İngilizce (B2)"],
      ],
      principles: [
        ["Nasıl hissettirdiği", "Bir mekanın yalnızca nasıl göründüğü değil, nasıl hissettirdiği ve deneyimlendiği."],
        ["Kullanıcı ve mekan", "Tasarım, ikisi arasında anlamlı bir ilişki kurma aracıdır."],
        ["Diğer sanatlar", "Sinema, moda, resim, müzik, dans ve kolaj tasarım yaklaşımımı besliyor."],
        ["Renk ve doku", "Renk, doku, kompozisyon ve görsel anlatı üzerine kişisel çalışmalarım projelerime farklı bakış açıları kazandırıyor."],
      ],
      path: [["", "İç Mimarlık ve Çevre Tasarımı", "Hacettepe Üniversitesi"]],
      ui: {
        about: "Hakkımda", work: "Projeler", path: "Yetkinlikler", contact: "İletişim", entrance: "Giriş",
        hint: "Evin içinde yürümek için kaydırın", studio: "Stüdyo", archive: "Yetkinlikler", exit: "Çıkış",
        skillsTitle: "Yetkinlikler ve yaklaşım", skills: "Yetkinlikler", approach: "Yaklaşımım",
        contactTitle: "Bir mekan üzerine konuşalım.", switchTo: "EN", switchLabel: "English",
        explore: "Projeyi incele", clickHint: "Projeyi incelemek için panoya tıklayın", scrollHint: "Diğer görseller için kaydırmaya devam edin",
        renders: "Görselleştirmeler", sheets: "Çizimler ve paftalar", render: "Görselleştirme", sheet: "Pafta", close: "Kapat", prev: "Önceki", next: "Sonraki",
        zoom: "Yakınlaştırmak için görsele tıklayın", leave: "Çıkmak için Esc veya kaydırın", back: "Eve dön", nextProject: "Sonraki proje", of: "/",
      },
    },
  };

  // every render and portfolio sheet per project (shared/img/<id>/rNN.jpg, sN.jpg; t-… are thumbnails). [kind, file, width, height]
  const G = {
    kolektif: { r: [[1493, 1054], [1447, 1006], [1672, 941], [1800, 801], [1491, 1055], [1494, 1053], [1492, 1054], [1494, 1053], [1492, 1054], [1494, 1052], [1489, 1056], [1494, 1053], [1484, 1060], [1494, 1053]],
      s: { en: ["Site, concept and façade", "Floor plans and renders", "Sections, exploded perspective and renders"],
           tr: ["Vaziyet, kavram ve cephe", "Kat planları ve görselleştirmeler", "Kesitler, patlatılmış perspektif ve görselleştirmeler"] } },
    hafele: { r: [[1800, 1274], [1552, 1076], [1800, 1013], [964, 959], [967, 1022], [971, 1018], [1309, 1313], [1190, 674], [1800, 1038], [1800, 1199]],
      s: { en: ["Design process: the hidden joint", "Kiosk: drawings and renders", "Fair stand: drawings and renders"],
           tr: ["Tasarım süreci: gizli birleşim", "Kiosk: teknik çizimler ve görselleştirmeler", "Fuar standı: teknik çizimler ve görselleştirmeler"] } },
    atolye: { r: [[1444, 1089], [1688, 932], [1470, 1070], [1336, 1177], [1402, 1122], [1402, 1122], [1672, 941], [1667, 943], [1400, 1104]],
      s: { en: ["Design process", "Plans, sections and tone study", "Renders and stair details"],
           tr: ["Tasarım süreci", "Teknik çizimler ve leke çalışması", "Görselleştirmeler ve merdiven detayları"] } },
  };
  for (const l in CVS) for (const p of CVS[l].projects) {
    const g = G[p.id], nm = (f) => ({ src: `${p.id}/${f}.jpg`, thumb: `${p.id}/t-${f}.jpg` });
    p.gallery = [
      ...g.r.map(([w, h], i) => ({ kind: "render", w, h, ...nm(`r${String(i + 1).padStart(2, "0")}`) })),
      ...g.s[l].map((caption, i) => ({ kind: "sheet", w: 3200, h: 2345, caption, ...nm(`s${i + 1}`) })),
    ];
  }

  let lang = new URLSearchParams(location.search).get("lang");
  try {
    if (lang in CVS) localStorage.setItem("lang", lang);
    else lang = localStorage.getItem("lang");
  } catch {}
  if (!(lang in CVS)) lang = /^tr\b/i.test(navigator.language || "") ? "tr" : "en";
  window.CVS = CVS;
  window.CV = CVS[lang];
  document.documentElement.lang = lang;
  // switch language: remember it and reload (the 3D boards are painted from this text)
  window.setLang = (l) => {
    try { localStorage.setItem("lang", l); } catch {}
    const u = new URL(location.href); u.searchParams.delete("lang");
    location.replace(u.href);
  };
})();
