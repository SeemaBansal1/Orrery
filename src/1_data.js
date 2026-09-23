'use strict';
/* =========================================================
   ORRERY — data
   Figures: NASA Planetary Fact Sheet. Moon counts: NASA, mid-2026.
   ========================================================= */
const DEG = Math.PI / 180;
const C = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

const GAS = {
  Nitrogen: '#7fa7ff', Oxygen: '#8ff0ff', 'Carbon dioxide': '#ffb45e', Hydrogen: '#e9edf5', Helium: '#c8a6ff',
  Methane: '#5fe0c6', Argon: '#9aa3b8', Sodium: '#ffd35a', Potassium: '#ff8fb1', Other: '#5b6378'
};

const BODIES = [
  {
    id: 'sun', name: 'Sun', order: 0, kind: 'Yellow dwarf star', accent: '#FFB45E',
    orbit: 0, r: 10, dKm: 1392700, au: 0, distM: 0, massE: 333000, massKg: [1.99, 30], g: 274,
    dayLabel: '≈27 Earth days', daySub: 'Spins faster at the equator (≈25 days) than the poles', dayH: 609,
    spinH: 609, yearD: 8.4e10, yearLabel: '≈230 million years', yearSub: 'One trip around the centre of the Milky Way',
    tempC: 5500, tempLabel: '5,500 °C at the surface', moons: 8, tilt: 7.25,
    pressure: 'Plasma — no solid surface',
    atmo: [['Hydrogen', 73], ['Helium', 25], ['Other', 2]], atmoTitle: 'Composition by mass',
    overview: 'A middle-aged yellow dwarf star, the Sun holds 99.8% of the Solar System’s mass. Fusion in its core converts about 4 million tonnes of matter into energy every second.',
    facts: [
      'Sunlight leaving the surface reaches Earth about 8 minutes and 20 seconds later.',
      'Roughly 1.3 million Earths could fit inside the Sun.',
      'Its outer atmosphere, the corona, is over 1 million °C — hundreds of times hotter than the visible surface.',
      'Parker Solar Probe has flown closer to the Sun than any other spacecraft.'
    ],
    oneLiner: 'The star at the centre of it all.',
    moonsList: []
  },
  {
    id: 'mercury', name: 'Mercury', order: 1, kind: 'Terrestrial planet', accent: '#CDBBA7',
    orbit: 26, r: 0.9, dKm: 4879, au: 0.39, distM: 57.9, massE: 0.055, massKg: [3.30, 23], g: 3.7,
    dayH: 4222.6, dayLabel: '176 Earth days', daySub: 'Sunrise to sunrise; it spins once every 59 days',
    spinH: 1407.6, yearD: 88, yearLabel: '88 Earth days', tempC: 167, tempRange: [-180, 430],
    moons: 0, tilt: 0.03, pressure: 'Almost none — a thin exosphere',
    atmo: [['Oxygen', 42], ['Sodium', 29], ['Hydrogen', 22], ['Helium', 6], ['Potassium', 0.5], ['Other', 0.5]], atmoTitle: 'Exosphere',
    overview: 'The smallest planet and the closest to the Sun, Mercury is a scorched, cratered world with almost no atmosphere to hold heat. It races around the Sun faster than any other planet.',
    facts: [
      'Its day is longer than its year: one sunrise to the next takes 176 Earth days, while one orbit takes 88.',
      'With almost no atmosphere, the surface swings from about 430 °C by day to −180 °C at night.',
      'Craters near its poles that never see sunlight hold water ice.',
      'Mercury is slowly shrinking as its iron core cools, wrinkling the crust into cliffs hundreds of kilometres long.'
    ],
    oneLiner: 'A scorched, cratered world closest to the Sun.',
    bake: { type: 0, seed: 1.7, cols: [C('#4a4540'), C('#9c948a'), C('#c9c2b6'), C('#2c2926')] }, fallback: C('#8a847b'),
    angle0: 0.8, moonsList: []
  },
  {
    id: 'venus', name: 'Venus', order: 2, kind: 'Terrestrial planet', accent: '#F2C879',
    orbit: 38, r: 1.55, dKm: 12104, au: 0.72, distM: 108.2, massE: 0.815, massKg: [4.87, 24], g: 8.9,
    dayH: 2802, dayLabel: '117 Earth days', daySub: 'Spins backwards, once every 243 Earth days',
    spinH: -5832.5, yearD: 224.7, yearLabel: '225 Earth days', tempC: 464,
    moons: 0, tilt: 177.4, pressure: '92 × Earth’s surface pressure',
    atmo: [['Carbon dioxide', 96.5], ['Nitrogen', 3.5]], atmoTitle: 'Atmosphere',
    overview: 'Wrapped in thick clouds of sulfuric acid, Venus is the hottest planet in the Solar System. Its dense carbon-dioxide atmosphere traps heat in a runaway greenhouse effect.',
    facts: [
      'Venus spins backwards compared with most planets, so the Sun rises in the west.',
      'One rotation takes 243 Earth days — longer than its 225-day year.',
      'Surface pressure is about 92 times Earth’s, like being 900 m deep in the ocean.',
      'It is hotter than Mercury despite being nearly twice as far from the Sun.'
    ],
    oneLiner: 'The hottest planet, hidden under acid clouds.',
    bake: { type: 1, seed: 4.1, cols: [C('#c9a064'), C('#f5e2b6'), C('#a87a44'), C('#fff5dc')] }, fallback: C('#e2c48c'),
    atmoCol: [1.0, 0.86, 0.58], sunset: [1.0, 0.7, 0.4], atmoAmt: 1.15, shell: 1.1, angle0: 2.4, moonsList: []
  },
  {
    id: 'earth', name: 'Earth', order: 3, kind: 'Terrestrial planet', accent: '#6FB7FF',
    orbit: 52, r: 1.65, dKm: 12756, au: 1.0, distM: 149.6, massE: 1, massKg: [5.97, 24], g: 9.8,
    dayH: 24, dayLabel: '24 hours', spinH: 23.93, yearD: 365.25, yearLabel: '365.25 days', tempC: 15, tempRange: [-89, 57],
    moons: 1, tilt: 23.4, pressure: '1 bar at sea level',
    atmo: [['Nitrogen', 78.1], ['Oxygen', 20.9], ['Argon', 0.9], ['Other', 0.1]], atmoTitle: 'Atmosphere',
    overview: 'Our home is the only world known to host life, with liquid water across most of its surface and air rich in oxygen. It is the largest of the four rocky planets.',
    facts: [
      'About 71% of the surface is covered by water.',
      'Earth is the densest planet in the Solar System.',
      'The Moon steadies Earth’s axial tilt, helping keep the climate stable over long periods.',
      'Earth’s magnetic field deflects the solar wind and lights up the auroras.'
    ],
    oneLiner: 'The only world known to host life.',
    bake: { type: 2, seed: 3.3, cols: [C('#000000'), C('#000000'), C('#000000'), C('#000000')] }, fallback: C('#2c5a8a'),
    atmoCol: [0.38, 0.66, 1.0], sunset: [1.0, 0.5, 0.28], atmoAmt: 1.0, shell: 1.09, clouds: true, night: true, spec: 1,
    angle0: 4.0,
    moonsList: [{ name: 'Moon', r: 0.27, d: 3.4, inc: 5, a: [0.62, 0.61, 0.6], b: [0.33, 0.32, 0.31], note: 'Earth’s only natural satellite, 3,474 km across. Its gravity drives the ocean tides.' }]
  },
  {
    id: 'mars', name: 'Mars', order: 4, kind: 'Terrestrial planet', accent: '#FF7A4D',
    orbit: 67, r: 1.15, dKm: 6792, au: 1.52, distM: 227.9, massE: 0.107, massKg: [6.42, 23], g: 3.7,
    dayH: 24.66, dayLabel: '24 h 39 min', spinH: 24.62, yearD: 687, yearLabel: '687 Earth days', tempC: -65, tempRange: [-153, 20],
    moons: 2, tilt: 25.2, pressure: '0.6% of Earth’s surface pressure',
    atmo: [['Carbon dioxide', 95.3], ['Nitrogen', 2.6], ['Argon', 1.9], ['Other', 0.2]], atmoTitle: 'Atmosphere',
    overview: 'A cold desert world with the tallest volcano and deepest canyon known, Mars once had rivers and lakes. Today robots roam its rusty surface searching for signs of ancient life.',
    facts: [
      'Olympus Mons rises about 22 km — roughly 2.5 times the height of Mount Everest.',
      'Valles Marineris is a canyon system about 4,000 km long.',
      'Iron-oxide dust makes the ground red, yet sunsets on Mars glow blue.',
      'Dust storms can grow to wrap the entire planet for weeks.'
    ],
    oneLiner: 'A rusty desert with the Solar System’s tallest volcano.',
    bake: { type: 3, seed: 7.9, cols: [C('#4a2216'), C('#b85a2c'), C('#e0a070'), C('#000000')] }, fallback: C('#b3582f'),
    atmoCol: [1.0, 0.6, 0.42], sunset: [0.6, 0.75, 1.0], atmoAmt: 0.5, shell: 1.05, angle0: 5.5,
    moonsList: [
      { name: 'Phobos', r: 0.08, d: 1.9, inc: 1, a: [0.45, 0.4, 0.36], b: [0.24, 0.21, 0.19], note: 'The larger moon, about 22 km across, slowly spiralling in toward Mars.' },
      { name: 'Deimos', r: 0.06, d: 2.9, inc: 2, a: [0.55, 0.5, 0.44], b: [0.3, 0.27, 0.24], note: 'A 12 km moon that looks like a bright star from the Martian surface.' }
    ]
  },
  {
    id: 'jupiter', name: 'Jupiter', order: 5, kind: 'Gas giant', accent: '#E8B98A',
    orbit: 112, r: 5.6, dKm: 142984, au: 5.2, distM: 778.5, massE: 317.8, massKg: [1.90, 27], g: 23.1,
    dayH: 9.93, dayLabel: '9 h 56 min', spinH: 9.93, yearD: 4331, yearLabel: '11.9 Earth years', tempC: -110,
    moons: 115, tilt: 3.1, pressure: 'No solid surface',
    atmo: [['Hydrogen', 89.8], ['Helium', 10.2]], atmoTitle: 'Atmosphere',
    overview: 'The largest planet is a gas giant more than twice as massive as all the other planets combined. Its striped clouds hide enormous storms, including one wider than Earth.',
    facts: [
      'The Great Red Spot is a storm wider than Earth that has raged for centuries.',
      'Jupiter has the shortest day of any planet — under 10 hours.',
      'Its magnetosphere is so vast that its tail stretches beyond the orbit of Saturn.',
      'Ganymede, the largest moon in the Solar System, is bigger than the planet Mercury.'
    ],
    oneLiner: 'The giant, with a storm wider than Earth.',
    bake: { type: 4, seed: 2.2, cols: [C('#efe0c2'), C('#c9976a'), C('#8a5a3a'), C('#f6f1e6')] }, fallback: C('#cfa77f'),
    atmoCol: [0.98, 0.86, 0.7], sunset: [0.9, 0.6, 0.4], atmoAmt: 0.38, shell: 1.045, wrap: 0.12, angle0: 1.3,
    moonsList: [
      { name: 'Io', r: 0.09, d: 2.3, inc: 0, a: [0.95, 0.85, 0.4], b: [0.75, 0.45, 0.15], note: 'The most volcanically active body in the Solar System.' },
      { name: 'Europa', r: 0.08, d: 2.9, inc: 0.5, a: [0.92, 0.88, 0.8], b: [0.6, 0.45, 0.32], note: 'An ice shell over a salty global ocean — a prime place to look for life.' },
      { name: 'Ganymede', r: 0.12, d: 3.7, inc: 0.2, a: [0.62, 0.58, 0.52], b: [0.36, 0.33, 0.3], note: 'The largest moon in the Solar System, with its own magnetic field.' },
      { name: 'Callisto', r: 0.11, d: 4.7, inc: 0.3, a: [0.45, 0.4, 0.34], b: [0.22, 0.2, 0.18], note: 'One of the most heavily cratered surfaces known.' }
    ]
  },
  {
    id: 'saturn', name: 'Saturn', order: 6, kind: 'Gas giant', accent: '#F1D7A0',
    orbit: 152, r: 4.8, dKm: 120536, au: 9.58, distM: 1432.0, massE: 95.2, massKg: [5.68, 26], g: 9.0,
    dayH: 10.56, dayLabel: '10 h 34 min', spinH: 10.56, yearD: 10747, yearLabel: '29.4 Earth years', tempC: -140,
    moons: 293, tilt: 26.7, pressure: 'No solid surface',
    atmo: [['Hydrogen', 96.3], ['Helium', 3.25], ['Other', 0.45]], atmoTitle: 'Atmosphere',
    overview: 'Famous for its bright rings of ice and rock, Saturn is a gas giant with an average density lower than water. It has more known moons than any other planet.',
    facts: [
      'Saturn’s average density is lower than that of water.',
      'The main rings stretch across hundreds of thousands of kilometres but are mostly only about 10 metres thick.',
      'A six-sided jet stream, the hexagon, circles its north pole.',
      'Its moon Titan has rivers, lakes and seas of liquid methane and ethane.'
    ],
    oneLiner: 'The ringed giant and the moon champion.',
    bake: { type: 5, seed: 5.5, cols: [C('#e9d3a2'), C('#c7a46a'), C('#a07a48'), C('#8fa0a8')] }, fallback: C('#d6bd88'),
    atmoCol: [0.98, 0.88, 0.62], sunset: [0.9, 0.65, 0.4], atmoAmt: 0.32, shell: 1.045, wrap: 0.12, angle0: 3.1,
    rings: { inner: 1.24, outer: 2.34, style: 0, a: [0.82, 0.74, 0.6], b: [0.95, 0.9, 0.8], opacity: 0.95 },
    moonsList: [
      { name: 'Enceladus', r: 0.05, d: 2.7, inc: 0, a: [0.97, 0.98, 1.0], b: [0.8, 0.84, 0.9], note: 'Sprays jets of water ice from its south pole.' },
      { name: 'Rhea', r: 0.07, d: 3.3, inc: 0.3, a: [0.8, 0.78, 0.76], b: [0.5, 0.48, 0.46], note: 'Saturn’s second-largest moon, an icy and cratered world.' },
      { name: 'Titan', r: 0.13, d: 4.4, inc: 0.3, a: [0.92, 0.66, 0.3], b: [0.75, 0.5, 0.22], note: 'Wrapped in a thick nitrogen atmosphere, with lakes of liquid methane.' },
      { name: 'Iapetus', r: 0.07, d: 5.8, inc: 8, a: [0.85, 0.82, 0.78], b: [0.6, 0.57, 0.53], twoTone: 1, note: 'Two-toned: one side dark as coal, the other bright as snow.' }
    ]
  },
  {
    id: 'uranus', name: 'Uranus', order: 7, kind: 'Ice giant', accent: '#8EE6EA',
    orbit: 192, r: 3.0, dKm: 51118, au: 19.2, distM: 2867.0, massE: 14.5, massKg: [8.68, 25], g: 8.7,
    dayH: 17.24, dayLabel: '17 h 14 min', daySub: 'Rotates backwards, lying on its side', spinH: -17.24, yearD: 30589, yearLabel: '84 Earth years', tempC: -195,
    moons: 29, tilt: 97.8, pressure: 'No solid surface',
    atmo: [['Hydrogen', 82.5], ['Helium', 15.2], ['Methane', 2.3]], atmoTitle: 'Atmosphere',
    overview: 'An ice giant knocked onto its side, Uranus rolls around the Sun with each pole taking turns facing sunlight. Methane in its atmosphere gives it a pale cyan tint.',
    facts: [
      'It is tilted about 98°, so it orbits the Sun rolling on its side.',
      'Each pole gets around 42 years of continuous sunlight, then 42 years of darkness.',
      'It was the first planet discovered with a telescope, by William Herschel in 1781.',
      'Uranus has 13 known rings, which are dark and narrow.'
    ],
    oneLiner: 'The sideways ice giant.',
    bake: { type: 6, seed: 6.6, cols: [C('#9fd8dc'), C('#b8eef0'), C('#d8fbff'), C('#7cc3cc')] }, fallback: C('#a6e0e4'),
    atmoCol: [0.6, 0.95, 1.0], sunset: [0.5, 0.8, 0.9], atmoAmt: 0.85, shell: 1.07, wrap: 0.1, angle0: 4.6,
    rings: { inner: 1.55, outer: 2.05, style: 1, a: [0.55, 0.6, 0.65], b: [0.75, 0.8, 0.85], opacity: 0.8 },
    moonsList: [
      { name: 'Miranda', r: 0.07, d: 2.2, inc: 4, a: [0.75, 0.75, 0.76], b: [0.45, 0.45, 0.47], note: 'A patchwork moon with cliffs around 20 km high.' },
      { name: 'Ariel', r: 0.09, d: 2.8, inc: 0.3, a: [0.8, 0.8, 0.82], b: [0.52, 0.52, 0.55], note: 'The brightest of Uranus’s large moons, cut by long fault valleys.' },
      { name: 'Titania', r: 0.11, d: 3.6, inc: 0.3, a: [0.7, 0.66, 0.64], b: [0.42, 0.4, 0.39], note: 'Uranus’s largest moon, about 1,578 km across.' },
      { name: 'Oberon', r: 0.11, d: 4.5, inc: 0.1, a: [0.62, 0.58, 0.56], b: [0.36, 0.33, 0.32], note: 'The outermost major moon, old and heavily cratered.' }
    ]
  },
  {
    id: 'neptune', name: 'Neptune', order: 8, kind: 'Ice giant', accent: '#6F8FFF',
    orbit: 226, r: 2.9, dKm: 49528, au: 30.1, distM: 4515.0, massE: 17.1, massKg: [1.02, 26], g: 11.0,
    dayH: 16.11, dayLabel: '16 h 6 min', spinH: 16.11, yearD: 59800, yearLabel: '164.8 Earth years', tempC: -200,
    moons: 16, tilt: 28.3, pressure: 'No solid surface',
    atmo: [['Hydrogen', 80], ['Helium', 19], ['Methane', 1.5]], atmoTitle: 'Atmosphere',
    overview: 'The most distant planet is a deep-blue ice giant whipped by the fastest winds in the Solar System. It was the first planet found by mathematical prediction rather than observation.',
    facts: [
      'Winds reach about 2,000 km/h — the fastest measured on any planet.',
      'It was found in 1846 after mathematicians predicted its position from wobbles in Uranus’s orbit.',
      'Its largest moon, Triton, orbits backwards and is probably a captured Kuiper Belt object.',
      'In 2011 Neptune completed its first full orbit since its discovery.'
    ],
    oneLiner: 'The windswept blue giant at the edge.',
    bake: { type: 7, seed: 8.8, cols: [C('#2a4bc0'), C('#4d74e8'), C('#101c52'), C('#e8f0ff')] }, fallback: C('#3e62d8'),
    atmoCol: [0.4, 0.58, 1.0], sunset: [0.4, 0.5, 1.0], atmoAmt: 0.85, shell: 1.07, wrap: 0.1, angle0: 0.2,
    moonsList: [
      { name: 'Triton', r: 0.14, d: 3.2, inc: 157, a: [0.85, 0.76, 0.74], b: [0.62, 0.52, 0.52], note: 'Orbits backwards; nitrogen geysers erupt from its frozen surface.' },
      { name: 'Proteus', r: 0.05, d: 2.1, inc: 0.5, a: [0.36, 0.34, 0.33], b: [0.2, 0.19, 0.19], note: 'A dark, irregular moon about 420 km across.' }
    ]
  }
];

const byId = Object.fromEntries(BODIES.map((b) => [b.id, b]));
const PLANETS = BODIES.filter((b) => b.id !== 'sun');
const EARTH = byId.earth;
// True relative radius for the comparison view (Earth = its display radius)
BODIES.forEach((b) => { b.cmpR = EARTH.r * (b.dKm / EARTH.dKm); });

const MISSIONS = [
  { name: 'Parker Solar Probe', agency: 'NASA', years: '2018 – present', targets: ['sun'], status: 'Active',
    text: 'Dives through the Sun’s outer atmosphere. In December 2024 it passed about 6.1 million km from the surface, becoming the closest and fastest spacecraft ever.' },
  { name: 'MESSENGER', agency: 'NASA', years: '2004 – 2015', targets: ['mercury'], status: 'Complete',
    text: 'The first spacecraft to orbit Mercury. It mapped the whole planet and confirmed water ice in shadowed polar craters.' },
  { name: 'BepiColombo', agency: 'ESA and JAXA', years: 'Launched 2018', targets: ['mercury'], status: 'En route',
    text: 'Two orbiters travelling together on a long, gravity-assisted path, with arrival at Mercury planned for late 2026.' },
  { name: 'Venera 7', agency: 'Soviet Union', years: '1970', targets: ['venus'], status: 'Complete',
    text: 'The first spacecraft to land on another planet and send back data from its surface.' },
  { name: 'Magellan', agency: 'NASA', years: '1989 – 1994', targets: ['venus'], status: 'Complete',
    text: 'Used radar to see through the clouds, mapping about 98% of the surface of Venus.' },
  { name: 'Apollo 11', agency: 'NASA', years: '1969', targets: ['earth'], status: 'Complete',
    text: 'Carried Neil Armstrong and Buzz Aldrin to the first human footsteps on the Moon.' },
  { name: 'Perseverance', agency: 'NASA', years: 'Landed 2021', targets: ['mars'], status: 'Active',
    text: 'A rover exploring Jezero Crater and collecting rock samples. It carried Ingenuity, the first aircraft to fly on another planet.' },
  { name: 'Juno', agency: 'NASA', years: 'Arrived 2016', targets: ['jupiter'], status: 'Orbiter',
    text: 'Loops over Jupiter’s poles to study its deep interior, magnetic field and auroras.' },
  { name: 'Europa Clipper', agency: 'NASA', years: 'Launched 2024', targets: ['jupiter'], status: 'En route',
    text: 'Due at Jupiter in 2030 to study whether Europa’s hidden ocean could support life.' },
  { name: 'JUICE', agency: 'ESA', years: 'Launched 2023', targets: ['jupiter'], status: 'En route',
    text: 'Headed for Jupiter’s icy moons; it will eventually become the first spacecraft to orbit a moon of another planet, Ganymede.' },
  { name: 'Cassini–Huygens', agency: 'NASA, ESA and ASI', years: '1997 – 2017', targets: ['saturn'], status: 'Complete',
    text: 'Spent 13 years at Saturn. Its Huygens probe landed on Titan in 2005, the most distant landing ever made.' },
  { name: 'Voyager 2', agency: 'NASA', years: '1977 – present', targets: ['uranus', 'neptune'], status: 'Interstellar',
    text: 'The only spacecraft to visit Uranus (1986) and Neptune (1989). It is now travelling through interstellar space.' }
];

const TOUR = [
  { id: 'system', title: 'Welcome to the Solar System', text: 'Eight planets circle one star. Distances here are compressed so everything fits — in reality Neptune is 30 times farther from the Sun than Earth is.' },
  { id: 'sun', title: 'The Sun', text: 'Everything here orbits this star. Its gravity reaches billions of kilometres, and its light powers weather, seasons and life on Earth.' },
  { id: 'mercury', title: 'Mercury', text: 'The innermost planet has almost no air, so its surface bakes by day and freezes by night.' },
  { id: 'venus', title: 'Venus', text: 'Similar in size to Earth, but its thick carbon-dioxide atmosphere makes it the hottest planet of all.' },
  { id: 'earth', title: 'Earth', text: 'Home. Liquid water, a protective atmosphere and a magnetic field make it the only world known to host life.' },
  { id: 'mars', title: 'Mars', text: 'The red planet once had flowing water. Rovers are studying its rocks to learn whether life ever took hold.' },
  { id: 'jupiter', title: 'Jupiter', text: 'Past the asteroid belt lies the largest planet, a gas giant with more than twice the mass of all others combined.' },
  { id: 'saturn', title: 'Saturn', text: 'Its rings are made of countless chunks of ice, from grains of dust to pieces the size of houses.' },
  { id: 'uranus', title: 'Uranus', text: 'Tilted on its side, this ice giant has seasons that last more than twenty years each.' },
  { id: 'neptune', title: 'Neptune', text: 'The outermost planet takes almost 165 years to circle the Sun, battered by supersonic winds.' },
  { id: 'system', title: 'Your turn to explore', text: 'Click any world to open its guide, or switch to the Data and Comparison views to see the system in numbers.' }
];
