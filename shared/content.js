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
      },
    },
  };

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
