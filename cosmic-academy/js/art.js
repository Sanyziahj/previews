/* Cosmic Color art class. Official looks only. Build b1.
   Coloring pages are original line art, not portraits copied from photos. */
(function (root) {
  "use strict";

  const POTS = [
    { id: "red", name: "Red", hex: "#e23b3b" },
    { id: "yellow", name: "Yellow", hex: "#ffd23a" },
    { id: "blue", name: "Blue", hex: "#2f6bff" },
    { id: "orange", name: "Orange", hex: "#f08a22" },
    { id: "green", name: "Green", hex: "#2fbf5a" },
    { id: "purple", name: "Purple", hex: "#7b3fd0" },
    { id: "pink", name: "Pink", hex: "#ff8ec8" },
    { id: "teal", name: "Teal", hex: "#1fb0a8" },
    { id: "rust", name: "Rust", hex: "#c4622d" },
    { id: "brown", name: "Brown", hex: "#8a5a32" },
    { id: "gold", name: "Gold", hex: "#e6c15a" },
    { id: "chrome", name: "Chrome", hex: "#d5dbe6" },
    { id: "white", name: "White", hex: "#ffffff" },
    { id: "black", name: "Black", hex: "#1a1a22" },
  ];
  const POT = {};
  POTS.forEach(function (p) { POT[p.id] = p; });

  const RECIPES = {
    "blue+red": { name: "Purple", hex: "#7b3fd0", tip: "In these paint pots, red and blue make purple. Call the picture a purple nebula if you like. This is paint, not a fact about starlight." },
    "red+yellow": { name: "Orange", hex: "#f08a22", tip: "In these paint pots, red and yellow make orange. This is paint mixing, not a fact about the Sun." },
    "blue+yellow": { name: "Green", hex: "#2fbf5a", tip: "In these paint pots, yellow and blue make green. This is paint mixing, not a fact about plants or planets." },
    "red+white": { name: "Pink", hex: "#ff8ec8", tip: "White makes a tint, a lighter paint. Red mixed with white makes pink." },
    "blue+white": { name: "Light Blue", hex: "#9eb6ff", tip: "White makes a tint. Blue mixed with white makes a lighter blue." },
    "white+yellow": { name: "Light Yellow", hex: "#fff0a8", tip: "White makes a tint. Yellow mixed with white makes a lighter yellow." },
    "green+white": { name: "Light Green", hex: "#a8e8bc", tip: "White makes a tint. Green mixed with white makes a lighter green." },
    "purple+white": { name: "Light Purple", hex: "#c9b0f0", tip: "White makes a tint. Purple mixed with white makes a lighter purple." },
    "orange+white": { name: "Light Orange", hex: "#ffc48a", tip: "White makes a tint. Orange mixed with white makes a lighter orange." },
    "black+white": { name: "Gray", hex: "#8d8d96", tip: "Black and white mix to gray." },
  };

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    }).join("");
  }
  function mixHex(a, b, t) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return rgbToHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: s, l: l };
  }
  function nameBlend(hex) {
    const c = hexToRgb(hex);
    const hsl = rgbToHsl(c.r, c.g, c.b);
    let base = "Gray";
    if (hsl.l < 0.12) base = "Black";
    else if (hsl.l > 0.92) base = "White";
    else if (hsl.s < 0.14) base = "Gray";
    else if (hsl.l < 0.4 && hsl.h > 15 && hsl.h < 50) base = "Brown";
    else if (hsl.h < 18 || hsl.h >= 345) base = "Red";
    else if (hsl.h < 45) base = "Orange";
    else if (hsl.h < 70) base = "Yellow";
    else if (hsl.h < 165) base = "Green";
    else if (hsl.h < 200) base = "Teal";
    else if (hsl.h < 255) base = "Blue";
    else if (hsl.h < 300) base = "Purple";
    else base = "Pink";
    if (base === "Black" || base === "White" || base === "Gray" || base === "Brown") return base;
    if (hsl.l > 0.72) return "Light " + base;
    if (hsl.l < 0.38) return "Dark " + base;
    return base;
  }

  function mixPaints(a, b) {
    const idA = a.id;
    const idB = b.id;
    const key = [idA, idB].sort().join("+");
    if (RECIPES[key]) return Object.assign({ id: key }, RECIPES[key]);
    if (idA === idB) {
      return { id: key, name: a.name, hex: a.hex, tip: "Two pots of " + a.name.toLowerCase() + " stay " + a.name.toLowerCase() + "." };
    }
    const shade = idA === "black" || idB === "black";
    const tint = idA === "white" || idB === "white";
    const other = (idA === "black" || idA === "white") ? b : a;
    if ((shade || tint) && other && other.hex) {
      const hex = shade ? mixHex(other.hex, "#1a1a22", 0.42) : mixHex(other.hex, "#ffffff", 0.48);
      const name = (shade ? "Dark " : "Light ") + other.name;
      const tip = shade
        ? "Black makes a shade, a darker paint. This one is " + name.toLowerCase() + "."
        : "White makes a tint, a lighter paint. This one is " + name.toLowerCase() + ".";
      return { id: key, name: name, hex: hex, tip: tip };
    }
    const hex = mixHex(a.hex, b.hex, 0.5);
    const name = nameBlend(hex);
    return {
      id: key,
      name: name,
      hex: hex,
      tip: "You mixed two paints. On this tray, that color is called " + name.toLowerCase() + ". This is paint, not a science fact.",
    };
  }

  function ell(x, y, rx, ry) {
    return function (p) {
      p.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    };
  }
  function rr(x, y, w, h, r) {
    return function (p) {
      const R = Math.max(0, Math.min(r || 0, w / 2, h / 2));
      p.moveTo(x + R, y);
      p.arcTo(x + w, y, x + w, y + h, R);
      p.arcTo(x + w, y + h, x, y + h, R);
      p.arcTo(x, y + h, x, y, R);
      p.arcTo(x, y, x + w, y, R);
      p.closePath();
    };
  }
  function poly(pts) {
    return function (p) {
      p.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
      p.closePath();
    };
  }
  function starPath(cx, cy, r) {
    return function (p) {
      const inner = r * 0.42;
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + i * Math.PI / 5;
        const rad = i % 2 ? inner : r;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;
        if (i === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
      p.closePath();
    };
  }

  function Page(w, h, flavor) {
    this.w = w;
    this.h = h;
    this.flavor = flavor;
    this.regions = [];
    this.details = [];
  }
  Page.prototype.shape = function (id, name, official, draw, opts) {
    const path = new Path2D();
    draw(path);
    const o = opts || {};
    this.regions.push({
      id: id,
      name: name,
      official: official,
      path: path,
      anchor: o.anchor || { x: 0, y: 0 },
      lw: o.lw || 8,
      neon: o.neon || official,
    });
  };
  Page.prototype.detail = function (fn) { this.details.push(fn); };

  const CAST = [
    { id: "skippy", name: "Skippy", young: true, scene: "academy", place: "Academy",
      head: "#f4f6fb", cheek: "#ff5ad8", suit: "#f7f7fb", glove: "#3a3a46", boot: "#2e2e3a", boot2: "#1a1a22",
      eyes: "slit", mouth: "grin", brows: true, hat: "beanie", hatC: "#e0a028", hatC2: "#a87410",
      extra: ["pack"], plate: "#2a2a32", hint: "Skippy's head is white, his beanie is orange, and his cheeks are pink." },
    { id: "spike", name: "Spike", scene: "cosmos", place: "Cosmos",
      head: "#1fb0a8", cheek: "#ff8ec8", suit: "#c4622d", glove: "#1a1a22", boot: "#1a1a14", boot2: "#ffe14a",
      eyes: "closed", mouth: "wavy", brows: true, hat: "spikes", hatC: "#d5dbe6", hatC2: "#ffffff",
      extra: ["jet", "harness"], plate: "#1a1a22", hint: "Spike's head is teal, his three spikes are chrome, and his suit is rust orange." },
    { id: "santt", name: "Santt", scene: "academy", place: "Academy",
      head: "#7b3fd0", cheek: "#f7a8d8", suit: "#6a34b8", glove: "#d5dbe6", boot: "#d5dbe6", boot2: "#e8e8ee",
      eyes: "half", mouth: "line", brows: false, hat: "mohawk", hatC: "#e0282e", hatC2: "#ff6a6a",
      extra: ["jet", "accent"], plate: "#f2f2f6", hint: "Santt's head is purple and his mohawk is a red block. He has no visor." },
    { id: "ros", name: "ROS", scene: "desert", place: "Pioneer Pour",
      head: "#7b3fd0", cheek: "#f7a8d8", suit: "#c8282e", glove: "#e6c15a", boot: "#e0a830", boot2: "#f0c040",
      eyes: "green", mouth: "line", brows: false, hat: "sheriff", hatC: "#7a4a26", hatC2: "#2a1a10",
      extra: ["jet", "poncho"], plate: "#d8dce4", hint: "ROS has a purple head, a flat-brim sheriff hat, two green eyes, a red suit, and a poncho." },
    { id: "drill", name: "Drill Sergeant", scene: "academy", place: "Academy yard",
      head: "#f08a2a", cheek: "#f7a8d8", suit: "#1fa8a0", glove: "#2a3a3a", boot: "#7a4a26", boot2: "#f08a2a",
      eyes: "oval", mouth: "smile", brows: false, hat: "sheriff", hatC: "#7a4a26", hatC2: "#16161c",
      extra: ["jet", "drillmarks"], plate: "#ff4fd8", hint: "The Drill Sergeant has an orange head, a teal suit, and an open smile." },
    { id: "cash", name: "Cash", scene: "cosmos", place: "Cosmos",
      head: "#f7f7fb", cheek: "#f7a8d8", suit: "#2a8a3a", glove: "#1a1a22", boot: "#1a1a22", boot2: "#3a3a44",
      eyes: "half", mouth: "oh", brows: false, hat: "wizard", hatC: "#6a6a72", hatC2: "#9a9aa4",
      extra: ["jet"], plate: "#8ae878", hint: "Cash has a white head, a grey floppy wizard hat, and a green suit." },
    { id: "slide", name: "Slide", scene: "seaport", place: "Board shop",
      head: "#7b3fd0", cheek: "#f7a8d8", suit: "#2a2a3a", glove: "#16161c", boot: "#16161c", boot2: "#3a3a44",
      eyes: "shades", mouth: "smile", brows: false, hat: "none", hatC: "#ff4fd8", hatC2: "#ffd0f0",
      extra: ["jet"], prop: "heldboard", plate: "#ff4fd8", hint: "Slide has a purple head and pink shades. He makes space boards." },
    { id: "ramshackle", name: "Ramshackle", scene: "seaport", place: "Seaport",
      head: "#7b3fd0", cheek: "#f7a8d8", suit: "#e07a2a", glove: "#5a3418", boot: "#5a3418", boot2: "#3a2414",
      eyes: "oval", mouth: "grin", brows: true, hat: "viking", hatC: "#b7b9c4", hatC2: "#f0e6c8",
      extra: ["jet"], prop: "axe", plate: "#f0e6c8", hint: "Ramshackle has a purple head, a horned helmet, and an orange suit." },
    { id: "ronin", name: "Ronin", scene: "sakura", place: "Sakura",
      head: "#7b3fd0", cheek: "#f7a8d8", suit: "#f08a2a", glove: "#2a2a32", boot: "#2a2a32", boot2: "#1a1a22",
      eyes: "gslit", mouth: "oni", brows: false, hat: "onihorns", hatC: "#6a1220", hatC2: "#e6c15a",
      extra: ["jet"], prop: "firekatana", plate: "#c8202a", hint: "Ronin has a purple head, dark red horns, a red mask, and an orange suit. The flame on the blade is painted light." },
    { id: "shadow", name: "Shadow", scene: "sakura", place: "Sakura",
      head: "#c89a64", cheek: "#f7a8d8", suit: "#1a1a22", glove: "#2a2a32", boot: "#2a2a32", boot2: "#111116",
      eyes: "oval", mouth: "zig", brows: false, hat: "headband", hatC: "#16161c", hatC2: "#d5dbe6",
      extra: ["jet", "grain"], plate: "#ff4fd8", hint: "Shadow has a tan wood-grain head, a black headband with an SR plate, and a pink light on his chest." },
    { id: "cavendish", name: "Cavendish", scene: "desert", place: "Desert field",
      head: "#2a62c0", cheek: "#f7a8d8", suit: "#2a4aa8", glove: "#16161c", boot: "#16161c", boot2: "#0e0e14",
      eyes: "oval", mouth: "grin", brows: true, hat: "beanie", hatC: "#f0c030", hatC2: "#c09010",
      extra: ["hoodie"], plate: "#f0c030", hint: "Cavendish has a blue head, a yellow beanie, and a blue hoodie." },
    { id: "fright", name: "Fright", scene: "none", place: "Story portrait",
      head: "#7b3fd0", cheek: "#f7a8d8", suit: "#5a2a8a", glove: "#2a1a3a", boot: "#6a1840", boot2: "#2a1020",
      eyes: "three", mouth: "fang", brows: false, hat: "fhorns", hatC: "#e6dcc4", hatC2: "#8a7058",
      extra: ["cape", "wings", "tail", "collar"], plate: "#ff4fd8",
      hint: "This is a story picture of Fright, not a science fact. Purple head, pink ruby, three magenta eyes, cape, wings, and a tail. Color him calm." },
  ];

  const RIDING = { skippy: 1, spike: 1, ros: 1, ronin: 1, shadow: 1 };

  function metrics(spec, flavor, W, H) {
    if (flavor === "close" || flavor === "icon") {
      const hr = flavor === "icon" ? Math.min(W, H) * 0.2 : Math.min(W, H) * 0.34;
      const cy = flavor === "icon" ? H * 0.62 : H * 0.56;
      return { hr: hr, cx: W / 2, cy: cy, foot: H * 0.94, full: false, neon: false };
    }
    const neon = flavor === "neon";
    const hr = (neon ? 0.15 : 0.112) * Math.min(W, H) * (spec.young ? 1.08 : 1);
    const cx = neon ? W * 0.5 : W * 0.66;
    const foot = H * (neon ? 0.86 : 0.9);
    const cy = foot - hr * (spec.young ? 3.45 : 3.85);
    return { hr: hr, cx: cx, cy: cy, foot: foot, full: true, neon: neon };
  }

  function add(page, id, name, color, draw, ax, ay, lw) {
    page.shape(id, name, color, draw, { anchor: { x: ax, y: ay }, lw: lw });
  }

  function addBoard(page, cx, y, hr, prefix) {
    const id = prefix || "board";
    add(page, id + "-deck", "Board deck", "#d5dbe6", rr(cx - hr * 1.55, y, hr * 3.1, hr * 0.28, hr * 0.08), cx, y + hr * 0.14, Math.max(4, hr * 0.06));
    add(page, id + "-neon", "Neon edge", "#3ee0ff", rr(cx - hr * 1.35, y + hr * 0.28, hr * 2.7, hr * 0.12, 3), cx, y + hr * 0.34, Math.max(3, hr * 0.05));
    add(page, id + "-thrust", "Thruster", "#8a909c", rr(cx - hr * 1.78, y + hr * 0.02, hr * 0.28, hr * 0.24, 3), cx - hr * 1.64, y + hr * 0.14, Math.max(3, hr * 0.05));
    add(page, id + "-flame", "Thruster flame", "#ffb03a", poly([
      cx - hr * 1.78, y + hr * 0.06,
      cx - hr * 2.15, y + hr * 0.16,
      cx - hr * 1.78, y + hr * 0.26,
    ]), cx - hr * 1.9, y + hr * 0.16, Math.max(3, hr * 0.04));
  }

  function addScene(page, spec, W, H) {
    const place = spec.scene;
    if (place === "desert") {
      add(page, "sky", "Sky", "#9fd4ff", rr(0, 0, W, H * 0.62, 0), W * 0.3, H * 0.25, 6);
      add(page, "sun", "Sun", "#ffd23a", ell(110, 120, 48, 48), 110, 120, 6);
      add(page, "sun2", "Small sun", "#ffb03a", ell(190, 170, 26, 26), 190, 170, 5);
      add(page, "ground", "Sand", "#f3d7a4", rr(0, H * 0.7, W, H * 0.3, 0), W * 0.3, H * 0.84, 6);
      add(page, "mesa", "Mesa", "#e09a62", poly([40, H * 0.7, 200, H * 0.7, 160, H * 0.4, 70, H * 0.48]), 120, H * 0.55, 6);
      if (spec.id === "ros") {
        add(page, "saloon", "Pioneer Pour", "#c4844a", rr(36, H * 0.4, 210, H * 0.3, 6), 140, H * 0.55, 6);
        add(page, "roof", "Roof", "#8a3e32", poly([24, H * 0.42, 258, H * 0.42, 230, H * 0.3, 52, H * 0.3]), 140, H * 0.36, 6);
        add(page, "door", "Door", "#6a3a22", rr(110, H * 0.52, 54, H * 0.18, 4), 137, H * 0.6, 5);
        add(page, "sign", "Sign", "#f4e2b0", rr(48, H * 0.44, 180, 36, 6), 138, H * 0.46, 5);
        add(page, "crate", "Crate", "#e8d2a0", rr(250, H * 0.6, 70, 56, 4), 285, H * 0.64, 5);
        page.detail(function (ctx) {
          ctx.fillStyle = "#1a1a22";
          ctx.font = "700 16px Trebuchet MS, DejaVu Sans, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("PIONEER POUR", 138, H * 0.44 + 24);
          ctx.font = "700 10px Trebuchet MS, DejaVu Sans, sans-serif";
          ctx.fillText("SARSAPARILLA", 285, H * 0.64);
        });
      } else {
        add(page, "stage", "Stage", "#d7b07a", rr(40, H * 0.58, 220, H * 0.12, 8), 150, H * 0.64, 6);
        add(page, "banner", "Banner", "#2a62c0", rr(70, H * 0.34, 160, 40, 6), 150, H * 0.37, 5);
      }
      add(page, "cactus", "Cactus", "#3aaa55", rr(300, H * 0.52, 28, H * 0.18, 10), 314, H * 0.6, 5);
    } else if (place === "academy") {
      add(page, "sky", "Sky", "#b9dcff", rr(0, 0, W, H * 0.62, 0), W * 0.28, H * 0.24, 6);
      add(page, "ground", "Plaza", "#d9d3c8", rr(0, H * 0.72, W, H * 0.28, 0), W * 0.3, H * 0.86, 6);
      add(page, "hall", "Academy", "#efe6d4", rr(40, H * 0.34, 230, H * 0.38, 8), 155, H * 0.52, 6);
      add(page, "dome", "Dome", "#f4d27a", ell(155, H * 0.34, 70, 46), 155, H * 0.32, 6);
      add(page, "door", "Door", "#7a4a28", rr(120, H * 0.52, 56, H * 0.2, 6), 148, H * 0.6, 5);
      add(page, "flag", "Flag", "#e23b3b", rr(250, H * 0.26, 46, 28, 3), 273, H * 0.28, 4);
      if (spec.id === "drill") {
        add(page, "cone", "Cone", "#f08a22", poly([40, H * 0.72, 70, H * 0.72, 55, H * 0.6]), 55, H * 0.66, 4);
        add(page, "cone2", "Cone", "#1fa8a0", poly([300, H * 0.72, 330, H * 0.72, 315, H * 0.6]), 315, H * 0.66, 4);
      }
    } else if (place === "seaport") {
      add(page, "sky", "Sky", "#c5e4ff", rr(0, 0, W, H * 0.48, 0), W * 0.3, H * 0.2, 6);
      add(page, "sea", "Sea", "#3a7bd5", rr(0, H * 0.48, W, H * 0.22, 0), W * 0.3, H * 0.58, 6);
      add(page, "sea2", "Deep sea", "#2458a8", rr(0, H * 0.62, W, H * 0.1, 0), W * 0.3, H * 0.66, 5);
      add(page, "dock", "Dock", "#c49a62", rr(0, H * 0.7, W * 0.7, H * 0.08, 4), W * 0.3, H * 0.74, 5);
      add(page, "hull", "Boat", "#8a4a2a", poly([40, H * 0.62, 200, H * 0.62, 180, H * 0.5, 70, H * 0.5]), 120, H * 0.56, 5);
      add(page, "sail", "Sail", "#fff8ea", poly([120, H * 0.5, 120, H * 0.28, 180, H * 0.48]), 145, H * 0.4, 5);
      if (spec.id === "slide") {
        add(page, "shop", "Shop", "#d7c2a0", rr(20, H * 0.36, 150, H * 0.28, 6), 95, H * 0.5, 5);
        add(page, "rack", "Board rack", "#8a909c", rr(180, H * 0.42, 16, H * 0.22, 3), 188, H * 0.52, 4);
      }
    } else if (place === "sakura") {
      add(page, "sky", "Sky", "#d7c6ff", rr(0, 0, W, H * 0.7, 0), W * 0.28, H * 0.24, 6);
      add(page, "moon", "Moon", "#fff6d0", ell(120, 130, 40, 40), 120, 130, 5);
      add(page, "ground", "Ground", "#c8b59a", rr(0, H * 0.74, W, H * 0.26, 0), W * 0.3, H * 0.86, 6);
      add(page, "trunk", "Trunk", "#8a5a32", rr(150, H * 0.42, 28, H * 0.34, 6), 164, H * 0.58, 5);
      add(page, "bloom", "Blossoms", "#ff9ec8", ell(164, H * 0.36, 90, 60), 164, H * 0.36, 6);
      add(page, "bloom2", "Blossoms", "#ffb3d6", ell(90, H * 0.4, 50, 36), 90, H * 0.4, 5);
      add(page, "petal", "Petal", "#ffd0e6", ell(250, H * 0.3, 12, 8), 250, H * 0.3, 3);
    } else if (place === "cosmos") {
      add(page, "sky", "Space", "#1c2148", rr(0, 0, W, H, 0), W * 0.25, H * 0.3, 6);
      add(page, "planet", "Planet", "#f0c56a", ell(140, 200, 70, 70), 140, 200, 6);
      add(page, "ring", "Ring", "#e6c15a", ell(140, 210, 120, 28), 140, 210, 6);
      page.detail(function (ctx) {
        ctx.fillStyle = "#1a1a22";
        ctx.font = "700 14px Trebuchet MS, DejaVu Sans, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Art. Not to scale.", 24, H - 28);
      });
    }
  }

  function addRider(page, spec, m) {
    const hr = m.hr;
    const cx = m.cx;
    const cy = m.cy;
    const lw = Math.max(4, hr * 0.07);
    const foot = m.foot;
    const full = m.full;
    const riding = full && (m.neon || RIDING[spec.id]);

    if (riding) addBoard(page, cx, foot + hr * 0.02, hr, "board");

    if (spec.extra.indexOf("tail") >= 0) {
      add(page, "tail", "Tail", "#5a2a88", poly([
        cx + hr * 0.2, cy + hr * 1.5,
        cx + hr * 1.6, cy + hr * 1.7,
        cx + hr * 1.9, cy + hr * 2.3,
        cx + hr * 1.2, cy + hr * 2.15,
        cx + hr * 0.4, cy + hr * 1.8,
      ]), cx + hr * 1.2, cy + hr * 1.9, lw);
    }
    if (spec.extra.indexOf("wings") >= 0) {
      add(page, "wingL", "Wing", "#6a3a98", poly([
        cx - hr * 0.8, cy + hr * 0.3,
        cx - hr * 2.3, cy - hr * 0.2,
        cx - hr * 2.5, cy + hr * 0.7,
        cx - hr * 1.4, cy + hr * 1.1,
      ]), cx - hr * 1.7, cy + hr * 0.4, lw);
      add(page, "wingR", "Wing", "#6a3a98", poly([
        cx + hr * 0.8, cy + hr * 0.3,
        cx + hr * 2.3, cy - hr * 0.2,
        cx + hr * 2.5, cy + hr * 0.7,
        cx + hr * 1.4, cy + hr * 1.1,
      ]), cx + hr * 1.7, cy + hr * 0.4, lw);
    }
    if (spec.extra.indexOf("cape") >= 0) {
      add(page, "cape", "Cape", "#7a1840", poly([
        cx - hr * 0.7, cy + hr * 0.9,
        cx + hr * 0.7, cy + hr * 0.9,
        cx + hr * 1.3, cy + hr * 2.4,
        cx - hr * 1.3, cy + hr * 2.4,
      ]), cx, cy + hr * 1.6, lw);
    }

    const neckY = cy + hr * 0.92;
    const hip = full ? foot - hr * 1.15 : cy + hr * 2.05;
    if (spec.extra.indexOf("pack") >= 0) {
      add(page, "pack", "Backpack", "#d7d7e4", rr(cx - hr * 0.85, neckY, hr * 1.7, hr * 0.95, hr * 0.2), cx, neckY + hr * 0.4, lw);
    }
    if (spec.extra.indexOf("jet") >= 0) {
      add(page, "jetL", "Jetpack", "#5c6070", rr(cx - hr * 1.15, neckY, hr * 0.38, hr * 0.9, 6), cx - hr * 0.96, neckY + hr * 0.45, lw * 0.8);
      add(page, "jetR", "Jetpack", "#5c6070", rr(cx + hr * 0.78, neckY, hr * 0.38, hr * 0.9, 6), cx + hr * 0.97, neckY + hr * 0.45, lw * 0.8);
    }

    if (full) {
      add(page, "legL", "Leg", spec.suit, rr(cx - hr * 0.72, hip - hr * 0.1, hr * 0.58, foot - hip, hr * 0.16), cx - hr * 0.43, (hip + foot) / 2, lw);
      add(page, "legR", "Leg", spec.suit, rr(cx + hr * 0.14, hip - hr * 0.1, hr * 0.58, foot - hip, hr * 0.16), cx + hr * 0.43, (hip + foot) / 2, lw);
      add(page, "bootL", "Boot", spec.boot, rr(cx - hr * 0.82, foot - hr * 0.42, hr * 0.72, hr * 0.42, 6), cx - hr * 0.46, foot - hr * 0.2, lw);
      add(page, "bootR", "Boot", spec.boot, rr(cx + hr * 0.1, foot - hr * 0.42, hr * 0.72, hr * 0.42, 6), cx + hr * 0.46, foot - hr * 0.2, lw);
      add(page, "soleL", "Boot stripe", spec.boot2, rr(cx - hr * 0.82, foot - hr * 0.14, hr * 0.72, hr * 0.12, 3), cx - hr * 0.46, foot - hr * 0.08, lw * 0.6);
      add(page, "soleR", "Boot stripe", spec.boot2, rr(cx + hr * 0.1, foot - hr * 0.14, hr * 0.72, hr * 0.12, 3), cx + hr * 0.46, foot - hr * 0.08, lw * 0.6);
    }

    add(page, "armL", "Arm", spec.suit, rr(cx - hr * 1.55, neckY + hr * 0.05, hr * 0.48, hr * (full ? 1.15 : 0.7), hr * 0.2), cx - hr * 1.3, neckY + hr * 0.4, lw);
    add(page, "armR", "Arm", spec.suit, rr(cx + hr * 1.07, neckY + hr * 0.05, hr * 0.48, hr * (full ? 1.15 : 0.7), hr * 0.2), cx + hr * 1.3, neckY + hr * 0.4, lw);
    add(page, "suit", "Suit", spec.suit, rr(cx - hr * 0.95, neckY - hr * 0.05, hr * 1.9, (full ? hip - neckY + hr * 0.2 : hr * 1.15), hr * 0.28), cx, neckY + hr * 0.4, lw);

    if (spec.extra.indexOf("hoodie") >= 0) {
      add(page, "hood", "Hood", "#1a2a6a", ell(cx, cy + hr * 0.15, hr * 1.15, hr * 1.05), cx, cy + hr * 0.2, lw);
      add(page, "hoodie", "Hoodie", spec.suit, rr(cx - hr * 1.05, neckY, hr * 2.1, hr * 1.2, hr * 0.3), cx, neckY + hr * 0.55, lw);
    }
    if (spec.extra.indexOf("poncho") >= 0) {
      const ponchoBot = full ? hip + hr * 0.15 : neckY + hr * 0.72;
      const flare = full ? hr * 1.45 : hr * 1.25;
      add(page, "poncho", "Poncho", "#a56b3c", poly([
        cx - hr * 0.55, neckY + hr * 0.02,
        cx + hr * 0.55, neckY + hr * 0.02,
        cx + flare, ponchoBot,
        cx - flare, ponchoBot,
      ]), cx, neckY + hr * 0.35, lw);
    }
    if (spec.extra.indexOf("accent") >= 0) {
      add(page, "stripe", "Red stripe", "#e0282e", rr(cx - hr * 0.7, neckY + hr * 0.55, hr * 0.28, hr * 0.55, 3), cx - hr * 0.56, neckY + hr * 0.8, lw * 0.5);
      add(page, "stripe2", "White stripe", "#f7f7fb", rr(cx - hr * 0.38, neckY + hr * 0.55, hr * 0.18, hr * 0.55, 3), cx - hr * 0.29, neckY + hr * 0.8, lw * 0.5);
    }
    if (spec.extra.indexOf("drillmarks") >= 0) {
      add(page, "button", "Chest button", "#ff4fd8", ell(cx, neckY + hr * 0.72, hr * 0.12, hr * 0.12), cx, neckY + hr * 0.72, lw * 0.5);
      add(page, "shoulder", "Shoulder mark", "#ff4fd8", rr(cx - hr * 0.85, neckY + hr * 0.05, hr * 0.28, hr * 0.18, 3), cx - hr * 0.7, neckY + hr * 0.14, lw * 0.5);
    }
    if (spec.id === "spike") {
      add(page, "pinkbar", "Pink bar", "#ff6ab0", rr(cx - hr * 0.42, neckY + hr * 0.78, hr * 0.84, hr * 0.16, 3), cx, neckY + hr * 0.86, lw * 0.5);
      add(page, "wstripe", "White stripe", "#ffffff", rr(cx - hr * 0.28, neckY + hr * 0.82, hr * 0.12, hr * 0.1, 2), cx - hr * 0.22, neckY + hr * 0.87, lw * 0.4);
      add(page, "wstripe2", "White stripe", "#ffffff", rr(cx + hr * 0.08, neckY + hr * 0.82, hr * 0.12, hr * 0.1, 2), cx + hr * 0.14, neckY + hr * 0.87, lw * 0.4);
    }
    if (spec.id === "shadow") {
      add(page, "light", "Chest light", "#ff4fd8", ell(cx, neckY + hr * 0.55, hr * 0.14, hr * 0.14), cx, neckY + hr * 0.55, lw * 0.5);
    }

    add(page, "neck", "Neck ring", "#1a1a22", rr(cx - hr * 0.28, cy + hr * 0.78, hr * 0.56, hr * 0.22, 6), cx, cy + hr * 0.88, lw * 0.7);
    add(page, "plate", "SR plate", spec.plate, rr(cx - hr * 0.32, neckY + hr * 0.22, hr * 0.64, hr * 0.42, 6), cx, neckY + hr * 0.42, lw * 0.6);

    const handY = neckY + hr * (full ? 1.05 : 0.62);
    add(page, "gloveL", "Glove", spec.glove, rr(cx - hr * 1.62, handY, hr * 0.5, hr * 0.32, 6), cx - hr * 1.37, handY + hr * 0.16, lw * 0.7);
    add(page, "gloveR", "Glove", spec.glove, rr(cx + hr * 1.12, handY, hr * 0.5, hr * 0.32, 6), cx + hr * 1.37, handY + hr * 0.16, lw * 0.7);

    if (spec.prop === "axe") {
      add(page, "handle", "Axe handle", "#8a5a32", rr(cx + hr * 1.7, neckY - hr * 0.2, hr * 0.16, hr * 1.5, 3), cx + hr * 1.78, neckY + hr * 0.4, lw * 0.5);
      add(page, "axe", "Axe head", "#d5dbe6", poly([
        cx + hr * 1.55, neckY - hr * 0.15,
        cx + hr * 2.15, neckY - hr * 0.45,
        cx + hr * 2.15, neckY + hr * 0.15,
      ]), cx + hr * 1.9, neckY - hr * 0.15, lw * 0.5);
    }
    if (spec.prop === "firekatana" || spec.id === "shadow") {
      const blade = spec.prop === "firekatana" ? "#f2f2f6" : "#d5dbe6";
      add(page, "blade", "Blade", blade, rr(cx + hr * 1.85, neckY - hr * 0.85, hr * 0.14, hr * 1.7, 3), cx + hr * 1.92, neckY, lw * 0.45);
      add(page, "hilt", "Hilt", "#1a1a22", rr(cx + hr * 1.78, neckY + hr * 0.85, hr * 0.28, hr * 0.4, 3), cx + hr * 1.92, neckY + hr * 1.05, lw * 0.45);
      if (spec.prop === "firekatana") {
        add(page, "flame", "Flame", "#ff8a1e", poly([
          cx + hr * 2.05, neckY - hr * 0.2,
          cx + hr * 2.45, neckY - hr * 0.55,
          cx + hr * 2.15, neckY + hr * 0.15,
        ]), cx + hr * 2.2, neckY - hr * 0.2, lw * 0.4);
        add(page, "flame2", "Flame", "#ffd23a", poly([
          cx + hr * 2.0, neckY + hr * 0.25,
          cx + hr * 2.35, neckY + hr * 0.05,
          cx + hr * 2.1, neckY + hr * 0.55,
        ]), cx + hr * 2.15, neckY + hr * 0.3, lw * 0.4);
      }
    }
    if (spec.prop === "heldboard") {
      addBoard(page, cx + hr * 1.9, neckY + hr * 0.15, hr * 0.72, "held");
    }
    if (spec.id === "drill") {
      add(page, "raygun", "Holstered raygun", "#d5dbe6", rr(cx + hr * 0.7, hip - hr * 0.05, hr * 0.42, hr * 0.28, 6), cx + hr * 0.9, hip + hr * 0.08, lw * 0.5);
    }
    if (spec.id === "ros") {
      add(page, "blaster", "Holstered blaster", "#e6c15a", rr(cx + hr * 0.85, hip, hr * 0.36, hr * 0.26, 5), cx + hr * 1.02, hip + hr * 0.12, lw * 0.5);
    }

    add(page, "head", "Head", spec.head, ell(cx, cy, hr, hr), cx, cy, Math.max(8, hr * 0.055));

    if (spec.extra.indexOf("collar") >= 0) {
      add(page, "collar", "Collar", "#ff8ad0", rr(cx - hr * 0.55, cy + hr * 0.72, hr * 1.1, hr * 0.2, 4), cx, cy + hr * 0.82, lw * 0.6);
    }
    if (spec.id === "fright") {
      add(page, "spot", "Head spot", "#5a2a90", ell(cx - hr * 0.45, cy - hr * 0.35, hr * 0.12, hr * 0.1), cx - hr * 0.45, cy - hr * 0.35, lw * 0.4);
      add(page, "spot2", "Head spot", "#5a2a90", ell(cx + hr * 0.4, cy + hr * 0.1, hr * 0.1, hr * 0.08), cx + hr * 0.4, cy + hr * 0.1, lw * 0.4);
    }

    if (spec.hat === "beanie") {
      const base = cy - hr * 0.78;
      const top = cy - hr * 1.5;
      add(page, "beanie", "Beanie", spec.hatC, function (p) {
        p.moveTo(cx - hr * 0.66, base);
        p.quadraticCurveTo(cx - hr * 0.98, cy - hr * 1.05, cx - hr * 0.22, top + hr * 0.16);
        p.quadraticCurveTo(cx, top, cx + hr * 0.22, top + hr * 0.16);
        p.quadraticCurveTo(cx + hr * 0.98, cy - hr * 1.05, cx + hr * 0.66, base);
        p.closePath();
      }, cx, cy - hr * 1.15, Math.max(6, hr * 0.045));
      add(page, "cuff", "Cuff", spec.hatC2, rr(cx - hr * 0.82, base - hr * 0.02, hr * 1.64, hr * 0.24, 6), cx, base + hr * 0.1, Math.max(5, hr * 0.04));
      add(page, "patch", "SR patch", "#f7f7fb", rr(cx + hr * 0.22, base, hr * 0.46, hr * 0.18, 3), cx + hr * 0.45, base + hr * 0.09, Math.max(3, hr * 0.03));
    } else if (spec.hat === "mohawk") {
      add(page, "mohawk", "Mohawk", spec.hatC, rr(cx - hr * 0.2, cy - hr * 1.7, hr * 0.4, hr * 1.02, 4), cx, cy - hr * 1.2, Math.max(6, hr * 0.045));
    } else if (spec.hat === "spikes") {
      add(page, "spikeBack", "Back spike", spec.hatC, rr(cx - hr * 0.07, cy - hr * 1.78, hr * 0.14, hr * 0.9, 3), cx, cy - hr * 1.33, Math.max(4, hr * 0.03));
      add(page, "spikeMid", "Middle spike", spec.hatC, rr(cx - hr * 0.09, cy - hr * 1.52, hr * 0.18, hr * 0.7, 3), cx, cy - hr * 1.17, Math.max(4, hr * 0.032));
      add(page, "spikeFront", "Front spike", spec.hatC, rr(cx - hr * 0.08, cy - hr * 1.24, hr * 0.16, hr * 0.5, 3), cx, cy - hr * 0.99, Math.max(4, hr * 0.032));
    } else if (spec.hat === "sheriff") {
      add(page, "crown", "Hat crown", spec.hatC, rr(cx - hr * 0.4, cy - hr * 1.62, hr * 0.8, hr * 0.78, 5), cx, cy - hr * 1.22, Math.max(6, hr * 0.04));
      add(page, "band", "Hat band", spec.hatC2, rr(cx - hr * 0.4, cy - hr * 0.92, hr * 0.8, hr * 0.14, 3), cx, cy - hr * 0.85, Math.max(4, hr * 0.03));
      add(page, "brim", "Hat brim", spec.hatC, ell(cx, cy - hr * 0.86, hr * 1.5, hr * 0.13), cx, cy - hr * 0.86, Math.max(5, hr * 0.035));
      add(page, "platehat", "SR plate", "#d5dbe6", rr(cx - hr * 0.16, cy - hr * 1.38, hr * 0.32, hr * 0.28, 3), cx, cy - hr * 1.24, Math.max(3, hr * 0.03));
    } else if (spec.hat === "wizard") {
      add(page, "cone", "Wizard hat", spec.hatC, function (p) {
        p.moveTo(cx - hr * 0.2, cy - hr * 0.78);
        p.quadraticCurveTo(cx - hr * 0.05, cy - hr * 1.25, cx + hr * 0.55, cy - hr * 1.72);
        p.quadraticCurveTo(cx + hr * 0.15, cy - hr * 1.2, cx + hr * 0.62, cy - hr * 0.7);
        p.closePath();
      }, cx + hr * 0.15, cy - hr * 1.2, Math.max(6, hr * 0.04));
      add(page, "brim", "Brim", spec.hatC, ell(cx, cy - hr * 0.74, hr * 1.2, hr * 0.14), cx, cy - hr * 0.74, Math.max(5, hr * 0.035));
      add(page, "patchw", "Hat patch", spec.hatC2, ell(cx + hr * 0.2, cy - hr * 1.15, hr * 0.12, hr * 0.1), cx + hr * 0.2, cy - hr * 1.15, Math.max(3, hr * 0.03));
    } else if (spec.hat === "viking") {
      add(page, "helm", "Helmet", spec.hatC, function (p) {
        p.moveTo(cx - hr * 0.78, cy - hr * 0.55);
        p.ellipse(cx, cy - hr * 0.55, hr * 0.78, hr * 0.7, 0, Math.PI, Math.PI * 2, false);
        p.closePath();
      }, cx, cy - hr * 0.95, Math.max(6, hr * 0.04));
      add(page, "hband", "Helmet band", "#7a7c88", rr(cx - hr * 0.82, cy - hr * 0.62, hr * 1.64, hr * 0.14, 4), cx, cy - hr * 0.55, Math.max(4, hr * 0.03));
      add(page, "hornL", "Horn", spec.hatC2, poly([
        cx - hr * 0.55, cy - hr * 0.85,
        cx - hr * 1.25, cy - hr * 1.55,
        cx - hr * 0.35, cy - hr * 0.7,
      ]), cx - hr * 0.75, cy - hr * 1.1, Math.max(5, hr * 0.04));
      add(page, "hornR", "Horn", spec.hatC2, poly([
        cx + hr * 0.55, cy - hr * 0.85,
        cx + hr * 1.25, cy - hr * 1.55,
        cx + hr * 0.35, cy - hr * 0.7,
      ]), cx + hr * 0.75, cy - hr * 1.1, Math.max(5, hr * 0.04));
    } else if (spec.hat === "headband") {
      add(page, "band", "Headband", spec.hatC, rr(cx - hr * 0.92, cy - hr * 0.72, hr * 1.84, hr * 0.2, 4), cx, cy - hr * 0.62, Math.max(5, hr * 0.035));
      add(page, "platehat", "SR plate", spec.hatC2, rr(cx - hr * 0.18, cy - hr * 0.7, hr * 0.36, hr * 0.16, 3), cx, cy - hr * 0.62, Math.max(3, hr * 0.03));
    } else if (spec.hat === "onihorns") {
      add(page, "hornL", "Horn", spec.hatC, poly([
        cx - hr * 0.55, cy - hr * 0.65,
        cx - hr * 1.05, cy - hr * 1.4,
        cx - hr * 0.35, cy - hr * 0.8,
      ]), cx - hr * 0.7, cy - hr * 1.0, lw);
      add(page, "hornR", "Horn", spec.hatC, poly([
        cx + hr * 0.55, cy - hr * 0.65,
        cx + hr * 1.05, cy - hr * 1.4,
        cx + hr * 0.35, cy - hr * 0.8,
      ]), cx + hr * 0.7, cy - hr * 1.0, lw);
      add(page, "crescent", "Gold crescent", spec.hatC2, ell(cx, cy - hr * 1.15, hr * 0.28, hr * 0.16), cx, cy - hr * 1.15, lw * 0.5);
    } else if (spec.hat === "fhorns") {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.85 + i * (Math.PI * 0.7 / 4);
        const x1 = cx + Math.cos(a) * hr * 0.85;
        const y1 = cy + Math.sin(a) * hr * 0.75;
        const x2 = cx + Math.cos(a) * hr * 1.45;
        const y2 = cy + Math.sin(a) * hr * 1.35;
        add(page, "horn" + i, "Horn", spec.hatC, poly([
          x1 - 8, y1, x2, y2, x1 + 8, y1,
        ]), (x1 + x2) / 2, (y1 + y2) / 2, lw * 0.45);
      }
      add(page, "ruby", "Ruby", "#ff4fd8", poly([
        cx, cy - hr * 0.72,
        cx + hr * 0.16, cy - hr * 0.5,
        cx, cy - hr * 0.28,
        cx - hr * 0.16, cy - hr * 0.5,
      ]), cx, cy - hr * 0.5, lw * 0.45);
    }

    const eyeY = cy - hr * 0.06;
    const ex = hr * 0.36;
    if (spec.eyes === "slit") {
      add(page, "eyeL", "Eye", "#1a1a22", ell(cx - ex, eyeY, hr * 0.16, hr * 0.2), cx - ex, eyeY, lw * 0.55);
      add(page, "eyeR", "Eye", "#1a1a22", ell(cx + ex, eyeY, hr * 0.16, hr * 0.2), cx + ex, eyeY, lw * 0.55);
      add(page, "slitL", "Eye slit", "#ffffff", ell(cx - ex, eyeY, hr * 0.045, hr * 0.12), cx - ex, eyeY, lw * 0.35);
      add(page, "slitR", "Eye slit", "#ffffff", ell(cx + ex, eyeY, hr * 0.045, hr * 0.12), cx + ex, eyeY, lw * 0.35);
    } else if (spec.eyes === "half") {
      add(page, "eyeL", "Eye", "#1a1a22", ell(cx - ex, eyeY, hr * 0.18, hr * 0.1), cx - ex, eyeY, lw * 0.55);
      add(page, "eyeR", "Eye", "#1a1a22", ell(cx + ex, eyeY, hr * 0.18, hr * 0.1), cx + ex, eyeY, lw * 0.55);
    } else if (spec.eyes === "oval" || spec.eyes === "green" || spec.eyes === "gslit") {
      const col = spec.eyes === "oval" ? "#1a1a22" : "#3dff6a";
      const ry = spec.eyes === "gslit" ? hr * 0.08 : hr * 0.16;
      const rx = spec.eyes === "gslit" ? hr * 0.2 : hr * 0.16;
      add(page, "eyeL", "Eye", col, ell(cx - ex, eyeY, rx, ry), cx - ex, eyeY, lw * 0.55);
      add(page, "eyeR", "Eye", col, ell(cx + ex, eyeY, rx, ry), cx + ex, eyeY, lw * 0.55);
    } else if (spec.eyes === "shades") {
      add(page, "shadeL", "Shade", "#ff4fd8", poly([
        cx - ex - hr * 0.28, eyeY - hr * 0.16,
        cx - ex + hr * 0.26, eyeY - hr * 0.22,
        cx - ex + hr * 0.22, eyeY + hr * 0.14,
        cx - ex - hr * 0.24, eyeY + hr * 0.1,
      ]), cx - ex, eyeY, Math.max(5, hr * 0.04));
      add(page, "shadeR", "Shade", "#ff4fd8", poly([
        cx + ex - hr * 0.26, eyeY - hr * 0.22,
        cx + ex + hr * 0.28, eyeY - hr * 0.16,
        cx + ex + hr * 0.24, eyeY + hr * 0.1,
        cx + ex - hr * 0.22, eyeY + hr * 0.14,
      ]), cx + ex, eyeY, Math.max(5, hr * 0.04));
      add(page, "bridge", "Bridge", "#ff4fd8", rr(cx - hr * 0.12, eyeY - hr * 0.06, hr * 0.24, hr * 0.1, 2), cx, eyeY, Math.max(3, hr * 0.03));
    } else if (spec.eyes === "three") {
      add(page, "eyeL", "Eye", "#e020b0", ell(cx - ex, eyeY, hr * 0.16, hr * 0.1), cx - ex, eyeY, lw * 0.5);
      add(page, "eyeR", "Eye", "#e020b0", ell(cx + ex, eyeY, hr * 0.16, hr * 0.1), cx + ex, eyeY, lw * 0.5);
      add(page, "eye3", "Third eye", "#e020b0", ell(cx, cy - hr * 0.42, hr * 0.09, hr * 0.07), cx, cy - hr * 0.42, lw * 0.4);
    }

    if (spec.eyes !== "shades" && spec.mouth !== "oni") {
      add(page, "cheekL", "Cheek", spec.cheek, ell(cx - hr * 0.58, cy + hr * 0.18, hr * 0.15, hr * 0.15), cx - hr * 0.58, cy + hr * 0.18, Math.max(4, hr * 0.035));
      add(page, "cheekR", "Cheek", spec.cheek, ell(cx + hr * 0.58, cy + hr * 0.18, hr * 0.15, hr * 0.15), cx + hr * 0.58, cy + hr * 0.18, Math.max(4, hr * 0.035));
    }

    if (spec.mouth === "grin" || spec.mouth === "smile") {
      add(page, "mouth", "Mouth", "#1a1a22", ell(cx, cy + hr * 0.5, hr * 0.46, hr * 0.28), cx, cy + hr * 0.52, Math.max(5, hr * 0.04));
      add(page, "tooth", "Tooth bar", "#ffffff", rr(cx - hr * 0.28, cy + hr * 0.4, hr * 0.56, hr * 0.1, 2), cx, cy + hr * 0.45, Math.max(3, hr * 0.025));
      add(page, "tooth2", "Tooth bar", "#ffffff", rr(cx - hr * 0.22, cy + hr * 0.54, hr * 0.44, hr * 0.09, 2), cx, cy + hr * 0.58, Math.max(3, hr * 0.025));
    } else if (spec.mouth === "line") {
      add(page, "mouth", "Mouth", "#1a1a22", rr(cx - hr * 0.22, cy + hr * 0.42, hr * 0.44, hr * 0.08, 3), cx, cy + hr * 0.46, lw * 0.45);
    } else if (spec.mouth === "oh") {
      add(page, "mouth", "Mouth", "#1a1a22", ell(cx, cy + hr * 0.46, hr * 0.12, hr * 0.14), cx, cy + hr * 0.46, lw * 0.45);
    } else if (spec.mouth === "oni") {
      add(page, "mask", "Mask", "#c8202a", ell(cx, cy + hr * 0.28, hr * 0.62, hr * 0.42), cx, cy + hr * 0.28, lw);
      add(page, "fangL", "Fang", "#ffffff", poly([
        cx - hr * 0.18, cy + hr * 0.34,
        cx - hr * 0.08, cy + hr * 0.34,
        cx - hr * 0.13, cy + hr * 0.52,
      ]), cx - hr * 0.13, cy + hr * 0.4, lw * 0.35);
      add(page, "fangR", "Fang", "#ffffff", poly([
        cx + hr * 0.08, cy + hr * 0.34,
        cx + hr * 0.18, cy + hr * 0.34,
        cx + hr * 0.13, cy + hr * 0.52,
      ]), cx + hr * 0.13, cy + hr * 0.4, lw * 0.35);
      add(page, "cheekL", "Cheek", spec.cheek, ell(cx - hr * 0.62, cy + hr * 0.22, hr * 0.1, hr * 0.1), cx - hr * 0.62, cy + hr * 0.22, lw * 0.4);
      add(page, "cheekR", "Cheek", spec.cheek, ell(cx + hr * 0.62, cy + hr * 0.22, hr * 0.1, hr * 0.1), cx + hr * 0.62, cy + hr * 0.22, lw * 0.4);
    } else if (spec.mouth === "fang") {
      add(page, "mouth", "Mouth", "#1a1a22", ell(cx, cy + hr * 0.46, hr * 0.32, hr * 0.16), cx, cy + hr * 0.46, lw * 0.5);
      add(page, "fangL", "Fang", "#ffffff", poly([
        cx - hr * 0.12, cy + hr * 0.4, cx - hr * 0.04, cy + hr * 0.4, cx - hr * 0.08, cy + hr * 0.54,
      ]), cx - hr * 0.08, cy + hr * 0.46, lw * 0.3);
      add(page, "fangR", "Fang", "#ffffff", poly([
        cx + hr * 0.04, cy + hr * 0.4, cx + hr * 0.12, cy + hr * 0.4, cx + hr * 0.08, cy + hr * 0.54,
      ]), cx + hr * 0.08, cy + hr * 0.46, lw * 0.3);
    }

    page.detail(function (ctx, flavor) {
      ctx.save();
      ctx.strokeStyle = flavor === "neon" ? "#f2f2f6" : "#1a1a22";
      ctx.fillStyle = flavor === "neon" ? "#f2f2f6" : "#f7f7fb";
      ctx.lineWidth = Math.max(2, hr * 0.045);
      ctx.lineCap = "round";
      if (spec.brows) {
        ctx.beginPath();
        ctx.moveTo(cx - ex - hr * 0.16, eyeY - hr * 0.24);
        ctx.lineTo(cx - ex + hr * 0.14, eyeY - hr * 0.22);
        ctx.moveTo(cx + ex - hr * 0.14, eyeY - hr * 0.22);
        ctx.lineTo(cx + ex + hr * 0.16, eyeY - hr * 0.24);
        ctx.stroke();
      }
      if (spec.eyes === "closed") {
        ctx.lineWidth = Math.max(2, hr * 0.065);
        ctx.beginPath();
        ctx.moveTo(cx - ex - hr * 0.18, eyeY);
        ctx.quadraticCurveTo(cx - ex, eyeY + hr * 0.14, cx - ex + hr * 0.18, eyeY);
        ctx.moveTo(cx + ex - hr * 0.18, eyeY);
        ctx.quadraticCurveTo(cx + ex, eyeY + hr * 0.14, cx + ex + hr * 0.18, eyeY);
        ctx.stroke();
      }
      if (spec.mouth === "wavy") {
        ctx.lineWidth = Math.max(2, hr * 0.06);
        ctx.beginPath();
        ctx.moveTo(cx - hr * 0.24, cy + hr * 0.42);
        ctx.quadraticCurveTo(cx - hr * 0.1, cy + hr * 0.56, cx, cy + hr * 0.44);
        ctx.quadraticCurveTo(cx + hr * 0.12, cy + hr * 0.56, cx + hr * 0.24, cy + hr * 0.4);
        ctx.stroke();
      }
      if (spec.mouth === "zig") {
        ctx.beginPath();
        ctx.moveTo(cx - hr * 0.28, cy + hr * 0.4);
        ctx.lineTo(cx - hr * 0.14, cy + hr * 0.52);
        ctx.lineTo(cx, cy + hr * 0.4);
        ctx.lineTo(cx + hr * 0.14, cy + hr * 0.52);
        ctx.lineTo(cx + hr * 0.28, cy + hr * 0.4);
        ctx.stroke();
      }
      if (spec.mouth === "smile" && spec.eyes === "shades") {
        ctx.beginPath();
        ctx.arc(cx, cy + hr * 0.32, hr * 0.18, 0.3, Math.PI - 0.3);
        ctx.stroke();
      }
      if (spec.extra.indexOf("grain") >= 0) {
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - hr * 0.4, cy - hr * 0.2);
        ctx.quadraticCurveTo(cx, cy - hr * 0.05, cx + hr * 0.4, cy - hr * 0.25);
        ctx.moveTo(cx - hr * 0.45, cy + hr * 0.1);
        ctx.quadraticCurveTo(cx, cy + hr * 0.22, cx + hr * 0.4, cy + hr * 0.05);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (spec.extra.indexOf("harness") >= 0) {
        ctx.beginPath();
        ctx.moveTo(cx - hr * 0.7, neckY);
        ctx.lineTo(cx - hr * 0.15, hip);
        ctx.moveTo(cx + hr * 0.7, neckY);
        ctx.lineTo(cx + hr * 0.15, hip);
        ctx.stroke();
      }
      if (spec.id === "fright") {
        ctx.beginPath();
        ctx.moveTo(cx + ex + hr * 0.02, eyeY - hr * 0.16);
        ctx.lineTo(cx + ex + hr * 0.16, eyeY + hr * 0.02);
        ctx.moveTo(cx + ex + hr * 0.08, eyeY - hr * 0.08);
        ctx.lineTo(cx + ex + hr * 0.2, eyeY + hr * 0.08);
        ctx.stroke();
      }
      ctx.font = "700 " + Math.round(hr * 0.22) + "px Trebuchet MS, DejaVu Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = spec.plate === "#2a2a32" || spec.plate === "#1a1a22" ? "#f4f6fb" : "#1a1a22";
      if (flavor === "neon") ctx.fillStyle = "#f2f2f6";
      ctx.fillText("SR", cx, neckY + hr * 0.42);
      if (spec.hat === "beanie") {
        ctx.fillStyle = "#1a1a22";
        ctx.font = "700 " + Math.round(hr * 0.12) + "px Trebuchet MS, DejaVu Sans, sans-serif";
        ctx.fillText("SR", cx + hr * 0.45, cy - hr * 0.68);
      }
      ctx.restore();
    });

    if (m.neon) {
      page.detail(function (ctx) {
        ctx.save();
        ctx.fillStyle = "#fff6c8";
        for (let i = 0; i < 18; i++) {
          const x = (i * 97) % page.w;
          const y = (i * 53) % Math.max(40, cy - hr * 1.6);
          ctx.fillRect(x, y, 3, 3);
        }
        ctx.restore();
      });
    }
  }

  function addMixLab(page, W, H) {
    add(page, "sky", "Sky", "#d7e6ff", rr(0, 0, W, H, 0), W / 2, H / 2, 8);
    add(page, "nebula", "Nebula", "#7b3fd0", function (p) {
      p.ellipse(W * 0.34, H * 0.42, W * 0.16, H * 0.1, 0, 0, Math.PI * 2);
      p.ellipse(W * 0.48, H * 0.38, W * 0.18, H * 0.12, 0, 0, Math.PI * 2);
      p.ellipse(W * 0.4, H * 0.5, W * 0.12, H * 0.08, 0, 0, Math.PI * 2);
    }, W * 0.4, H * 0.42, 10);
    add(page, "planet", "Circle", "#2f6bff", ell(W * 0.72, H * 0.36, W * 0.14, W * 0.14), W * 0.72, H * 0.36, 10);
    add(page, "star", "Star", "#ffd23a", starPath(W * 0.25, H * 0.72, Math.min(W, H) * 0.12), W * 0.25, H * 0.72, 8);
    add(page, "moon", "Moon", "#d5dbe6", ell(W * 0.72, H * 0.72, W * 0.1, W * 0.1), W * 0.72, H * 0.72, 8);
    addBoard(page, W * 0.48, H * 0.8, Math.min(W, H) * 0.12, "board");
  }

  const PAGE_W = 720;
  const PAGE_H = 960;

  function metaList() {
    const pages = [];
    CAST.forEach(function (spec) {
      pages.push({ id: spec.id + "-close", who: spec.id, flavor: "close", title: spec.name, flavorName: "Close-up", place: "" });
      if (spec.id !== "fright") {
        pages.push({ id: spec.id + "-scene", who: spec.id, flavor: "scene", title: spec.name, flavorName: "Scene", place: spec.place });
        pages.push({ id: spec.id + "-neon", who: spec.id, flavor: "neon", title: spec.name, flavorName: "Neon", place: "" });
      }
    });
    return pages;
  }

  const builtCache = new Map();

  function build(meta) {
    const key = meta.id;
    if (builtCache.has(key)) return builtCache.get(key);
    const close = meta.flavor === "close";
    const page = new Page(close ? 960 : PAGE_W, close ? 700 : PAGE_H, meta.flavor);
    if (meta.flavor === "mix") {
      addMixLab(page, PAGE_W, PAGE_H);
    } else {
      const spec = CAST.filter(function (c) { return c.id === meta.who; })[0];
      const m = metrics(spec, meta.flavor, page.w, page.h);
      if (meta.flavor === "neon") {
        add(page, "sky", "Starfield", "#070814", rr(0, 0, page.w, page.h, 0), page.w / 2, page.h / 2, 4);
      } else if (meta.flavor === "scene") {
        addScene(page, spec, page.w, page.h);
      } else {
        add(page, "paper", "Page", "#fffdf8", rr(0, 0, page.w, page.h, 0), page.w / 2, page.h / 2, 2);
      }
      addRider(page, spec, m);
      page.hint = spec.hint;
      page.who = spec.id;
    }
    page.meta = meta;
    builtCache.set(key, page);
    return page;
  }

  function paperColor(page, region) {
    if (page.flavor === "neon") return region.id === "sky" ? "#070814" : "#14182c";
    if (page.flavor === "mix" && region.id === "sky") return "#eef3ff";
    return "#fffdf8";
  }

  function paint(ctx, page, fills, mode) {
    ctx.clearRect(0, 0, page.w, page.h);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    page.regions.forEach(function (r) {
      ctx.fillStyle = (fills && fills[r.id]) || (mode === "official" ? r.official : paperColor(page, r));
      ctx.fill(r.path);
    });
    page.regions.forEach(function (r) {
      if (r.id === "paper") return;
      ctx.lineWidth = r.lw;
      if (page.flavor === "neon") {
        ctx.strokeStyle = r.neon || "#9af6ff";
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
      } else {
        ctx.strokeStyle = "#1a1a22";
        ctx.shadowBlur = 0;
      }
      ctx.stroke(r.path);
    });
    ctx.shadowBlur = 0;
    page.details.forEach(function (fn) { fn(ctx, page.flavor); });
  }

  const hitCtx = typeof Path2D !== "undefined" ? null : null;
  let hitContext = null;
  function hitTest(page, x, y) {
    if (!hitContext && typeof document !== "undefined") {
      hitContext = document.createElement("canvas").getContext("2d");
    }
    if (!hitContext) return null;
    for (let i = page.regions.length - 1; i >= 0; i--) {
      const r = page.regions[i];
      if (r.id === "paper" || r.id === "sky" && page.flavor !== "mix" && page.flavor !== "neon" && page.flavor !== "scene") {
        /* sky and paper are still fillable on scene, neon, and mix */
      }
      hitContext.lineWidth = Math.max(8, r.lw);
      if (hitContext.isPointInPath(r.path, x, y) || hitContext.isPointInStroke(r.path, x, y)) {
        if (r.id === "paper") continue;
        return r;
      }
    }
    return null;
  }

  const DRAW = {
    skippy: [
      { title: "Circle head", tip: "A round head. Every Rider starts with a sphere." },
      { title: "Pink cheeks", tip: "Two pink circles. Those are cheeks, not eyes." },
      { title: "Beanie", tip: "Orange beanie. Tuck the SR patch on the cuff." },
      { title: "Grin", tip: "Big grin. Oval eyes, white slits, and a happy open smile." },
      { title: "Suit", tip: "White suit. Black neck ring, then the SR plate." },
      { title: "Boots", tip: "Astronaut boots. Ready to land." },
      { title: "Board", tip: "A space board if you want. Metal deck, neon glow, little thruster." },
    ],
    spike: [
      { title: "Teal head", tip: "Spike's head is a teal sphere." },
      { title: "Three spikes", tip: "Three chrome spikes, from front to back. Not one more." },
      { title: "Calm face", tip: "Closed curved eyes, pink cheeks, and a small wavy smile." },
      { title: "Rust suit", tip: "A rust-orange suit, a black plate, and a pink bar." },
      { title: "Boots", tip: "Black and yellow astronaut boots." },
      { title: "Board", tip: "Metal deck, neon underside, small thruster." },
    ],
  };

  function guide(ctx, who, step, ghost, w, h) {
    const s = Math.min(w * 0.22, h * 0.2);
    const cx = w * 0.5;
    const headY = h * 0.34;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, s * 0.06);
    function ink(n, fn) {
      if (n > step) return;
      ctx.save();
      const current = n === step;
      const alpha = ghost <= 0 ? 0 : current ? ghost : Math.min(1, ghost);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = current ? "#c98500" : "#243056";
      ctx.setLineDash(current ? [10, 8] : []);
      ctx.beginPath();
      fn(ctx);
      ctx.stroke();
      ctx.restore();
    }
    ink(1, function (c) { c.arc(cx, headY, s, 0, Math.PI * 2); });
    if (who === "skippy") {
      ink(2, function (c) {
        c.arc(cx - s * 0.48, headY + s * 0.32, s * 0.14, 0, Math.PI * 2);
        c.moveTo(cx + s * 0.62, headY + s * 0.32);
        c.arc(cx + s * 0.48, headY + s * 0.32, s * 0.14, 0, Math.PI * 2);
      });
      ink(3, function (c) {
        c.moveTo(cx - s * 0.62, headY - s * 0.7);
        c.quadraticCurveTo(cx - s * 0.9, headY - s * 1.15, cx, headY - s * 1.4);
        c.quadraticCurveTo(cx + s * 0.9, headY - s * 1.15, cx + s * 0.62, headY - s * 0.7);
        c.closePath();
        c.rect(cx - s * 0.78, headY - s * 0.78, s * 1.56, s * 0.22);
      });
      ink(4, function (c) {
        c.ellipse(cx - s * 0.32, headY - s * 0.05, s * 0.14, s * 0.18, 0, 0, Math.PI * 2);
        c.moveTo(cx + s * 0.46, headY - s * 0.05);
        c.ellipse(cx + s * 0.32, headY - s * 0.05, s * 0.14, s * 0.18, 0, 0, Math.PI * 2);
        c.moveTo(cx + s * 0.5, headY + s * 0.55);
        c.ellipse(cx, headY + s * 0.48, s * 0.32, s * 0.18, 0, 0, Math.PI * 2);
      });
    } else {
      ink(2, function (c) {
        c.moveTo(cx, headY - s * 1.15);
        c.lineTo(cx, headY - s * 1.7);
        c.moveTo(cx, headY - s * 0.95);
        c.lineTo(cx, headY - s * 1.4);
        c.moveTo(cx, headY - s * 1.35);
        c.lineTo(cx, headY - s * 1.85);
      });
      ink(3, function (c) {
        c.arc(cx - s * 0.32, headY, s * 0.16, 0.2, Math.PI - 0.2);
        c.moveTo(cx + s * 0.48, headY);
        c.arc(cx + s * 0.32, headY, s * 0.16, 0.2, Math.PI - 0.2);
        c.moveTo(cx - s * 0.2, headY + s * 0.4);
        c.quadraticCurveTo(cx, headY + s * 0.55, cx + s * 0.22, headY + s * 0.38);
        c.moveTo(cx + s * 0.62, headY + s * 0.32);
        c.arc(cx + s * 0.48, headY + s * 0.32, s * 0.12, 0, Math.PI * 2);
        c.moveTo(cx - s * 0.36, headY + s * 0.32);
        c.arc(cx - s * 0.48, headY + s * 0.32, s * 0.12, 0, Math.PI * 2);
      });
    }
    const bodyTop = headY + s * 1.05;
    ink(who === "skippy" ? 5 : 4, function (c) {
      c.rect(cx - s * 0.85, bodyTop, s * 1.7, s * 1.3);
      c.moveTo(cx - s * 0.28, bodyTop + s * 0.15);
      c.lineTo(cx + s * 0.28, bodyTop + s * 0.15);
    });
    const bootY = bodyTop + s * 1.55;
    ink(who === "skippy" ? 6 : 5, function (c) {
      c.rect(cx - s * 0.7, bootY, s * 0.55, s * 0.4);
      c.rect(cx + s * 0.15, bootY, s * 0.55, s * 0.4);
    });
    ink(who === "skippy" ? 7 : 6, function (c) {
      const y = bootY + s * 0.55;
      c.rect(cx - s * 1.3, y, s * 2.6, s * 0.22);
      c.rect(cx - s * 1.15, y + s * 0.22, s * 2.3, s * 0.1);
      c.moveTo(cx - s * 1.3, y + s * 0.05);
      c.lineTo(cx - s * 1.6, y + s * 0.16);
    });
    ctx.restore();
  }

  function stamp(ctx, kind, x, y, size) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, size * 0.06);
    if (kind === "star") {
      ctx.fillStyle = "#ffd23a";
      ctx.strokeStyle = "#1a1a22";
      ctx.fill(new Path2D());
      const p = new Path2D();
      starPath(x, y, size)(p);
      ctx.fillStyle = "#ffd23a";
      ctx.fill(p);
      ctx.stroke(p);
    } else if (kind === "moon") {
      ctx.fillStyle = "#f4f0d8";
      ctx.beginPath();
      ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
      ctx.arc(x + size * 0.35, y - size * 0.08, size * 0.62, 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      ctx.strokeStyle = "#1a1a22";
      ctx.stroke();
    } else if (kind === "planet") {
      ctx.fillStyle = "#7eb6ff";
      ctx.beginPath();
      ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1a1a22";
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.28, -0.4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (kind === "board") {
      ctx.fillStyle = "#d5dbe6";
      ctx.strokeStyle = "#1a1a22";
      ctx.beginPath();
      ctx.rect(x - size, y - size * 0.18, size * 2, size * 0.36);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#3ee0ff";
      ctx.fillRect(x - size * 0.85, y + size * 0.18, size * 1.7, size * 0.12);
      ctx.fillStyle = "#ffb03a";
      ctx.beginPath();
      ctx.moveTo(x - size, y - size * 0.05);
      ctx.lineTo(x - size * 1.35, y + size * 0.08);
      ctx.lineTo(x - size, y + size * 0.2);
      ctx.fill();
    } else if (kind === "badge") {
      ctx.fillStyle = "#ffcf67";
      ctx.strokeStyle = "#1a1a22";
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.8);
      ctx.lineTo(x + size * 0.7, y - size * 0.35);
      ctx.lineTo(x + size * 0.55, y + size * 0.7);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size * 0.55, y + size * 0.7);
      ctx.lineTo(x - size * 0.7, y - size * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1a1a22";
      ctx.font = "700 " + Math.round(size * 0.45) + "px Trebuchet MS, DejaVu Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SR", x, y + size * 0.05);
    }
    ctx.restore();
  }

  function floodFill(img, w, h, x, y, rgba, tol) {
    x = x | 0;
    y = y | 0;
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const d = img.data;
    const si = (y * w + x) * 4;
    const sr = d[si];
    const sg = d[si + 1];
    const sb = d[si + 2];
    const sa = d[si + 3];
    const cr = rgba[0];
    const cg = rgba[1];
    const cb = rgba[2];
    const ca = rgba[3];
    if (Math.abs(sr - cr) <= tol && Math.abs(sg - cg) <= tol && Math.abs(sb - cb) <= tol && Math.abs(sa - ca) <= tol) return false;
    function near(i) {
      return Math.abs(d[i] - sr) <= tol && Math.abs(d[i + 1] - sg) <= tol && Math.abs(d[i + 2] - sb) <= tol && Math.abs(d[i + 3] - sa) <= tol;
    }
    const stack = [x, y];
    const seen = new Uint8Array(w * h);
    while (stack.length) {
      const cy = stack.pop();
      let cx = stack.pop();
      let left = cx;
      while (left >= 0 && near((cy * w + left) * 4)) left--;
      left++;
      let right = cx + 1;
      while (right < w && near((cy * w + right) * 4)) right++;
      right--;
      for (let px = left; px <= right; px++) {
        const idx = cy * w + px;
        if (seen[idx]) continue;
        seen[idx] = 1;
        const p = idx * 4;
        d[p] = cr;
        d[p + 1] = cg;
        d[p + 2] = cb;
        d[p + 3] = ca;
        if (cy > 0 && near((idx - w) * 4)) stack.push(px, cy - 1);
        if (cy + 1 < h && near((idx + w) * 4)) stack.push(px, cy + 1);
      }
    }
    return true;
  }

  const MIX_PAGE = { id: "mix-lab", who: "", flavor: "mix", title: "Paint lab", flavorName: "Mix", place: "" };

  root.ART = {
    POTS: POTS,
    POT: POT,
    CAST: CAST,
    DRAW: DRAW,
    pages: metaList,
    mixPage: MIX_PAGE,
    build: build,
    paint: paint,
    hit: hitTest,
    guide: guide,
    stamp: stamp,
    flood: floodFill,
    mix: mixPaints,
    icon: function (ctx, who, w, h) {
      const spec = CAST.filter(function (c) { return c.id === who; })[0] || CAST[1];
      const page = new Page(w, h, "icon");
      add(page, "paper", "Page", "#fffdf8", rr(0, 0, w, h, 0), w / 2, h / 2, 1);
      addRider(page, spec, metrics(spec, "icon", w, h));
      paint(ctx, page, null, "official");
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
