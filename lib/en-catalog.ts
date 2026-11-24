export type EnEntry = { name?: string; summary?: string; sizeNote?: string };

/** English display text for objects whose stored copy is Dutch. Star names stay as stored, except the three Dutch forms. */
export const enCatalog: Record<string, EnEntry> = {
  zon: {
    name: "Sun",
    summary: "Our star. The sphere is true size; from Earth it looks small, as it does in the sky.",
  },
  mercurius: {
    name: "Mercury",
    summary: "The innermost planet. Small, close to the Sun, with no moon in this view.",
  },
  venus: {
    name: "Venus",
    summary: "A thick blanket of cloud. The orbit is almost a circle.",
  },
  aarde: {
    name: "Earth",
    summary: "You start here. The position follows the Earth-Moon barycenter, not a point on the surface.",
  },
  mars: {
    name: "Mars",
    summary: "The red neighbor. The two small moons are left off the planet itself; beside it they disappear. Phobos and Deimos are still in the list.",
  },
  jupiter: {
    name: "Jupiter",
    summary: "The largest planet. The four large moons travel with it.",
  },
  saturnus: {
    name: "Saturn",
    summary:
      "The rings belong to this planet and do not orbit the Sun on their own. Titan and the other large moons do.",
  },
  uranus: {
    name: "Uranus",
    summary: "An ice giant tipped almost on its side. This view shows the planet, not the thin rings.",
  },
  neptunus: {
    name: "Neptune",
    summary: "The outermost large planet. Triton orbits retrograde with it.",
  },
  pluto: {
    name: "Pluto",
    summary:
      "A dwarf planet in the Kuiper belt. The elements are osculating at J2000 and drift over long spans.",
  },
  maan: {
    name: "Moon",
    summary:
      "Earth's moon. The elements are osculating at J2000, so the place on an arbitrary day is an approximation.",
  },
  io: {
    name: "Io",
    summary: "The innermost large moon of Jupiter. Volcanic, shown here only as a sphere.",
  },
  europa: {
    name: "Europa",
    summary: "An icy moon of Jupiter. The ocean underneath is not a separate layer in this view.",
  },
  ganymedes: {
    name: "Ganymede",
    summary: "The largest moon in the solar system, larger than Mercury.",
  },
  callisto: {
    name: "Callisto",
    summary: "Outermost of Jupiter's four large moons, old and cratered.",
  },
  titan: {
    name: "Titan",
    summary: "A moon of Saturn with a thick atmosphere. The lakes are not visible at this scale.",
  },
  triton: {
    name: "Triton",
    summary: "Neptune's largest moon. The orbit runs backward, against the planet's spin.",
  },
  phobos: {
    summary:
      "A small moon of Mars, elongated. The sphere is a mean radius of 11 km, not the true shape. Elements osculating at J2000, JPL Horizons.",
  },
  deimos: {
    summary:
      "The smaller moon of Mars, also not round. The sphere is a mean radius of 6 km. Elements osculating at J2000, JPL Horizons.",
  },
  enceladus: {
    summary:
      "An icy moon of Saturn. The south-polar plumes are not visible at this scale. Elements osculating at J2000, JPL Horizons.",
  },
  tethys: {
    summary: "An icy moon of Saturn, inside the orbit of Dione. Elements osculating at J2000, JPL Horizons.",
  },
  dione: {
    summary: "A moon of Saturn, just outside Tethys. Elements osculating at J2000, JPL Horizons.",
  },
  rhea: {
    summary: "Saturn's second moon, after Titan. Elements osculating at J2000, JPL Horizons.",
  },
  iapetus: {
    summary:
      "A distant moon of Saturn, with a light half and a dark half. Shown here in one color. Elements osculating at J2000, JPL Horizons.",
  },
  ariel: {
    summary:
      "A moon of Uranus. The radius is the mean of a nearly round shape. Elements osculating at J2000, JPL Horizons.",
  },
  umbriel: {
    summary: "A dark moon of Uranus. Elements osculating at J2000, JPL Horizons.",
  },
  titania: {
    summary: "The largest moon of Uranus. Elements osculating at J2000, JPL Horizons.",
  },
  oberon: {
    summary: "The outer large moon of Uranus. Elements osculating at J2000, JPL Horizons.",
  },
  charon: {
    summary:
      "Pluto's large moon, a bit over half Pluto's size. The barycenter lies outside Pluto. Elements osculating at J2000, JPL Horizons.",
  },
  "saturnus-ringen": {
    name: "Rings of Saturn",
    summary:
      "The main rings, from the inner edge of the C ring to the outer edge of the A ring, with the Cassini Division between them. They belong to Saturn and have no orbit of their own around the Sun.",
    sizeNote: "from 74,658 to 136,775 km from the center of Saturn",
  },
  planetoidengordel: {
    name: "Asteroid belt",
    summary: "The real belt between Mars and Jupiter. The dots are a sketch, not measured rocks one by one.",
    sizeNote: "roughly 2.2–3.3 AU from the Sun",
  },
  kuipergordel: {
    name: "Kuiper belt",
    summary: "Icy bodies beyond Neptune, Pluto included. The dots are a sketch of the belt.",
    sizeNote: "roughly 30–50 AU from the Sun",
  },
  oortwolk: {
    name: "Oort cloud",
    summary:
      "A supposed cloud of comets. Never seen directly. The shell is a model, roughly two thousand to one hundred thousand AU.",
    sizeNote: "model, roughly 2,000–100,000 AU",
  },
  melkweg: {
    name: "Milky Way",
    summary:
      "Our galaxy. You are inside it. The disk in this view is a simple model of a shape we do see.",
    sizeNote: "stellar disk about 100,000 light-years across",
  },
  "sagittarius-a": {
    summary:
      "The black hole at the center. Stars around it and the shadow have been observed. The sphere here is a marker: the horizon is about 12.7 million km in radius.",
  },
  "sagittarius-a-binnenste": {
    name: "Interior of Sagittarius A*",
    summary: "Below the horizon of observation. Nobody has an image of it. The core dot is a model, not a measurement.",
    sizeNote: "not measured; inside a horizon of about 12.7 million km radius",
  },
  "donkere-materie": {
    name: "Dark-matter halo",
    summary:
      "The halo that, in the models, holds the Milky Way together. Not seen directly. Radius here about 200 kiloparsecs.",
    sizeNote: "model halo, radius about 650,000 light-years",
  },
  "grote-magelhaense-wolk": {
    name: "Large Magellanic Cloud",
    summary: "A neighboring galaxy in the southern sky, visible to the naked eye from dark places on Earth.",
  },
  "kleine-magelhaense-wolk": {
    name: "Small Magellanic Cloud",
    summary: "The smaller Magellanic Cloud, a little farther than the large one.",
  },
  andromeda: {
    summary: "The nearest large galaxy. A faint patch in a dark sky, on its way toward us.",
  },
  driehoeknevel: {
    name: "Triangulum",
    summary: "The third large member of the Local Group, smaller than Andromeda and the Milky Way.",
  },
  virgo: {
    name: "Virgo Cluster",
    summary: "The nearest large cluster, around M87. Distance about 54 million light-years.",
  },
  fornax: {
    name: "Fornax Cluster",
    summary: "A cluster in the southern sky, a little farther than Virgo. Distance here rounded to 62 million light-years.",
  },
  centaurus: {
    name: "Centaurus Cluster",
    summary: "A cluster toward the Great Attractor. Distance rounded to 170 million light-years.",
  },
  perseus: {
    name: "Perseus Cluster",
    summary: "A massive cluster. Distance rounded to 240 million light-years.",
  },
  coma: {
    name: "Coma Cluster",
    summary: "A rich cluster in Coma Berenices. Distance rounded to 320 million light-years.",
  },
  "grote-aantrekker": {
    name: "Great Attractor",
    summary:
      "The place nearby galaxies are flowing toward. The center is inferred, not a sharp picture. Direction and distance are rough.",
    sizeNote: "no sharp edge; on the order of 200 million light-years away",
  },
  laniakea: {
    name: "Laniakea boundary",
    summary:
      "A supercluster whose boundary is a model: the region that flows together toward the Great Attractor. The Milky Way sits at the edge. About 520 million light-years across.",
    sizeNote: "model boundary, about 520 million light-years across",
  },
  "kosmisch-web": {
    name: "Cosmic web",
    summary:
      "Filaments of galaxies and gas. The threads here connect a few real clusters. It is a sketch, not a map of every filament.",
    sizeNote: "no single size; the web fills the universe at this scale",
  },
  "donkere-energie": {
    name: "Dark energy",
    summary:
      "Not a place. A model for the accelerated expansion, everywhere in empty space. The haze is only a way to show that.",
    sizeNote: "no place and no edge",
  },
  cmb: {
    name: "Cosmic microwave background",
    summary:
      "The oldest radiation we measure, as a shell around us. The glow has been observed. The distance of 46.5 billion light-years comes from the cosmological model.",
    sizeNote: "shell at 46.5 billion light-years",
  },
  rand: {
    name: "Edge of the observable universe",
    summary:
      "How far light has been able to reach us since the Big Bang, in the usual model. Not a wall. The same shell as the background radiation, labeled as a boundary.",
    sizeNote: "model radius 46.5 billion light-years",
  },
};

export const enStarName: Record<string, string> = {
  "hip-91262": "Vega",
  "hip-27989": "Betelgeuse",
  "hip-11767": "Polaris",
};
