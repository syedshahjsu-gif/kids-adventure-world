const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const STORAGE_KEY = "ALW_PROFILES_V1";

const AVATARS = ["🦊","🐼","🐯","🦁","🐸","🐧","🐵","🐨"];

const defaultProfileState = () => ({
  stars: 0,
  avatar: "🦊",
  math: { tries: 0, correct: 0 },
  words: { tries: 0, correct: 0 },
  draw: { saves: 0 },
  space: { tries: 0, correct: 0 },
  memory: { wins: 0, moves: 0 },
  shapes: { tries: 0, correct: 0 },
  tap: { rounds: 0, bestHits: 0 },
  pattern: { tries: 0, correct: 0 },
  badges: []
});

const defaultAppState = {
  voiceOn: true,
  level: "5-7",
  activeProfileId: "spogmai",
  profiles: {
    spogmai: { name: "Spogmai Aftab Shah", state: defaultProfileState() },
    behrouz: { name: "Syed Behrouz Shah", state: defaultProfileState() }
  }
};

function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultAppState);
    const parsed = JSON.parse(raw);

    // merge safely
    const out = structuredClone(defaultAppState);
    if (typeof parsed.voiceOn === "boolean") out.voiceOn = parsed.voiceOn;
    if (parsed.level === "5-7" || parsed.level === "8-10") out.level = parsed.level;
    if (parsed.activeProfileId && parsed.profiles?.[parsed.activeProfileId]) out.activeProfileId = parsed.activeProfileId;

    if (parsed.profiles && typeof parsed.profiles === "object") {
      for (const [id, p] of Object.entries(parsed.profiles)) {
        if (!p?.name || !p?.state) continue;
        out.profiles[id] = {
          name: String(p.name),
          state: mergeProfileState(p.state)
        };
      }
    }
    // ensure required profiles exist
    if (!out.profiles.spogmai) out.profiles.spogmai = { name: "Spogmai Aftab Shah", state: defaultProfileState() };
    if (!out.profiles.behrouz) out.profiles.behrouz = { name: "Syed Behrouz Shah", state: defaultProfileState() };

    return out;
  } catch {
    return structuredClone(defaultAppState);
  }
}

function mergeProfileState(s) {
  const base = defaultProfileState();
  const out = { ...base, ...(s || {}) };
  out.math = { ...base.math, ...(s?.math || {}) };
  out.words = { ...base.words, ...(s?.words || {}) };
  out.draw = { ...base.draw, ...(s?.draw || {}) };
  out.space = { ...base.space, ...(s?.space || {}) };
  out.memory = { ...base.memory, ...(s?.memory || {}) };
  out.shapes = { ...base.shapes, ...(s?.shapes || {}) };
  out.tap = { ...base.tap, ...(s?.tap || {}) };
  out.pattern = { ...base.pattern, ...(s?.pattern || {}) };
  out.badges = Array.isArray(s?.badges) ? s.badges : [];
  out.avatar = typeof s?.avatar === "string" ? s.avatar : base.avatar;
  out.stars = Number.isFinite(s?.stars) ? s.stars : base.stars;
  return out;
}

let app = loadAppState();

function activeProfile() {
  return app.profiles[app.activeProfileId];
}
function ps() {
  return activeProfile().state;
}

function saveApp() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(app));
  renderAll();
}

/* ---------- Voice ---------- */
function speak(text) {
  if (!app.voiceOn) return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}

function renderVoice() {
  $("#speakToggle").textContent = app.voiceOn ? "🔊 Voice: ON" : "🔇 Voice: OFF";
  $("#voiceHint").textContent = app.voiceOn ? "Voice instructions are ON." : "Voice instructions are OFF.";
}
$("#speakToggle").addEventListener("click", () => {
  app.voiceOn = !app.voiceOn;
  saveApp();
  speak(app.voiceOn ? "Voice is on!" : "Voice is off!");
});

/* ---------- Level ---------- */
function renderLevel() {
  $("#levelSelect").value = app.level;
  $("#levelHint").textContent = `Level: ${app.level}`;
  $("#mathSubtitle").textContent = app.level === "5-7"
    ? "Small numbers and easy questions!"
    : "Bigger numbers and trickier questions!";
}
$("#levelSelect").addEventListener("change", (e) => {
  app.level = e.target.value;
  saveApp();
  speak(app.level === "5-7" ? "Level five to seven." : "Level eight to ten.");
});

/* ---------- Profiles ---------- */
function renderProfiles() {
  const sel = $("#profileSelect");
  sel.innerHTML = "";
  for (const [id, p] of Object.entries(app.profiles)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = p.name;
    if (id === app.activeProfileId) opt.selected = true;
    sel.appendChild(opt);
  }
}
$("#profileSelect").addEventListener("change", (e) => {
  const id = e.target.value;
  if (!app.profiles[id]) return;
  app.activeProfileId = id;
  saveApp();
  speak(`Hello ${activeProfile().name}!`);
});

/* ---------- Reset current profile ---------- */
$("#resetBtn").addEventListener("click", () => {
  if (!confirm(`Reset progress for ${activeProfile().name}?`)) return;
  app.profiles[app.activeProfileId].state = defaultProfileState();
  saveApp();
  showScreen("Home");
});

/* ---------- HUD ---------- */
function renderHUD() {
  $("#starsCount").textContent = String(ps().stars);
  $("#bigAvatar").textContent = ps().avatar;
  $("#welcomeTitle").textContent = `Welcome, ${activeProfile().name}!`;
}

/* ---------- Badges ---------- */
const BADGES = [
  { label: "🧠 Math Hero", rule: () => ps().math.correct >= 5 },
  { label: "📚 Word Wizard", rule: () => ps().words.correct >= 5 },
  { label: "🎨 Artist", rule: () => ps().draw.saves >= 3 },
  { label: "🚀 Space Cadet", rule: () => ps().space.correct >= 5 },
  { label: "🧩 Memory Master", rule: () => ps().memory.wins >= 2 },
  { label: "🌴 Shape Scout", rule: () => ps().shapes.correct >= 6 },
  { label: "☁️ Speed Tapper", rule: () => ps().tap.bestHits >= (app.level === "5-7" ? 10 : 14) },
  { label: "🎵 Pattern Pro", rule: () => ps().pattern.correct >= 6 },
  { label: "🏆 Super Explorer", rule: () => ps().stars >= 25 }
];

function checkBadges() {
  BADGES.forEach(b => {
    if (b.rule() && !ps().badges.includes(b.label)) {
      ps().badges.push(b.label);
      speak("New badge unlocked!");
    }
  });
}

function renderBadges() {
  const row = $("#badgesRow");
  row.innerHTML = "";
  if (ps().badges.length === 0) {
    const pill = document.createElement("div");
    pill.className = "badge";
    pill.textContent = "No badges yet — play to earn!";
    row.appendChild(pill);
    return;
  }
  ps().badges.forEach(b => {
    const pill = document.createElement("div");
    pill.className = "badge";
    pill.textContent = b;
    row.appendChild(pill);
  });
}

/* ---------- Avatars ---------- */
function renderAvatars() {
  const row = $("#avatarRow");
  row.innerHTML = "";
  AVATARS.forEach(a => {
    const b = document.createElement("button");
    b.className = "avatarBtn" + (a === ps().avatar ? " active" : "");
    b.textContent = a;
    b.addEventListener("click", () => {
      ps().avatar = a;
      saveApp();
      speak("Avatar selected!");
    });
    row.appendChild(b);
  });
}

/* ---------- Stars ---------- */
function addStars(n) {
  ps().stars += n;
  checkBadges();
  saveApp();
}

/* ---------- Mascot + Map Locks ---------- */
const WORLD_UNLOCK_STARS = {
  math: 0,
  words: 0,
  draw: 0,
  space: 0,
  memory: 0,
  shapes: 6,
  tap: 10,
  pattern: 14,
  parent: 0
};

function setMascot(text, face = "🤖") {
  const faceEl = $("#mascotFace");
  const speechEl = $("#mascotSpeech");
  if (faceEl) faceEl.textContent = face;
  if (speechEl) speechEl.textContent = text;
}

function canAccessWorld(world) {
  const need = WORLD_UNLOCK_STARS[world] ?? 0;
  return ps().stars >= need;
}

function renderMapLocks() {
  // Add/Remove locked class + tiny requirement hint in title
  $$(".worldCard").forEach(btn => {
    const w = btn.getAttribute("data-world");
    if (!w) return;
    const need = WORLD_UNLOCK_STARS[w] ?? 0;
    const locked = !canAccessWorld(w);
    btn.classList.toggle("locked", locked);
    btn.setAttribute("aria-disabled", locked ? "true" : "false");
    btn.title = locked ? `Locked — earn ⭐ ${need} stars to unlock` : "Open";
  });

  // Mascot guidance
  const next = [
    { w: "shapes", need: WORLD_UNLOCK_STARS.shapes, msg: "Next unlock: 🌴 Jungle Shapes" },
    { w: "tap", need: WORLD_UNLOCK_STARS.tap, msg: "Next unlock: ☁️ Sky Tap Sprint" },
    { w: "pattern", need: WORLD_UNLOCK_STARS.pattern, msg: "Next unlock: 🎵 Pattern Parade" }
  ].find(x => !canAccessWorld(x.w));

  if (next) {
    setMascot(
      `${next.msg}. Earn ${next.need - ps().stars} more ⭐ stars to unlock!`,
      ps().avatar
    );
  } else {
    setMascot("All worlds unlocked! Pick any world and keep earning badges!", ps().avatar);
  }
}

/* ---------- Navigation ---------- */
function showScreen(name) {
  $$(".screen").forEach(s => s.classList.remove("active"));
  $("#screen" + name).classList.add("active");

  if (name === "Math") newMathQuestion(true);
  if (name === "Words") newWordRound(true);
  if (name === "Draw") initCanvasOnce();
  if (name === "Space") newSpaceMission(true);
  if (name === "Memory") newMemoryGame(true);
  if (name === "Shapes") newShapesRound(true);
  if (name === "Tap") resetTapRound(true);
  if (name === "Pattern") newPatternRound(true);
  if (name === "Parent") renderDashboard();

  if (name === "Home") renderMapLocks();
}

$$("[data-nav]").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-nav");
    if (target === "home") showScreen("Home");
  });
});

$$(".worldCard").forEach(card => {
  card.addEventListener("click", () => {
    const w = card.getAttribute("data-world");

    // Locking (only for actual worlds, not parent)
    if (w && !canAccessWorld(w)) {
      const need = WORLD_UNLOCK_STARS[w] ?? 0;
      const msg = `That world is locked. Earn ⭐ ${need} stars to unlock it!`;
      setMascot(msg, "🔒");
      speak(msg);
      return;
    }

    if (w === "math") showScreen("Math");
    if (w === "words") showScreen("Words");
    if (w === "draw") showScreen("Draw");
    if (w === "space") showScreen("Space");
    if (w === "memory") showScreen("Memory");
    if (w === "shapes") showScreen("Shapes");
    if (w === "tap") showScreen("Tap");
    if (w === "pattern") showScreen("Pattern");
    if (w === "parent") showScreen("Parent");
  });
});

/* ---------- Helpers ---------- */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

/* ---------- Math Game (levels) ---------- */
const math = { a: 0, b: 0, op: "+", answer: 0 };

function newMathQuestion(announce=false) {
  const level = app.level;

  const opPool = level === "5-7" ? ["+","-"] : ["+","-","+"]; // mostly +/-
  const op = opPool[randomInt(0, opPool.length - 1)];

  const max = level === "5-7" ? 20 : 50;
  let a = randomInt(1, max);
  let b = randomInt(1, max);
  if (op === "-" && b > a) [a, b] = [b, a];

  const ans = op === "+" ? (a + b) : (a - b);
  Object.assign(math, { a, b, op, answer: ans });

  $("#mathQuestion").textContent = `${a} ${op} ${b}`;
  $("#mathFeedback").textContent = "Pick an answer 👆";
  $("#chest").textContent = "🧰";

  const choices = new Set([ans]);
  while (choices.size < 3) {
    const delta = randomInt(-8, 10);
    const cand = Math.max(0, ans + delta);
    choices.add(cand);
  }
  const arr = shuffle(Array.from(choices));

  const wrap = $("#mathAnswers");
  wrap.innerHTML = "";
  arr.forEach(v => {
    const btn = document.createElement("button");
    btn.className = "answerBtn";
    btn.textContent = String(v);
    btn.addEventListener("click", () => submitMath(v));
    wrap.appendChild(btn);
  });

  if (announce) speak(`Solve ${a} ${op === "+" ? "plus" : "minus"} ${b}.`);
}

function submitMath(value) {
  ps().math.tries += 1;
  if (value === math.answer) {
    ps().math.correct += 1;
    $("#mathFeedback").textContent = "Correct! Treasure found! ⭐ +2";
    $("#chest").textContent = "💎";
    speak("Correct!");
    addStars(2);
  } else {
    $("#mathFeedback").textContent = "Oops—try again!";
    $("#chest").textContent = "🪨";
    speak("Try again!");
    checkBadges(); saveApp();
  }
}

$("#mathNewBtn").addEventListener("click", () => newMathQuestion(true));
$("#mathSpeakBtn").addEventListener("click", () => {
  speak(`Solve ${math.a} ${math.op === "+" ? "plus" : "minus"} ${math.b}.`);
});

/* ---------- Word Game (levels) ---------- */
const wordDeck57 = [
  { word: "Dog", emoji: "🐶" }, { word: "Cat", emoji: "🐱" }, { word: "Sun", emoji: "☀️" },
  { word: "Moon", emoji: "🌙" }, { word: "Fish", emoji: "🐟" }, { word: "Star", emoji: "⭐" }
];
const wordDeck810 = [
  { word: "Planet", emoji: "🪐" }, { word: "Rocket", emoji: "🚀" }, { word: "Rainbow", emoji: "🌈" },
  { word: "Book", emoji: "📘" }, { word: "Mountain", emoji: "⛰️" }, { word: "Ocean", emoji: "🌊" },
  { word: "Apple", emoji: "🍎" }, { word: "Car", emoji: "🚗" }
];
let currentWord = null;

function newWordRound(announce=false) {
  const deck = app.level === "5-7" ? wordDeck57 : wordDeck810;
  currentWord = deck[randomInt(0, deck.length - 1)];

  $("#wordTarget").textContent = currentWord.word;
  $("#wordFeedback").textContent = "Pick the right picture 👆";
  $("#parrot").textContent = "🦜";

  const choices = new Set([currentWord]);
  while (choices.size < 3) choices.add(deck[randomInt(0, deck.length - 1)]);
  const arr = shuffle(Array.from(choices));

  const wrap = $("#wordAnswers");
  wrap.innerHTML = "";
  arr.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "answerBtn";
    btn.textContent = item.emoji;
    btn.style.fontSize = "28px";
    btn.addEventListener("click", () => submitWord(item));
    wrap.appendChild(btn);
  });

  if (announce) speak(`Find ${currentWord.word}.`);
}

function submitWord(choice) {
  ps().words.tries += 1;
  if (choice.word === currentWord.word) {
    ps().words.correct += 1;
    $("#wordFeedback").textContent = "Correct! ⭐ +2";
    $("#parrot").textContent = "🎉";
    speak("Correct!");
    addStars(2);
  } else {
    $("#wordFeedback").textContent = "Try again!";
    $("#parrot").textContent = "😅";
    speak("Try again!");
    checkBadges(); saveApp();
  }
}

$("#wordNewBtn").addEventListener("click", () => newWordRound(true));
$("#wordSpeakBtn").addEventListener("click", () => speak(`Find ${currentWord?.word || "the word"}.`));

/* ---------- Jungle Shapes ---------- */
const shapes57 = [
  { name: "Circle", emoji: "⚪" },
  { name: "Square", emoji: "🟥" },
  { name: "Triangle", emoji: "🔺" },
  { name: "Star", emoji: "⭐" },
  { name: "Heart", emoji: "❤️" }
];
const shapes810 = [
  { name: "Circle", emoji: "⚪" },
  { name: "Square", emoji: "🟦" },
  { name: "Triangle", emoji: "🔻" },
  { name: "Diamond", emoji: "🔷" },
  { name: "Star", emoji: "⭐" },
  { name: "Heart", emoji: "💜" }
];

let currentShape = null;

function newShapesRound(announce=false) {
  const deck = app.level === "5-7" ? shapes57 : shapes810;
  currentShape = deck[randomInt(0, deck.length - 1)];

  $("#shapesTarget").textContent = currentShape.name;
  $("#shapesFeedback").textContent = "Pick the right shape 👆";
  $("#shapesTotem").textContent = "🗿";

  const choices = new Set([currentShape]);
  while (choices.size < 3) choices.add(deck[randomInt(0, deck.length - 1)]);
  const arr = shuffle(Array.from(choices));

  const wrap = $("#shapesAnswers");
  wrap.innerHTML = "";
  arr.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "answerBtn";
    btn.textContent = item.emoji;
    btn.style.fontSize = "30px";
    btn.addEventListener("click", () => submitShape(item));
    wrap.appendChild(btn);
  });

  if (announce) speak(`Find the ${currentShape.name}.`);
}

function submitShape(choice) {
  ps().shapes.tries += 1;
  if (choice.name === currentShape.name) {
    ps().shapes.correct += 1;
    $("#shapesFeedback").textContent = "Correct! ⭐ +2";
    $("#shapesTotem").textContent = "🌿";
    speak("Correct!");
    addStars(2);
  } else {
    $("#shapesFeedback").textContent = "Try again!";
    $("#shapesTotem").textContent = "🪵";
    speak("Try again!");
    checkBadges(); saveApp();
  }
}

$("#shapesNewBtn")?.addEventListener("click", () => newShapesRound(true));
$("#shapesSpeakBtn")?.addEventListener("click", () => speak(`Find the ${currentShape?.name || "shape"}.`));

/* ---------- Drawing ---------- */
let canvasInitialized = false;
let ctx, canvas;
let drawing = false;
let penColor = "#111";
let sticker = null;

function initCanvasOnce() {
  if (canvasInitialized) return;
  canvasInitialized = true;

  canvas = $("#canvas");
  ctx = canvas.getContext("2d");
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top) * (canvas.height / r.height);
    return { x, y };
  }

  canvas.addEventListener("pointerdown", (e) => {
    const p = pos(e);
    if (sticker) {
      ctx.font = "48px system-ui";
      ctx.fillText(sticker, p.x - 20, p.y + 20);
      sticker = null;
      return;
    }
    drawing = true;
    ctx.strokeStyle = penColor;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });

  window.addEventListener("pointerup", () => { drawing = false; });

  $("#clearCanvas").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    speak("Canvas cleared.");
  });

  $("#saveCanvas").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${activeProfile().name}-drawing.png`;
    a.click();

    ps().draw.saves += 1;
    speak("Saved! You earned stars.");
    addStars(2);
  });

  $$(".tool").forEach(t => {
    t.addEventListener("click", () => {
      const c = t.getAttribute("data-color");
      const s = t.getAttribute("data-sticker");
      if (c) { penColor = c; sticker = null; speak("Color selected."); }
      if (s) { sticker = s; speak("Sticker selected. Click on the canvas."); }
    });
  });

  $("#drawSpeakBtn").addEventListener("click", () =>
    speak("Draw with your mouse. Pick colors or stickers. Save to earn stars.")
  );
}

/* ---------- Space Science World ---------- */
const space57 = [
  {
    fact: "The Sun is a star. It gives Earth light and heat.",
    q: "What is the Sun?",
    options: ["A star", "A car", "A fish"],
    answer: "A star"
  },
  {
    fact: "The Moon goes around Earth.",
    q: "What goes around Earth?",
    options: ["The Moon", "A banana", "A chair"],
    answer: "The Moon"
  },
  {
    fact: "Astronauts wear space suits to stay safe in space.",
    q: "What do astronauts wear?",
    options: ["Space suits", "Rain coats", "Shoes only"],
    answer: "Space suits"
  }
];

const space810 = [
  {
    fact: "Jupiter is the largest planet in our solar system.",
    q: "Which planet is the largest?",
    options: ["Jupiter", "Mercury", "Mars"],
    answer: "Jupiter"
  },
  {
    fact: "A day on Earth is about 24 hours because Earth rotates once.",
    q: "Why do we have day and night?",
    options: ["Earth rotates", "Clouds push Earth", "The Moon turns off the Sun"],
    answer: "Earth rotates"
  },
  {
    fact: "A galaxy is a huge group of stars, gas, and dust. The Milky Way is our galaxy.",
    q: "What is the name of our galaxy?",
    options: ["Milky Way", "Candy Way", "Sun City"],
    answer: "Milky Way"
  }
];

let spaceItem = null;

function newSpaceMission(announce=false) {
  const deck = app.level === "5-7" ? space57 : space810;
  spaceItem = deck[randomInt(0, deck.length - 1)];

  $("#spaceFact").textContent = `🌟 Fun Fact: ${spaceItem.fact}`;
  $("#spaceQ").textContent = spaceItem.q;
  $("#spaceFeedback").textContent = "Choose an answer 👆";
  $("#rocketBox").textContent = "🚀";

  const wrap = $("#spaceAnswers");
  wrap.innerHTML = "";
  shuffle(spaceItem.options).forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "answerBtn";
    btn.textContent = opt;
    btn.addEventListener("click", () => submitSpace(opt));
    wrap.appendChild(btn);
  });

  if (announce) speak(`${spaceItem.fact} Question: ${spaceItem.q}`);
}

function submitSpace(choice) {
  ps().space.tries += 1;
  if (choice === spaceItem.answer) {
    ps().space.correct += 1;
    $("#spaceFeedback").textContent = "Correct! Space mission complete! ⭐ +3";
    $("#rocketBox").textContent = "✨";
    speak("Correct!");
    addStars(3);
  } else {
    $("#spaceFeedback").textContent = "Not quite. Try a new mission!";
    $("#rocketBox").textContent = "🪨";
    speak("Try another one!");
    checkBadges(); saveApp();
  }
}

$("#spaceNewBtn").addEventListener("click", () => newSpaceMission(true));
$("#spaceSpeakBtn").addEventListener("click", () => {
  if (!spaceItem) return;
  speak(`${spaceItem.fact} Question: ${spaceItem.q}`);
});

/* ---------- Memory Game (levels) ---------- */
const memIcons = ["⭐","🚀","🦖","🌙","☀️","🪐","🐶","🐱","🌈","🍎","🚗","📘"];

let memFirst = null;
let memLock = false;
let memMatches = 0;
let memMoves = 0;
let memTotalPairs = 0;

function newMemoryGame(announce=false) {
  memFirst = null;
  memLock = false;
  memMatches = 0;
  memMoves = 0;

  const level = app.level;
  memTotalPairs = (level === "5-7") ? 6 : 8; // 12 cards vs 16 cards
  const chosen = shuffle(memIcons).slice(0, memTotalPairs);
  const cards = shuffle([...chosen, ...chosen]);

  $("#memMoves").textContent = "0";
  $("#memMatches").textContent = "0";

  const grid = $("#memoryGrid");
  grid.innerHTML = "";

  // set columns based on level
  grid.style.gridTemplateColumns = level === "5-7" ? "repeat(4, 1fr)" : "repeat(4, 1fr)";

  cards.forEach((icon, idx) => {
    const btn = document.createElement("button");
    btn.className = "memCard hidden";
    btn.setAttribute("data-icon", icon);
    btn.setAttribute("data-idx", String(idx));
    btn.textContent = icon;
    btn.addEventListener("click", () => flipCard(btn));
    grid.appendChild(btn);
  });

  $("#memHint").textContent =
    level === "5-7"
      ? "Level 5–7: 12 cards (6 pairs). Match them all!"
      : "Level 8–10: 16 cards (8 pairs). Match them all!";

  if (announce) speak("Memory game started. Find matching pairs!");
}

function reveal(btn) {
  btn.classList.remove("hidden");
}
function hide(btn) {
  if (btn.classList.contains("matched")) return;
  btn.classList.add("hidden");
}
function flipCard(btn) {
  if (memLock) return;
  if (btn.classList.contains("matched")) return;
  if (!btn.classList.contains("hidden")) return;

  reveal(btn);

  if (!memFirst) {
    memFirst = btn;
    return;
  }

  memMoves += 1;
  $("#memMoves").textContent = String(memMoves);

  const a = memFirst.getAttribute("data-icon");
  const b = btn.getAttribute("data-icon");

  if (a === b) {
    memFirst.classList.add("matched");
    btn.classList.add("matched");
    memMatches += 1;
    $("#memMatches").textContent = String(memMatches);
    memFirst = null;

    if (memMatches === memTotalPairs) {
      // Win
      ps().memory.wins += 1;
      ps().memory.moves += memMoves;
      speak("You won! Great memory!");
      // reward: higher stars for harder level
      addStars(app.level === "5-7" ? 4 : 6);
    }
    return;
  }

  // mismatch
  memLock = true;
  const first = memFirst;
  memFirst = null;
  setTimeout(() => {
    hide(first);
    hide(btn);
    memLock = false;
  }, 650);
}

$("#memNewBtn").addEventListener("click", () => newMemoryGame(true));
$("#memorySpeakBtn").addEventListener("click", () => speak("Flip cards to find matching pairs."));

/* ---------- Sky Tap Sprint ---------- */
let tapTimer = null;
let tapMover = null;
let tapTimeLeft = 15;
let tapHits = 0;
let tapRunning = false;

function placeTapTarget() {
  const arena = $("#tapArena");
  const target = $("#tapTarget");
  if (!arena || !target) return;

  const pad = 16;
  const w = arena.clientWidth;
  const h = arena.clientHeight;
  const x = randomInt(pad, Math.max(pad, w - 72 - pad));
  const y = randomInt(pad, Math.max(pad, h - 72 - pad));

  target.style.left = x + "px";
  target.style.top = y + "px";
}

function stopTapRound(finalize=true) {
  tapRunning = false;
  if (tapTimer) clearInterval(tapTimer);
  if (tapMover) clearInterval(tapMover);
  tapTimer = null;
  tapMover = null;

  if (!finalize) return;

  ps().tap.rounds += 1;
  ps().tap.bestHits = Math.max(ps().tap.bestHits, tapHits);

  // rewards scale with level + performance
  const target = app.level === "5-7" ? 8 : 12;
  const stars = tapHits >= target ? (app.level === "5-7" ? 5 : 7) : 2;
  $("#tapFeedback").textContent = tapHits >= target
    ? `Great job! You got ${tapHits} hits! ⭐ +${stars}`
    : `Nice try! You got ${tapHits} hits. ⭐ +${stars}`;
  $("#tapCloud").textContent = tapHits >= target ? "🌈" : "☁️";
  speak(tapHits >= target ? "Amazing tapping!" : "Good try! Play again to get more hits!");
  addStars(stars);
}

function resetTapRound(announce=false) {
  stopTapRound(false);
  tapTimeLeft = 15;
  tapHits = 0;
  $("#tapTime").textContent = String(tapTimeLeft);
  $("#tapHits").textContent = String(tapHits);
  $("#tapFeedback").textContent = "Press Start 👆";
  $("#tapCloud").textContent = "☁️";
  placeTapTarget();
  if (announce) speak("Press start. Then tap the star as fast as you can!");
}

function startTapRound() {
  if (tapRunning) return;
  tapRunning = true;
  tapTimeLeft = 15;
  tapHits = 0;
  $("#tapTime").textContent = String(tapTimeLeft);
  $("#tapHits").textContent = String(tapHits);
  $("#tapFeedback").textContent = "Go! Tap the ⭐";
  $("#tapCloud").textContent = "☁️";
  placeTapTarget();

  tapMover = setInterval(placeTapTarget, app.level === "5-7" ? 700 : 520);
  tapTimer = setInterval(() => {
    tapTimeLeft -= 1;
    $("#tapTime").textContent = String(tapTimeLeft);
    if (tapTimeLeft <= 0) stopTapRound(true);
  }, 1000);
}

$("#tapStartBtn")?.addEventListener("click", () => startTapRound());
$("#tapSpeakBtn")?.addEventListener("click", () => speak("Tap the flying star before time ends."));
$("#tapTarget")?.addEventListener("click", () => {
  if (!tapRunning) return;
  tapHits += 1;
  $("#tapHits").textContent = String(tapHits);
  $("#tapCloud").textContent = "💨";
  placeTapTarget();
});

/* ---------- Pattern Parade ---------- */
const patternPool = ["🐶","🐱","🦖","🚀","🌈","🍎","⚽","🎈","⭐","🪐"];
let currentPattern = null;

function makePattern() {
  // patterns: ABAB, AABB, ABCD
  const type = randomInt(1, 3);
  const a = patternPool[randomInt(0, patternPool.length - 1)];
  let b = patternPool[randomInt(0, patternPool.length - 1)];
  while (b === a) b = patternPool[randomInt(0, patternPool.length - 1)];
  let c = patternPool[randomInt(0, patternPool.length - 1)];
  while (c === a || c === b) c = patternPool[randomInt(0, patternPool.length - 1)];

  if (type === 1) return { seq: [a,b,a], answer: b };
  if (type === 2) return { seq: [a,a,b], answer: b };
  return { seq: [a,b,c], answer: a }; // loop back
}

function newPatternRound(announce=false) {
  currentPattern = makePattern();
  const [x,y,z] = currentPattern.seq;
  $("#p1").textContent = x;
  $("#p2").textContent = y;
  $("#p3").textContent = z;
  $("#p4").textContent = "?";

  $("#patternFeedback").textContent = "Pick what comes next 👆";
  $("#patternDrum").textContent = "🥁";

  const choices = new Set([currentPattern.answer]);
  while (choices.size < 3) choices.add(patternPool[randomInt(0, patternPool.length - 1)]);
  const arr = shuffle(Array.from(choices));

  const wrap = $("#patternAnswers");
  wrap.innerHTML = "";
  arr.forEach(e => {
    const btn = document.createElement("button");
    btn.className = "answerBtn";
    btn.textContent = e;
    btn.style.fontSize = "30px";
    btn.addEventListener("click", () => submitPattern(e));
    wrap.appendChild(btn);
  });

  if (announce) speak("Look at the pattern. What comes next?");
}

function submitPattern(choice) {
  ps().pattern.tries += 1;
  if (choice === currentPattern.answer) {
    ps().pattern.correct += 1;
    $("#patternFeedback").textContent = "Correct! ⭐ +3";
    $("#patternDrum").textContent = "🎉";
    $("#p4").textContent = choice;
    speak("Correct!");
    addStars(3);
  } else {
    $("#patternFeedback").textContent = "Oops—try again!";
    $("#patternDrum").textContent = "😅";
    speak("Try again!");
    checkBadges(); saveApp();
  }
}

$("#patternNewBtn")?.addEventListener("click", () => newPatternRound(true));
$("#patternSpeakBtn")?.addEventListener("click", () => speak("Pick what comes next in the pattern."));

/* ---------- Dashboard ---------- */
function renderDashboard() {
  $("#dashStars").textContent = String(ps().stars);
  $("#dashMathCorrect").textContent = String(ps().math.correct);
  $("#dashMathTries").textContent = String(ps().math.tries);
  $("#dashWordCorrect").textContent = String(ps().words.correct);
  $("#dashWordTries").textContent = String(ps().words.tries);
  $("#dashDrawSaves").textContent = String(ps().draw.saves);
  $("#dashSpaceCorrect").textContent = String(ps().space.correct);
  $("#dashSpaceTries").textContent = String(ps().space.tries);
  $("#dashMemWins").textContent = String(ps().memory.wins);
  $("#dashMemMoves").textContent = String(ps().memory.moves);
  $("#dashShapeCorrect").textContent = String(ps().shapes.correct);
  $("#dashShapeTries").textContent = String(ps().shapes.tries);
  $("#dashTapBest").textContent = String(ps().tap.bestHits);
  $("#dashTapRounds").textContent = String(ps().tap.rounds);
  $("#dashPatternCorrect").textContent = String(ps().pattern.correct);
  $("#dashPatternTries").textContent = String(ps().pattern.tries);

  const box = $("#dashBadges");
  box.innerHTML = "";
  if (ps().badges.length === 0) {
    const b = document.createElement("div");
    b.className = "badge";
    b.textContent = "No badges yet";
    box.appendChild(b);
    return;
  }
  ps().badges.forEach(label => {
    const pill = document.createElement("div");
    pill.className = "badge";
    pill.textContent = label;
    box.appendChild(pill);
  });
}

/* ---------- Render ---------- */
function renderAll() {
  renderProfiles();
  renderLevel();
  renderVoice();
  renderHUD();
  renderBadges();
  renderAvatars();
  renderDashboard();
  renderMapLocks();
}

checkBadges();
renderAll();
showScreen("Home");