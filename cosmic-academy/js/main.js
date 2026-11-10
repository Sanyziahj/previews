/* Space Riders: Cosmic Academy. Build b1. */
(function () {
  "use strict";

  const KEY = "cosmic-academy-b1";
  const ART = window.ART;
  const LESSONS = window.LESSONS;

  function fresh() {
    return { v: 1, stars: 0, mastery: {}, art: { pages: {}, mixes: {}, draw: {}, gallery: [], mixUnlock: false } };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const data = JSON.parse(raw);
      if (!data || data.v !== 1) return fresh();
      data.art = data.art || fresh().art;
      data.mastery = data.mastery || {};
      data.art.gallery = data.art.gallery || [];
      return data;
    } catch (err) {
      return fresh();
    }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (err) { /* full disk stays local */ }
  }
  const store = load();

  const S = {
    screen: "hub",
    classId: "math",
    filter: "all",
    lesson: null,
    order: [],
    prog: [],
    rover: null,
    running: false,
    built: null,
    fills: {},
    undoFills: [],
    pot: "red",
    mixA: null,
    mixB: null,
    mixResult: null,
    made: [],
    drawWho: "skippy",
    drawStep: 1,
    ghost: 1,
    tool: "brush",
    brush: 18,
    stamp: "star",
    mirror: false,
    challenge: "",
    challengeAlpha: 0.34,
    dirty: false,
    fit: null,
    strokeCount: 0,
    paint: null,
    paper: null,
    undo: [],
    redo: [],
    modalThen: null,
  };

  const screenEl = document.getElementById("screen");
  const titleEl = document.getElementById("title");
  const starEl = document.getElementById("star-count");

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function starsUI() { starEl.textContent = String(store.stars); }
  function addStars(n) {
    if (!n) return;
    store.stars += n;
    save();
    starsUI();
  }
  function once(key, n) {
    if (store.mastery[key]) return 0;
    store.mastery[key] = true;
    addStars(n);
    return n;
  }
  function potById(id) {
    if (ART.POT[id]) return ART.POT[id];
    for (let i = 0; i < S.made.length; i++) if (S.made[i].id === id) return S.made[i];
    return ART.POT.red;
  }
  function pageMeta(id) {
    if (id === "mix-lab") return ART.mixPage;
    const all = ART.pages();
    for (let i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return all[0];
  }

  function paintBusts() {
    screenEl.querySelectorAll("canvas.bust").forEach(function (c) {
      const g = c.getContext("2d");
      g.clearRect(0, 0, c.width, c.height);
      ART.icon(g, c.dataset.who || "spike", c.width, c.height);
    });
  }

  function go(screen) {
    S.screen = screen;
    S.dirty = false;
    render();
  }
  function parentDest() {
    if (S.screen === "lesson") return "class";
    if (S.screen === "picker" || S.screen === "gallery" || S.screen === "color" || S.screen === "mix" || S.screen === "draw" || S.screen === "studio") return "art";
    if (S.screen === "art" || S.screen === "class") return "hub";
    return "hub";
  }
  function leaveTo(screen) {
    if (screen === "class" && S.screen === "lesson") S.lesson = null;
    S.dirty = false;
    S.screen = screen;
    render();
  }
  function guard(screen) {
    if (!S.dirty) { leaveTo(screen); return; }
    openModal("This work is not saved. Leave it? Stars you already earned stay on this device.", [
      { label: "Stay", act: "stay" },
      { label: "Save", act: "save-leave" },
      { label: "Leave", act: "leave" },
    ], screen);
  }

  function openModal(text, buttons, dest) {
    S.modalThen = dest || null;
    document.getElementById("modal-text").textContent = text;
    const box = document.getElementById("modal-actions");
    box.innerHTML = buttons.map(function (b) {
      return '<button type="button" data-act="' + b.act + '">' + esc(b.label) + "</button>";
    }).join("");
    document.getElementById("modal").hidden = false;
  }
  function closeModal() { document.getElementById("modal").hidden = true; }

  function render() {
    document.body.dataset.screen = S.screen;
    starsUI();
    if (S.screen === "hub") renderHub();
    else if (S.screen === "class") renderClass();
    else if (S.screen === "art") renderArtHome();
    else if (S.screen === "lesson") renderLesson();
    else if (S.screen === "picker") renderPicker();
    else if (S.screen === "color" || S.screen === "mix") renderColor();
    else if (S.screen === "draw") renderDraw();
    else if (S.screen === "studio") renderStudio();
    else if (S.screen === "gallery") renderGallery();
    paintBusts();
  }

  function renderHub() {
    titleEl.textContent = "Space Riders: Cosmic Academy";
    const doors = LESSONS.CLASSES.map(function (c) {
      const done = LESSONS.byClass(c.id).filter(function (ls) { return store.mastery["done:" + ls.id]; }).length;
      return '<button type="button" class="door ' + c.id + '" data-act="class" data-id="' + c.id + '" aria-label="' + c.name + '">' +
        '<span class="kicker">' + esc(c.kicker) + "</span><b>" + esc(c.name) + "</b><small>" + esc(c.blurb) +
        (done ? " · " + done + " done" : "") + "</small></button>";
    }).join("");
    screenEl.innerHTML =
      '<div class="hub"><div class="hero">' +
      '<canvas class="bust" data-who="spike" width="180" height="180" aria-hidden="true"></canvas>' +
      '<div><p class="hello">Spike is the teacher. Skippy is here to learn too.</p>' +
      '<p class="note">Pick a class. Lessons are short. Stars stay on this device.</p></div>' +
      '<canvas class="bust" data-who="skippy" width="180" height="180" aria-hidden="true"></canvas>' +
      '</div><div class="doors">' + doors + "</div></div>";
  }

  function renderClass() {
    const cls = LESSONS.CLASSES.filter(function (c) { return c.id === S.classId; })[0];
    titleEl.textContent = cls.name + " class";
    if (S.classId === "art") { S.screen = "art"; renderArtHome(); return; }
    const list = LESSONS.byClass(S.classId);
    function group(level, label) {
      const cards = list.filter(function (ls) { return ls.level === level; }).map(function (ls) {
        const done = store.mastery["done:" + ls.id] ? " done" : "";
        return '<button type="button" class="lesson-card' + done + '" data-act="lesson" data-id="' + ls.id + '" aria-label="' + esc(ls.title) + '">' +
          "<b>" + esc(ls.title) + "</b><small>" + (done ? "Mastered" : "Short lesson") + "</small></button>";
      }).join("");
      return '<h2 class="level-h">' + label + "</h2><div class=\"lessons\">" + cards + "</div>";
    }
    screenEl.innerHTML = '<div class="class-wrap"><p class="note">' + esc(cls.note) + "</p>" +
      group("starter", "Starter") + group("advanced", "Advanced") + "</div>";
  }

  function renderArtHome() {
    titleEl.textContent = "Art class · Cosmic Color";
    screenEl.innerHTML =
      '<div class="art-home"><div class="hero">' +
      '<canvas class="bust" data-who="spike" width="160" height="160"></canvas>' +
      '<div><p class="hello">This room is for pictures.</p><p class="note">Paint mixing here is not a science lesson. Free coloring is always allowed.</p></div>' +
      '</div><div class="modes">' +
      '<button type="button" class="mode" data-act="art" data-mode="color"><b>Color In</b><small>Tap a shape. Fill it.</small></button>' +
      '<button type="button" class="mode" data-act="art" data-mode="mix"><b>Color Mix</b><small>Mix two paints.</small></button>' +
      '<button type="button" class="mode" data-act="art" data-mode="draw"><b>Learn to Draw</b><small>Trace, then try.</small></button>' +
      '<button type="button" class="mode" data-act="art" data-mode="studio"><b>Studio</b><small>Brush, stamps, save.</small></button>' +
      "</div>" +
      '<p><button type="button" class="tool" data-act="gallery">Gallery</button></p></div>';
  }

  function renderLesson() {
    const L = S.lesson;
    const def = L.def;
    titleEl.textContent = def.title;
    if (L.phase === "done") {
      screenEl.innerHTML = '<div class="lesson"><div class="qbox"><p class="prompt">Lesson finished.</p><p>' +
        esc(def.title) + " is saved on this device.</p>" +
        '<p>Skippy: I want to try another one too.</p>' +
        '<button type="button" class="choice" data-act="back">Back to class</button></div></div>';
      return;
    }
    const item = L.item;
    let main = "";
    if (L.phase === "ask") {
      if (item.kind === "belt") main = beltHTML(item);
      else if (item.kind === "order") main = orderHTML(item);
      else main = choiceHTML(item);
    }
    let panel = "";
    if (L.phase === "good") {
      panel = '<div class="panel" id="good"><p>Right. +' + L.lastPts + ' stars.</p><p>' + esc(item.explain) +
        '</p>' + (S.beltMsg ? '<p id="belt-result">' + esc(S.beltMsg) + "</p>" : "") +
        '<p>Skippy: I want to try the next one too.</p><button type="button" class="choice" data-act="next">Next</button></div>';
    } else if (L.phase === "explain") {
      panel = '<div class="panel" id="explain"><p>Not yet. Read this, then try a similar one.</p><p>' + esc(item.explain) +
        '</p><button type="button" class="choice" data-act="similar">Try a similar one</button></div>';
    }
    screenEl.innerHTML = '<div class="lesson"><div class="qbox"><p class="prompt">Question ' + (L.n + 1) + " of " + L.goal + "</p>" +
      '<p id="tip">' + esc(L.phase === "ask" ? def.intro : "") + "</p>" + main + "</div>" + panel + "</div>";
  }
  function choiceHTML(item) {
    const buttons = item.choices.map(function (c) {
      return '<button type="button" class="choice" data-act="answer" data-answer="' + esc(c.label) + '">' + esc(c.label) + "</button>";
    }).join("");
    return '<p class="prompt">' + esc(item.prompt) + '</p><div class="visual">' + (item.visual || "") + '</div><div class="choices">' + buttons + "</div>";
  }
  function orderHTML(item) {
    const left = item.steps.filter(function (st) { return S.order.indexOf(st.id) < 0; }).map(function (st) {
      return '<button type="button" class="choice" data-act="order-add" data-id="' + st.id + '">' + esc(st.text) + "</button>";
    }).join("");
    const picked = S.order.map(function (id, i) {
      const st = item.steps.filter(function (s) { return s.id === id; })[0];
      return "<div>" + (i + 1) + ". " + esc(st.text) + "</div>";
    }).join("");
    return '<p class="prompt">' + esc(item.prompt) + '</p><div class="visual">' + (item.visual || "") + "</div>" +
      '<div class="prog">' + (picked || "Tap the steps in order.") + "</div>" +
      '<div class="choices">' + left + "</div>" +
      '<div class="row"><button type="button" class="tool" data-act="order-reset">Reset</button>' +
      '<button type="button" class="tool" data-act="order-check">Check</button></div>';
  }
  function beltHTML(item) {
    const rover = S.rover || item.start;
    let cells = "";
    for (let y = 0; y < item.rows; y++) {
      for (let x = 0; x < item.cols; x++) {
        const goal = item.goal.x === x && item.goal.y === y;
        const here = rover.x === x && rover.y === y;
        cells += '<div class="cell' + (goal ? " goal" : "") + '">' +
          (goal ? "★" : "") +
          (here ? '<span class="rover" style="transform:rotate(' + (rover.dir * 90) + 'deg)">▲</span>' : "") +
          "</div>";
      }
    }
    const names = { forward: "Forward", forward3: "Forward ×3", right: "Turn right", left: "Turn left" };
    const prog = S.prog.map(function (op) { return names[op] || op; }).join(" → ") || "Empty belt";
    const blocks = item.blocks.map(function (b) {
      return '<button type="button" class="tool" data-act="block" data-op="' + b.id + '">' + esc(b.label) + "</button>";
    }).join("");
    return '<p class="prompt">' + esc(item.prompt) + "</p>" +
      '<div class="belt"><div class="cells" style="grid-template-columns:repeat(' + item.cols + ',1fr)">' + cells + "</div>" +
      '<div><p class="prog">' + esc(prog) + "</p><div class=\"row\">" + blocks +
      '<button type="button" class="tool" data-act="belt-undo">Undo</button>' +
      '<button type="button" class="tool" data-act="run">Run</button></div>' +
      '<p id="belt-result">' + esc(S.beltMsg || "") + "</p></div></div>";
  }

  function startLesson(id) {
    const def = LESSONS.get(id);
    S.lesson = { def: def, n: 0, goal: def.goal, item: LESSONS.makeItem(def), phase: "ask", firstTry: true, lastPts: 0 };
    S.order = [];
    S.prog = [];
    S.rover = null;
    S.beltMsg = "";
    S.screen = "lesson";
    S.dirty = false;
    render();
  }
  function succeedLesson() {
    const L = S.lesson;
    const pts = L.firstTry ? 2 : 1;
    addStars(pts);
    L.lastPts = pts;
    L.n += 1;
    L.phase = "good";
    render();
  }
  function missLesson() {
    const L = S.lesson;
    L.firstTry = false;
    L.phase = "explain";
    render();
  }
  function nextLesson() {
    const L = S.lesson;
    if (L.n >= L.goal) {
      once("done:" + L.def.id, 5);
      L.phase = "done";
      render();
      return;
    }
    L.item = LESSONS.makeItem(L.def);
    L.phase = "ask";
    L.firstTry = true;
    S.order = [];
    S.prog = [];
    S.rover = null;
    S.beltMsg = "";
    render();
  }
  function similarLesson() {
    const L = S.lesson;
    L.item = LESSONS.similar(L.def, L.item);
    L.phase = "ask";
    S.order = [];
    S.prog = [];
    S.rover = null;
    S.beltMsg = "";
    render();
  }

  function runBelt() {
    const item = S.lesson.item;
    if (S.running) return;
    if (!S.prog.length) {
      S.beltMsg = "Add a block first. A computer only does the instructions it is given.";
      render();
      return;
    }
    const steps = [];
    S.prog.forEach(function (op) {
      if (op === "forward3") steps.push("forward", "forward", "forward");
      else steps.push(op);
    });
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    let state = { x: item.start.x, y: item.start.y, dir: item.start.dir };
    let bumped = false;
    S.running = true;
    let i = 0;
    function step() {
      if (i < steps.length) {
        const op = steps[i++];
        if (op === "right") state.dir = (state.dir + 1) % 4;
        else if (op === "left") state.dir = (state.dir + 3) % 4;
        else {
          const nx = state.x + dirs[state.dir][0];
          const ny = state.y + dirs[state.dir][1];
          if (nx < 0 || ny < 0 || nx >= item.cols || ny >= item.rows) bumped = true;
          else { state.x = nx; state.y = ny; }
        }
        S.rover = { x: state.x, y: state.y, dir: state.dir };
        render();
        setTimeout(step, 140);
        return;
      }
      S.running = false;
      if (state.x === item.goal.x && state.y === item.goal.y) {
        S.beltMsg = "The rover reached the star.";
        succeedLesson();
      } else {
        S.beltMsg = bumped
          ? "The rover cannot leave the grid, so that step did not move it. The star is still ahead."
          : "The rover stopped before the star. Change the blocks and run again.";
        S.lesson.firstTry = false;
        S.lesson.phase = "explain";
        render();
      }
    }
    step();
  }

  function renderPicker() {
    titleEl.textContent = "Color In";
    const filters = ["all", "Close-up", "Scene", "Neon"].map(function (f) {
      const id = f === "all" ? "all" : f;
      const on = S.filter === (f === "all" ? "all" : f) ? " on" : "";
      return '<button type="button" class="chip' + on + '" data-act="filter" data-filter="' + (f === "all" ? "all" : f) + '">' + f + "</button>";
    }).join("");
    const cards = ART.pages().filter(function (p) {
      return S.filter === "all" || p.flavorName === S.filter;
    }).map(function (p) {
      return '<button type="button" class="card" data-act="page" data-page="' + p.id + '">' +
        '<canvas width="120" height="160" data-preview="' + p.id + '"></canvas>' +
        "<b>" + esc(p.title) + "</b><small>" + esc(p.flavorName + (p.place ? " · " + p.place : "")) + "</small></button>";
    }).join("");
    screenEl.innerHTML = '<div class="picker"><div class="filters">' + filters + '</div><div class="cards">' + cards + "</div></div>";
    queue(drawPreviews);
  }
  function drawPreviews() {
    const nodes = [].slice.call(document.querySelectorAll("[data-preview]"));
    let i = 0;
    function chunk() {
      const stop = Math.min(nodes.length, i + 2);
      for (; i < stop; i++) {
        const c = nodes[i];
        const page = ART.build(pageMeta(c.dataset.preview));
        const g = c.getContext("2d");
        g.setTransform(c.width / page.w, 0, 0, c.height / page.h, 0, 0);
        ART.paint(g, page, null, "official");
      }
      if (i < nodes.length) requestAnimationFrame(chunk);
    }
    requestAnimationFrame(chunk);
  }

  function potButtons(list) {
    return list.map(function (p) {
      const on = S.pot === p.id ? " on" : "";
      return '<button type="button" class="pot' + on + '" data-act="pot" data-pot="' + p.id + '" aria-label="' + esc(p.name) + '">' +
        '<i style="background:' + p.hex + '"></i><span>' + esc(p.name) + "</span></button>";
    }).join("");
  }
  function colorPots() {
    const extra = S.made.slice();
    return potButtons(ART.POTS.concat(extra));
  }
  function mixPots() {
    const base = [ART.POT.red, ART.POT.yellow, ART.POT.blue];
    if (store.art.mixUnlock) base.push(ART.POT.white, ART.POT.black);
    return potButtons(base.concat(S.made));
  }

  function renderColor() {
    const meta = S.built.meta;
    titleEl.textContent = meta.title + " · " + (meta.flavorName || "Mix");
    const mix = S.screen === "mix";
    const tools = mix
      ? '<div class="mixbar"><div class="slot" id="slot-a">Pick</div><span>+</span><div class="slot" id="slot-b">Pick</div>' +
        '<button type="button" class="tool" id="mix-btn" data-act="mix">Mix</button>' +
        '<div id="mix-out"><b id="mix-name">' + esc(S.mixResult ? S.mixResult.name : "") + "</b></div></div>"
      : '<button type="button" class="tool" data-act="undo">Undo</button>' +
        '<button type="button" class="tool" data-act="restart">Restart</button>' +
        '<button type="button" class="tool" data-act="hint">Hint</button>' +
        '<button type="button" class="tool" data-act="next-page">Next</button>' +
        '<button type="button" class="tool" data-act="done-page">Done</button>' +
        '<button type="button" class="tool" data-act="save">Save</button>';
    screenEl.innerHTML = '<div class="play"><div class="tipbar"><canvas class="bust" data-who="spike" width="96" height="96"></canvas><p id="tip">' +
      esc(mix ? "Tap two paints, then Mix. Then paint the big shapes." : "Tap a color, then tap a closed shape.") +
      '</p></div><div class="stage"><canvas id="art"></canvas></div><div class="dock"><div class="row">' + tools +
      '</div><div class="row" id="pot-row">' + (mix ? mixPots() : colorPots()) + "</div></div></div>";
    queue(fitPage);
    if (mix) queue(paintMixSlots);
  }

  function fitPage() {
    const canvas = document.getElementById("art");
    if (!canvas || !S.built) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) { requestAnimationFrame(fitPage); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const page = S.built;
    const s = Math.min(canvas.width / page.w, canvas.height / page.h);
    S.fit = { x: (canvas.width - page.w * s) / 2, y: (canvas.height - page.h * s) / 2, s: s };
    drawColor();
  }
  function drawColor() {
    const canvas = document.getElementById("art");
    if (!canvas || !S.fit) return;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#efe6d4";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(S.fit.s, 0, 0, S.fit.s, S.fit.x, S.fit.y);
    ART.paint(ctx, S.built, S.fills, "paper");
  }
  function pageXY(ev, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
    return { x: (x - S.fit.x) / S.fit.s, y: (y - S.fit.y) / S.fit.s };
  }
  function fillAt(ev) {
    const canvas = document.getElementById("art");
    if (!canvas || !S.fit || !S.built) return;
    const pt = pageXY(ev, canvas);
    const region = ART.hit(S.built, pt.x, pt.y);
    if (!region) return;
    S.undoFills.push(Object.assign({}, S.fills));
    if (S.undoFills.length > 30) S.undoFills.shift();
    S.fills[region.id] = potById(S.pot).hex;
    S.dirty = true;
    drawColor();
  }
  function openPage(id) {
    S.built = ART.build(pageMeta(id));
    S.fills = {};
    S.undoFills = [];
    S.dirty = false;
    S.screen = id === "mix-lab" ? "mix" : "color";
    if (S.screen === "mix") {
      S.mixA = null;
      S.mixB = null;
    }
    render();
  }
  function paintMixSlots() {
    const a = document.getElementById("slot-a");
    const b = document.getElementById("slot-b");
    if (!a || !b) return;
    const pa = S.mixA ? potById(S.mixA) : null;
    const pb = S.mixB ? potById(S.mixB) : null;
    a.textContent = pa ? pa.name : "Pick";
    b.textContent = pb ? pb.name : "Pick";
    a.style.background = pa ? pa.hex : "#fff";
    b.style.background = pb ? pb.hex : "#fff";
    a.style.color = pa && pa.id === "black" ? "#fff" : "#1a1230";
    b.style.color = pb && pb.id === "black" ? "#fff" : "#1a1230";
    const name = document.getElementById("mix-name");
    if (name) name.textContent = S.mixResult ? S.mixResult.name : "";
    const btn = document.getElementById("mix-btn");
    if (btn) btn.disabled = !(S.mixA && S.mixB);
  }
  function doMix() {
    if (!S.mixA || !S.mixB) return;
    const result = ART.mix(potById(S.mixA), potById(S.mixB));
    S.mixResult = result;
    let pot = null;
    for (let i = 0; i < S.made.length; i++) {
      if (S.made[i].hex === result.hex && S.made[i].name === result.name) pot = S.made[i];
    }
    if (!pot) {
      pot = { id: "made-" + S.made.length, name: result.name, hex: result.hex };
      S.made.push(pot);
    }
    S.pot = pot.id;
    if (result.name === "Purple" || result.name === "Orange" || result.name === "Green") store.art.mixUnlock = true;
    once("mix:" + result.name, 3);
    const tip = document.getElementById("tip");
    if (tip) tip.textContent = result.tip;
    const row = document.getElementById("pot-row");
    if (row) row.innerHTML = mixPots();
    paintMixSlots();
    save();
  }

  function renderDraw() {
    const steps = ART.DRAW[S.drawWho];
    const step = steps[S.drawStep - 1];
    const tipText = S.drawFinished
      ? "You finished this drawing lesson. Fade the ghost and try the lines yourself."
      : step.tip;
    titleEl.textContent = "Learn to Draw · " + (S.drawWho === "spike" ? "Spike" : "Skippy");
    const spikeOn = store.art.draw.skippy === "done";
    screenEl.innerHTML = '<div class="play"><div class="tipbar"><canvas class="bust" data-who="spike" width="96" height="96"></canvas><p id="tip">' +
      esc(tipText) + '</p></div><div class="stage"><canvas id="art"></canvas><canvas id="ink"></canvas></div>' +
      '<div class="dock"><div class="row"><span id="step-title">' + esc(step.title) + "</span> " +
      '<button type="button" class="tool" data-act="ghost" id="ghost-btn">Ghost ' + ghostWord() + "</button>" +
      '<button type="button" class="tool" data-act="ink-undo">Undo</button>' +
      '<button type="button" class="tool" data-act="draw-next">' + (S.drawStep === steps.length ? "I drew it" : "Next") + "</button>" +
      (spikeOn ? '<button type="button" class="tool" data-act="draw-who" data-who="spike">Spike</button><button type="button" class="tool" data-act="draw-who" data-who="skippy">Skippy</button>' : "") +
      '</div><div class="row">' + potButtons([ART.POT.black, ART.POT.white, ART.POT.pink, ART.POT.orange, ART.POT.teal, ART.POT.rust, ART.POT.blue]) +
      "</div></div></div>";
    queue(layoutDraw);
  }
  function ghostWord() { return S.ghost >= 0.9 ? "on" : S.ghost > 0 ? "soft" : "off"; }
  function layoutDraw() {
    const art = document.getElementById("art");
    const ink = document.getElementById("ink");
    if (!art || !ink) return;
    const rect = art.getBoundingClientRect();
    if (rect.width < 2) { requestAnimationFrame(layoutDraw); return; }
    sizeCanvas(art, false);
    sizeCanvas(ink, true);
    drawGuide();
    bindInk(ink);
  }
  function sizeCanvas(canvas, keep) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width === w && canvas.height === h) return;
    let copy = null;
    if (keep && canvas.width > 0) {
      copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      copy.getContext("2d").drawImage(canvas, 0, 0);
    }
    canvas.width = w;
    canvas.height = h;
    if (copy) canvas.getContext("2d").drawImage(copy, 0, 0, w, h);
  }
  function drawGuide() {
    const art = document.getElementById("art");
    if (!art) return;
    const ctx = art.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, art.width, art.height);
    ctx.setTransform(art.width / art.getBoundingClientRect().width, 0, 0, art.height / art.getBoundingClientRect().height, 0, 0);
    const rect = art.getBoundingClientRect();
    ART.guide(ctx, S.drawWho, S.drawStep, S.ghost, rect.width, rect.height);
  }
  let inkBound = null;
  function bindInk(canvas) {
    if (inkBound === canvas) return;
    inkBound = canvas;
    let drawing = false;
    let last = null;
    canvas.addEventListener("pointerdown", function (ev) {
      drawing = true;
      canvas.setPointerCapture(ev.pointerId);
      pushInkUndo();
      last = inkPoint(ev, canvas);
      dabInk(canvas, last.x, last.y);
      S.strokeCount += 1;
      S.dirty = true;
    });
    canvas.addEventListener("pointermove", function (ev) {
      if (!drawing) return;
      const p = inkPoint(ev, canvas);
      strokeInk(canvas, last, p);
      last = p;
    });
    function up() { drawing = false; }
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
  }
  const inkUndo = [];
  function pushInkUndo() {
    const ink = document.getElementById("ink");
    if (!ink) return;
    inkUndo.push(ink.getContext("2d").getImageData(0, 0, ink.width, ink.height));
    if (inkUndo.length > 8) inkUndo.shift();
  }
  function inkPoint(ev, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (canvas.width / rect.width),
      y: (ev.clientY - rect.top) * (canvas.height / rect.height),
    };
  }
  function dabInk(canvas, x, y) {
    const g = canvas.getContext("2d");
    g.fillStyle = potById(S.pot).hex;
    const r = Math.max(2, S.brush * (canvas.width / canvas.getBoundingClientRect().width) * 0.35);
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  function strokeInk(canvas, a, b) {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const step = 2;
    const n = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i <= n; i++) {
      dabInk(canvas, a.x + (b.x - a.x) * (i / n), a.y + (b.y - a.y) * (i / n));
    }
  }
  function drawNext() {
    const steps = ART.DRAW[S.drawWho];
    if (S.drawStep < steps.length) {
      S.drawStep += 1;
      const step = steps[S.drawStep - 1];
      const title = document.getElementById("step-title");
      const tip = document.getElementById("tip");
      const btn = document.querySelector("[data-act='draw-next']");
      if (title) title.textContent = step.title;
      if (tip) tip.textContent = step.tip;
      if (btn) btn.textContent = S.drawStep === steps.length ? "I drew it" : "Next";
      drawGuide();
      return;
    }
    store.art.draw[S.drawWho] = "done";
    once("draw:" + S.drawWho, 8);
    S.drawFinished = true;
    render();
  }

  function renderStudio() {
    titleEl.textContent = "Studio";
    const last = store.art.gallery[0];
    screenEl.innerHTML = '<div class="play"><div class="tipbar"><canvas class="bust" data-who="spike" width="96" height="96"></canvas><p id="tip">Brush, fill, erase, stamp, or mirror. Save when you like it.</p></div>' +
      '<div class="stage"><canvas id="view"></canvas>' +
      (last ? '<button type="button" id="thumb-pin" data-gallery-thumb data-act="gallery"><img alt="Saved art" src="' + last.src + '"></button>' : "") +
      '</div><div class="dock"><div class="row">' +
      tool("brush", "Brush") + tool("fill", "Fill") + tool("erase", "Erase") +
      '<button type="button" class="tool" data-act="studio-undo">Undo</button>' +
      '<button type="button" class="tool" data-act="studio-redo">Redo</button>' +
      '<button type="button" class="tool' + (S.mirror ? " on" : "") + '" data-act="mirror">Mirror</button>' +
      '<button type="button" class="tool" data-act="save">Save</button>' +
      '<button type="button" class="tool" data-size="8">S</button>' +
      '<button type="button" class="tool" data-size="18">M</button>' +
      '<button type="button" class="tool" data-size="32">L</button>' +
      "</div><div class=\"row\">" +
      stampBtn("star", "Star") + stampBtn("moon", "Moon") + stampBtn("planet", "Planet") + stampBtn("board", "Board") + stampBtn("badge", "SR badge") +
      '<button type="button" class="tool" data-act="challenge" data-who="skippy">Draw Skippy</button>' +
      '<button type="button" class="tool" data-act="challenge" data-who="spike">Draw Spike</button>' +
      '<button type="button" class="tool" data-act="fade">Fade</button>' +
      '<button type="button" class="tool" data-act="hide-ref">Hide</button>' +
      "</div><div class=\"row\" id=\"pot-row\">" + colorPots() + "</div></div></div>";
    queue(ensureStudio);
  }
  function tool(id, label) {
    return '<button type="button" class="tool' + (S.tool === id ? " on" : "") + '" data-act="tool" data-tool="' + id + '">' + label + "</button>";
  }
  function stampBtn(id, label) {
    return '<button type="button" class="tool' + (S.tool === "stamp" && S.stamp === id ? " on" : "") + '" data-act="stamp" data-stamp="' + id + '">' + label + "</button>";
  }
  function drawPaper(canvas) {
    const g = canvas.getContext("2d");
    g.fillStyle = "#fffdf8";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "#d5e2f6";
    const step = 28 * (canvas.width / 800);
    for (let y = step; y < canvas.height; y += step) g.fillRect(0, y, canvas.width, 1);
  }
  function ensureStudio() {
    const view = document.getElementById("view");
    if (!view) return;
    const rect = view.getBoundingClientRect();
    if (rect.width < 2) { requestAnimationFrame(ensureStudio); return; }
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(rect.width * dpr));
    const h = Math.max(2, Math.round(rect.height * dpr));
    if (!S.paint || S.paint.width !== w || S.paint.height !== h) {
      const next = document.createElement("canvas");
      next.width = w;
      next.height = h;
      if (S.paint) next.getContext("2d").drawImage(S.paint, 0, 0, w, h);
      S.paint = next;
      S.paper = document.createElement("canvas");
      S.paper.width = w;
      S.paper.height = h;
      drawPaper(S.paper);
      S.challengeCanvas = null;
    }
    view.width = w;
    view.height = h;
    if (S.challenge) buildChallenge();
    blitStudio();
    bindStudio(view);
  }
  let studioBound = null;
  function bindStudio(view) {
    if (studioBound === view) return;
    studioBound = view;
    let drawing = false;
    let last = null;
    view.addEventListener("pointerdown", function (ev) {
      if (S.tool === "fill") {
        pushStudioUndo();
        const p = studioPoint(ev, view);
        const g = S.paint.getContext("2d", { willReadFrequently: true });
        const img = g.getImageData(0, 0, S.paint.width, S.paint.height);
        const hex = potById(S.pot).hex;
        const n = parseInt(hex.slice(1), 16);
        ART.flood(img, S.paint.width, S.paint.height, p.x, p.y, [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255], 32);
        g.putImageData(img, 0, 0);
        S.dirty = true;
        blitStudio();
        return;
      }
      drawing = true;
      view.setPointerCapture(ev.pointerId);
      pushStudioUndo();
      last = studioPoint(ev, view);
      if (S.tool === "stamp") placeStamp(last.x, last.y);
      else studioDab(last.x, last.y);
      S.dirty = true;
      S.strokeCount += 1;
      blitStudio();
    });
    view.addEventListener("pointermove", function (ev) {
      if (!drawing || S.tool === "stamp" || S.tool === "fill") return;
      const p = studioPoint(ev, view);
      const dist = Math.hypot(p.x - last.x, p.y - last.y);
      const n = Math.max(1, Math.ceil(dist / 2));
      for (let i = 1; i <= n; i++) studioDab(last.x + (p.x - last.x) * i / n, last.y + (p.y - last.y) * i / n);
      last = p;
      blitStudio();
    });
    function up() { drawing = false; }
    view.addEventListener("pointerup", up);
    view.addEventListener("pointercancel", up);
  }
  function studioPoint(ev, view) {
    const rect = view.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (view.width / rect.width),
      y: (ev.clientY - rect.top) * (view.height / rect.height),
    };
  }
  function studioDab(x, y) {
    const g = S.paint.getContext("2d");
    const erase = S.tool === "erase";
    g.save();
    if (erase) g.globalCompositeOperation = "destination-out";
    g.fillStyle = erase ? "rgba(0,0,0,1)" : potById(S.pot).hex;
    const rect = document.getElementById("view").getBoundingClientRect();
    const r = Math.max(2, (S.brush * 0.5) * (S.paint.width / rect.width));
    function dot(px, py) {
      g.beginPath();
      g.arc(px, py, r, 0, Math.PI * 2);
      g.fill();
    }
    dot(x, y);
    if (S.mirror) dot(S.paint.width - x, y);
    g.restore();
  }
  function placeStamp(x, y) {
    const g = S.paint.getContext("2d");
    const rect = document.getElementById("view").getBoundingClientRect();
    const size = 36 * (S.paint.width / rect.width);
    ART.stamp(g, S.stamp, x, y, size);
    if (S.mirror) ART.stamp(g, S.stamp, S.paint.width - x, y, size);
  }
  function buildChallenge() {
    if (!S.paint || !S.challenge) return;
    const c = document.createElement("canvas");
    c.width = S.paint.width;
    c.height = S.paint.height;
    ART.icon(c.getContext("2d"), S.challenge, c.width, c.height);
    S.challengeCanvas = c;
  }
  function blitStudio() {
    const view = document.getElementById("view");
    if (!view || !S.paint || !S.paper) return;
    const g = view.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(S.paper, 0, 0, view.width, view.height);
    if (S.challengeCanvas && S.challengeAlpha > 0) {
      g.globalAlpha = S.challengeAlpha;
      g.drawImage(S.challengeCanvas, 0, 0, view.width, view.height);
      g.globalAlpha = 1;
    }
    g.drawImage(S.paint, 0, 0);
  }
  function pushStudioUndo() {
    if (!S.paint) return;
    const g = S.paint.getContext("2d");
    S.undo.push(g.getImageData(0, 0, S.paint.width, S.paint.height));
    if (S.undo.length > 8) S.undo.shift();
    S.redo = [];
  }
  function studioUndo(stack, other) {
    if (!stack.length || !S.paint) return;
    const g = S.paint.getContext("2d");
    other.push(g.getImageData(0, 0, S.paint.width, S.paint.height));
    g.putImageData(stack.pop(), 0, 0);
    blitStudio();
  }
  function savePicture() {
    let source = null;
    let title = "Studio piece";
    if (S.screen === "studio") {
      blitStudio();
      source = document.getElementById("view");
      title = S.challenge ? "Study " + S.challenge : "Studio piece";
    } else if (S.screen === "color" || S.screen === "mix") {
      source = document.getElementById("art");
      title = S.built && S.built.meta ? S.built.meta.title : "Color page";
    } else if (S.screen === "draw") {
      source = document.getElementById("ink");
      title = "Drawing " + S.drawWho;
    }
    if (!source) return false;
    const out = document.createElement("canvas");
    const w = 360;
    const h = Math.max(1, Math.round(source.height * (w / source.width)));
    out.width = w;
    out.height = h;
    const g = out.getContext("2d");
    g.fillStyle = "#fffdf8";
    g.fillRect(0, 0, w, h);
    g.drawImage(source, 0, 0, w, h);
    const src = out.toDataURL("image/jpeg", 0.72);
    store.art.gallery.unshift({ id: String(Date.now()), title: title, src: src });
    if (store.art.gallery.length > 16) store.art.gallery.pop();
    addStars(3);
    S.dirty = false;
    save();
    let pin = document.getElementById("thumb-pin");
    if (!pin) {
      const stage = document.querySelector(".stage");
      if (stage) {
        pin = document.createElement("button");
        pin.id = "thumb-pin";
        pin.type = "button";
        pin.dataset.act = "gallery";
        stage.appendChild(pin);
      }
    }
    if (pin) {
      pin.hidden = false;
      pin.innerHTML = '<img alt="Saved art" src="' + src + '">';
      pin.setAttribute("data-gallery-thumb", "1");
    }
    const tip = document.getElementById("tip");
    if (tip) tip.textContent = "Saved. Three stars. It is in your gallery on this device.";
    return true;
  }

  function renderGallery() {
    titleEl.textContent = "Gallery";
    const items = store.art.gallery;
    const grid = items.length
      ? items.map(function (g) {
        return '<figure><img data-gallery-thumb alt="' + esc(g.title) + '" src="' + g.src + '"><figcaption>' + esc(g.title) + "</figcaption></figure>";
      }).join("")
      : "<p>Your saved pictures will land here.</p>";
    screenEl.innerHTML = '<div class="gallery"><div class="gallery-grid">' + grid + "</div></div>";
  }

  function queue(fn) { requestAnimationFrame(fn); }

  document.body.addEventListener("click", function (ev) {
    const b = ev.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === "home") { guard("hub"); return; }
    if (act === "back") { guard(parentDest()); return; }
    if (act === "stay") { closeModal(); return; }
    if (act === "leave") { closeModal(); leaveTo(S.modalThen || "hub"); return; }
    if (act === "save-leave") { savePicture(); closeModal(); leaveTo(S.modalThen || "hub"); return; }
    if (act === "class") {
      S.classId = b.dataset.id;
      if (S.classId === "art") { S.screen = "art"; render(); return; }
      S.screen = "class";
      render();
      return;
    }
    if (act === "lesson") { startLesson(b.dataset.id); return; }
    if (act === "answer") {
      if (!S.lesson || S.lesson.phase !== "ask") return;
      if (b.dataset.answer === S.lesson.item.correct) succeedLesson();
      else missLesson();
      return;
    }
    if (act === "next") { nextLesson(); return; }
    if (act === "similar") { similarLesson(); return; }
    if (act === "order-add") {
      if (S.order.indexOf(b.dataset.id) < 0) S.order.push(b.dataset.id);
      render();
      return;
    }
    if (act === "order-reset") { S.order = []; render(); return; }
    if (act === "order-check") {
      const got = S.order.join(",");
      if (got === S.lesson.item.correct) succeedLesson();
      else missLesson();
      return;
    }
    if (act === "block") {
      const item = S.lesson.item;
      if (S.prog.length >= item.slots) return;
      S.prog.push(b.dataset.op);
      S.beltMsg = "";
      render();
      return;
    }
    if (act === "belt-undo") { S.prog.pop(); render(); return; }
    if (act === "run") { runBelt(); return; }
    if (act === "art") {
      const mode = b.dataset.mode;
      if (mode === "color") { S.screen = "picker"; render(); return; }
      if (mode === "mix") { openPage("mix-lab"); return; }
      if (mode === "draw") {
        S.drawWho = "skippy";
        S.drawStep = 1;
        S.drawFinished = false;
        S.ghost = 1;
        S.screen = "draw";
        S.dirty = false;
        inkBound = null;
        render();
        return;
      }
      if (mode === "studio") {
        S.screen = "studio";
        S.dirty = false;
        studioBound = null;
        S.paint = null;
        render();
        return;
      }
    }
    if (act === "gallery") { S.screen = "gallery"; render(); return; }
    if (act === "filter") { S.filter = b.dataset.filter; render(); return; }
    if (act === "page") { openPage(b.dataset.page); return; }
    if (act === "pot") {
      const id = b.dataset.pot;
      S.pot = id;
      document.querySelectorAll("[data-pot]").forEach(function (el) { el.classList.toggle("on", el.dataset.pot === id); });
      if (S.screen === "mix") {
        if (!S.mixA || S.mixB) { S.mixA = id; S.mixB = null; }
        else S.mixB = id;
        paintMixSlots();
      }
      return;
    }
    if (act === "mix") { doMix(); return; }
    if (act === "undo") {
      const prev = S.undoFills.pop();
      if (prev) { S.fills = prev; drawColor(); }
      return;
    }
    if (act === "restart") {
      S.fills = {};
      S.dirty = false;
      drawColor();
      return;
    }
    if (act === "hint") {
      const tip = document.getElementById("tip");
      if (tip && S.built && S.built.hint) tip.textContent = S.built.hint + " Any color is still a good color.";
      return;
    }
    if (act === "next-page") {
      const all = ART.pages();
      const i = all.findIndex(function (p) { return S.built && p.id === S.built.meta.id; });
      const next = all[(i + 1) % all.length];
      openPage(next.id);
      return;
    }
    if (act === "done-page") {
      const colored = Object.keys(S.fills).length;
      const tip = document.getElementById("tip");
      if (colored < 1) {
        if (tip) tip.textContent = "Add some color first, then tap Done.";
        return;
      }
      once("page:" + S.built.meta.id, 5);
      if (tip) tip.textContent = "That page counts. Five stars if this was the first time.";
      return;
    }
    if (act === "save") { savePicture(); return; }
    if (act === "ghost") {
      S.ghost = S.ghost > 0.9 ? 0.35 : S.ghost > 0 ? 0 : 1;
      const btn = document.getElementById("ghost-btn");
      if (btn) btn.textContent = "Ghost " + ghostWord();
      drawGuide();
      return;
    }
    if (act === "ink-undo") {
      const ink = document.getElementById("ink");
      const prev = inkUndo.pop();
      if (ink && prev) ink.getContext("2d").putImageData(prev, 0, 0);
      return;
    }
    if (act === "draw-next") { drawNext(); return; }
    if (act === "draw-who") {
      S.drawWho = b.dataset.who;
      S.drawStep = 1;
      S.drawFinished = false;
      S.ghost = 1;
      inkBound = null;
      render();
      return;
    }
    if (act === "tool") {
      S.tool = b.dataset.tool;
      document.querySelectorAll("[data-tool], [data-stamp]").forEach(function (el) { el.classList.remove("on"); });
      b.classList.add("on");
      return;
    }
    if (act === "stamp") {
      S.tool = "stamp";
      S.stamp = b.dataset.stamp;
      document.querySelectorAll("[data-tool], [data-stamp]").forEach(function (el) { el.classList.remove("on"); });
      b.classList.add("on");
      return;
    }
    if (act === "mirror") {
      S.mirror = !S.mirror;
      b.classList.toggle("on", S.mirror);
      return;
    }
    if (act === "studio-undo") { studioUndo(S.undo, S.redo); return; }
    if (act === "studio-redo") { studioUndo(S.redo, S.undo); return; }
    if (b.dataset.size) { S.brush = Number(b.dataset.size); return; }
    if (act === "challenge") {
      S.challenge = b.dataset.who;
      S.challengeAlpha = 0.34;
      buildChallenge();
      blitStudio();
      const tip = document.getElementById("tip");
      if (tip) tip.textContent = "A faded picture is there to study. Draw on top. Fade it or hide it when you want.";
      return;
    }
    if (act === "fade") {
      S.challengeAlpha = S.challengeAlpha > 0.3 ? 0.16 : 0.34;
      blitStudio();
      return;
    }
    if (act === "hide-ref") {
      S.challengeAlpha = 0;
      blitStudio();
      return;
    }
  });

  const colorCanvasClick = function (ev) {
    const canvas = ev.target;
    if (canvas.id !== "art" || (S.screen !== "color" && S.screen !== "mix")) return;
    fillAt(ev);
  };
  screenEl.addEventListener("pointerdown", colorCanvasClick);

  window.addEventListener("resize", function () {
    if (S.screen === "color" || S.screen === "mix") fitPage();
    else if (S.screen === "draw") layoutDraw();
    else if (S.screen === "studio") ensureStudio();
  });

  const field = document.getElementById("starfield");
  const dots = [];
  for (let i = 0; i < 42; i++) dots.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.4, v: 0.00008 + Math.random() * 0.0002 });
  function sky(t) {
    requestAnimationFrame(sky);
    if (document.body.dataset.screen !== "hub") return;
    const w = field.clientWidth || window.innerWidth;
    const h = field.clientHeight || window.innerHeight;
    if (field.width !== w) { field.width = w; field.height = h; }
    const g = field.getContext("2d");
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#07061a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff6d0";
    dots.forEach(function (d) {
      d.y += d.v * 16;
      if (d.y > 1) d.y = 0;
      g.fillRect(d.x * w, d.y * h, d.r, d.r);
    });
  }
  requestAnimationFrame(sky);

  window.__AC = {
    build: "b1",
    get screen() { return S.screen; },
    get lesson() { return S.lesson ? S.lesson.def.id : ""; },
    get item() {
      if (!S.lesson) return null;
      const item = S.lesson.item;
      return { correct: item.correct || "", prompt: item.prompt, kind: item.kind || "choice", explain: item.explain };
    },
    stars: function () { return store.stars; },
    gallery: function () { return store.art.gallery; },
    mix: function () { return S.mixResult; },
    fills: function () { return Object.assign({}, S.fills); },
    strokeCount: function () { return S.strokeCount; },
    drawStep: function () { return S.drawStep; },
    clientPoint: function (id) {
      const region = S.built.regions.filter(function (r) { return r.id === id; })[0];
      const canvas = document.getElementById("art");
      const rect = canvas.getBoundingClientRect();
      const px = S.fit.x + region.anchor.x * S.fit.s;
      const py = S.fit.y + region.anchor.y * S.fit.s;
      return {
        x: rect.left + px * (rect.width / canvas.width),
        y: rect.top + py * (rect.height / canvas.height),
      };
    },
  };

  render();
})();
