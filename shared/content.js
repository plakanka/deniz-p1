// Placeholder CV content shared by every prototype. Replace with real content later.
// Plain script (not a module) so it also works when a page is opened straight from disk.
window.CV = {
  name: "Deniz Yılmaz",
  first: "deniz",
  last: "yılmaz",
  role: "Interior architect",
  city: "İstanbul",
  email: "hello@deniz-placeholder.com",
  links: [
    { label: "Instagram", href: "#" },
    { label: "Behance", href: "#" },
    { label: "LinkedIn", href: "#" },
  ],

  // F03 typewriter phrases (first one is the one search engines / screen readers get)
  phrases: [
    "I'm Deniz.",
    "I'm an interior architect.",
    "I design rooms people slow down in.",
    "I sketch by hand, then model in 3D.",
    "I care about light, joints and storage.",
    "I'm looking for my first studio.",
  ],

  intro:
    "Interior architect, graduated 2026. I like small spaces that have to work hard, " +
    "materials you want to touch, and drawings that a builder can actually read.",

  facts: [
    ["Education", "B.Sc. Interior Architecture, Mimar Sinan FAU"],
    ["Graduated", "June 2026"],
    ["Based in", "İstanbul, open to relocate"],
    ["Software", "AutoCAD, SketchUp, Rhino, Enscape, Photoshop"],
    ["Languages", "Turkish, English (C1), German (A2)"],
    ["Looking for", "Junior interior architect role"],
  ],

  projects: [
    {
      id: "flat",
      title: "Herringbone flat",
      kind: "Residential renovation",
      year: "2025",
      area: "68 m²",
      place: "Kadıköy, İstanbul",
      role: "Studio project, solo",
      img: "living.jpg",
      text:
        "A 1970s two-room flat opened into one long living space. The original oak " +
        "herringbone floor was kept and carried into the old corridor, so the plan reads " +
        "as one room. A full-height storage wall hides the radiator and the TV.",
      // F04-B1 colours sampled from the photo
      palette: { bg: "#D3C8B3", ink: "#2C3337", accent: "#4F6E77" },
      swatches: ["#E1E1DC", "#D3C8B3", "#B09570", "#4F6E77", "#2C3337"],
    },
    {
      id: "kitchen",
      title: "Family kitchen",
      kind: "Kitchen & dining",
      year: "2025",
      area: "32 m²",
      place: "Bursa",
      role: "Internship, assisted",
      img: "kitchen.jpg",
      text:
        "A kitchen for a family of five that cooks every day. The island is the table: " +
        "the worktop drops to dining height at one end, so homework and cooking happen " +
        "side by side. Everything daily sits between knee and shoulder height.",
      palette: { bg: "#6E8487", ink: "#F4F2EC", accent: "#E8E4DC" },
      swatches: ["#E8E4DC", "#D6C8B7", "#A4A29B", "#6E8487", "#4D5257"],
    },
    {
      id: "bar",
      title: "Lantern bar",
      kind: "Hospitality concept",
      year: "2026",
      area: "120 m²",
      place: "Karaköy, İstanbul",
      role: "Graduation project",
      img: "cafe.jpg",
      text:
        "A narrow bar in a 19th-century warehouse. The brick was cleaned, not covered; a " +
        "row of opal globes leads the eye from the door to the back counter, and the " +
        "ceiling mouldings are lit from below instead of repainted.",
      palette: { bg: "#313131", ink: "#E4E4E4", accent: "#D0D0D0" },
      swatches: ["#D0D0D0", "#A2A2A2", "#595959", "#313131"],
    },
  ],

  principles: [
    ["Light first", "I place windows, lamps and reflections before furniture. A room is mostly what light does to it."],
    ["Keep what works", "Old floors, brick, mouldings: renovating starts with a list of what stays."],
    ["Storage is architecture", "Built-in storage shapes the room; it is drawn with the walls, not added later."],
    ["Draw for the builder", "Details and joints are part of the design. If it can't be built cleanly, it isn't done."],
  ],

  path: [
    ["2022", "Started B.Sc. Interior Architecture", "Mimar Sinan Fine Arts University"],
    ["2024", "Summer internship", "Atölye Kare, site measurements and as-built drawings"],
    ["2025", "Internship", "Nokta Design Studio, kitchen and residential details"],
    ["2025", "Workshop", "Timber joinery, one week, hands-on"],
    ["2026", "Graduation project", "Lantern bar, Karaköy"],
    ["2026", "Graduated", "Looking for a first role"],
  ],
};
