/* Space Riders: Cosmic Academy — lesson content. Build b1.
   Science, tech, and language items are vetted statements.
   Math items are generated and checked with ordinary arithmetic.
   Stories are labeled and are never used as facts. */
(function (root) {
  "use strict";

  function rand(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }
  function pick(arr) {
    return arr[rand(0, arr.length - 1)];
  }
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
  function uniqWrongs(correct, wrongs) {
    const out = [];
    const seen = new Set([String(correct)]);
    wrongs.forEach(function (w) {
      const s = String(w);
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    });
    let n = 1;
    while (out.length < 3) {
      const s = String(correct) + " +" + n;
      n += 1;
      if (!seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
    return out.slice(0, 3);
  }
  function choice(prompt, correct, wrongs, explain, visual) {
    const labels = shuffle([String(correct)].concat(uniqWrongs(correct, wrongs)));
    return {
      kind: "choice",
      prompt: prompt,
      visual: visual || "",
      choices: labels.map(function (label) { return { label: label }; }),
      correct: String(correct),
      explain: explain,
    };
  }

  function dots(n) {
    let html = '<div class="dots" aria-hidden="true">';
    for (let i = 0; i < n; i++) html += "<i></i>";
    html += "</div>";
    return html;
  }
  function bar(num, den) {
    let html = '<div class="fbar" aria-hidden="true">';
    for (let i = 0; i < den; i++) html += '<b class="' + (i < num ? "on" : "") + '"></b>';
    html += "</div>";
    return html;
  }
  function bars(a, b) {
    return (
      '<div class="len"><span>Bar A</span><i style="width:' + (a * 18) + 'px"></i><em>' + a + "</em></div>" +
      '<div class="len"><span>Bar B</span><i style="width:' + (b * 18) + 'px"></i><em>' + b + "</em></div>"
    );
  }
  function shapeFig(kind) {
    if (kind === "tri") return '<svg class="fig" viewBox="0 0 120 100"><polygon points="60,8 112,92 8,92" fill="#fff4d2" stroke="#1a1230" stroke-width="6"/></svg>';
    if (kind === "sq") return '<svg class="fig" viewBox="0 0 120 100"><rect x="22" y="12" width="76" height="76" fill="#fff4d2" stroke="#1a1230" stroke-width="6"/></svg>';
    return '<svg class="fig" viewBox="0 0 120 100"><circle cx="60" cy="50" r="36" fill="#fff4d2" stroke="#1a1230" stroke-width="6"/></svg>';
  }
  function gridFig(x, y, max) {
    const n = max + 1;
    const s = 28;
    const pad = 22;
    let svg = '<svg class="fig gridfig" viewBox="0 0 ' + (pad + n * s + 8) + " " + (pad + n * s + 8) + '">';
    svg += '<line x1="' + pad + '" y1="' + (pad + n * s) + '" x2="' + (pad + n * s) + '" y2="' + (pad + n * s) + '" stroke="#1a1230" stroke-width="3"/>';
    svg += '<line x1="' + pad + '" y1="' + (pad + n * s) + '" x2="' + pad + '" y2="' + pad + '" stroke="#1a1230" stroke-width="3"/>';
    for (let i = 0; i <= max; i++) {
      const px = pad + i * s;
      const py = pad + (max - i) * s;
      svg += '<text x="' + px + '" y="' + (pad + n * s + 14) + '" font-size="11" text-anchor="middle" fill="#1a1230">' + i + "</text>";
      svg += '<text x="12" y="' + (py + 4) + '" font-size="11" fill="#1a1230">' + i + "</text>";
    }
    const sx = pad + x * s;
    const sy = pad + (max - y) * s;
    svg += '<circle cx="' + sx + '" cy="' + sy + '" r="7" fill="#e23b3b"/>';
    svg += "</svg>";
    svg += '<p class="cap">Across first, then up. The corner at 0, 0 is the start.</p>';
    return svg;
  }
  function rectFig(w, h) {
    let svg = '<svg class="fig" viewBox="0 0 ' + (w * 16 + 8) + " " + (h * 16 + 8) + '">';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        svg += '<rect x="' + (4 + x * 16) + '" y="' + (4 + y * 16) + '" width="14" height="14" fill="#ffe08a" stroke="#1a1230"/>';
      }
    }
    svg += "</svg>";
    return svg;
  }
  function angleFig() {
    return (
      '<svg class="fig" viewBox="0 0 280 90">' +
      '<path d="M16 74 L16 20 M16 74 L70 74" fill="none" stroke="#1a1230" stroke-width="4"/>' +
      '<rect x="16" y="62" width="12" height="12" fill="none" stroke="#1a1230"/>' +
      '<text x="28" y="88" font-size="11" fill="#1a1230">right</text>' +
      '<path d="M110 74 L150 28 M110 74 L176 70" fill="none" stroke="#1a1230" stroke-width="4"/>' +
      '<text x="120" y="88" font-size="11" fill="#1a1230">acute</text>' +
      '<path d="M210 74 L214 24 M210 74 L276 60" fill="none" stroke="#1a1230" stroke-width="4"/>' +
      '<text x="220" y="88" font-size="11" fill="#1a1230">obtuse</text>' +
      "</svg>"
    );
  }
  function dayFig() {
    return (
      '<svg class="fig" viewBox="0 0 280 120">' +
      '<circle cx="78" cy="60" r="36" fill="#1b2744"/>' +
      '<path d="M78 24 A36 36 0 0 1 78 96 A28 36 0 0 0 78 24" fill="#3a7bd5"/>' +
      '<circle cx="214" cy="46" r="18" fill="#ffd23a"/>' +
      '<text x="198" y="84" font-size="12" fill="#1a1230">Sun</text>' +
      '<text x="48" y="112" font-size="12" fill="#1a1230">Earth spins</text>' +
      "</svg><p class=\"cap\">Diagram. Not to scale. The bright side faces the Sun.</p>"
    );
  }
  function tiltFig() {
    return (
      '<svg class="fig" viewBox="0 0 280 120">' +
      '<circle cx="46" cy="62" r="16" fill="#ffd23a"/>' +
      '<text x="32" y="96" font-size="11" fill="#1a1230">Sun</text>' +
      '<ellipse cx="170" cy="62" rx="28" ry="28" fill="#3a7bd5"/>' +
      '<line x1="156" y1="34" x2="188" y2="92" stroke="#1a1230" stroke-width="3"/>' +
      '<text x="188" y="40" font-size="11" fill="#1a1230">axis</text>' +
      "</svg><p class=\"cap\">Diagram. Not to scale. The axis is tilted about 23.5 degrees.</p>"
    );
  }
  function rocketFig() {
    return (
      '<svg class="fig" viewBox="0 0 280 110">' +
      '<polygon points="150,18 168,78 132,78" fill="#fff4d2" stroke="#1a1230" stroke-width="3"/>' +
      '<polygon points="140,78 160,78 150,100" fill="#f08a22" stroke="#1a1230" stroke-width="3"/>' +
      '<text x="176" y="40" font-size="12" fill="#1a1230">rocket pushed forward</text>' +
      '<text x="176" y="96" font-size="12" fill="#1a1230">gas pushed back</text>' +
      "</svg><p class=\"cap\">Diagram of the pushes. Not a machine plan.</p>"
    );
  }

  const STORY_FLAG =
    '<p class="story-flag">STORY — reading practice only. This did not happen. It is not a science or history fact.</p>';

  const CLASSES = [
    { id: "art", name: "Art", kicker: "Pictures", blurb: "Color, mix paint, and practice drawing.", note: "Art class is for pictures. Paint mixing is not a science lesson." },
    { id: "math", name: "Math", kicker: "Numbers", blurb: "Count, compute, measure, and read grids.", note: "Every answer here can be checked." },
    { id: "science", name: "Science", kicker: "Facts", blurb: "Day and night, planets, gravity, light, and matter.", note: "Only facts a school teacher can stand behind. No stories in this room." },
    { id: "tech", name: "Tech", kicker: "Instructions", blurb: "Input, order, loops, choices, and fixing mistakes.", note: "A computer follows the instructions it is given." },
    { id: "language", name: "Language", kicker: "Reading", blurb: "Sounds, sight words, vocabulary, and short reading.", note: "Stories are marked STORY. They are not facts." },
  ];

  function poolItem(pool, avoid) {
    const choices = pool.filter(function (q) { return q.correct !== avoid; });
    const q = pick(choices.length ? choices : pool);
    return choice(q.prompt, q.correct, q.wrongs, q.explain, q.visual || "");
  }

  const POOLS = {
    "sci-day": [
      { prompt: "What causes day and night on Earth?", correct: "Earth spins. The side facing the Sun has day.", wrongs: ["The Sun orbits Earth once each day.", "Earth stops spinning at night.", "Clouds turn the Sun off."], explain: "Earth rotates, which means it spins. A day, from noon to the next noon, is about 24 hours. The side facing the Sun has daylight. The side facing away has night. The Sun does not orbit Earth once a day.", visual: dayFig() },
      { prompt: "About how long is one day on Earth, from noon to the next noon?", correct: "about 24 hours", wrongs: ["about 24 minutes", "about 365 hours", "about 1 hour"], explain: "A day is about 24 hours. That is the time from one noon to the next noon as Earth spins." },
      { prompt: "Which part of Earth has daylight?", correct: "the side facing the Sun", wrongs: ["the side facing away from the Sun", "only the inside of Earth", "only the Moon"], explain: "Daylight is on the side of Earth that faces the Sun, because sunlight reaches that side. The other side has night." },
      { prompt: "Does the Sun travel around Earth once each day?", correct: "No. Earth spins.", wrongs: ["Yes. That is what makes a day.", "The Moon pushes the Sun around Earth.", "Earth does not spin."], explain: "Earth orbits the Sun. That trip takes about a year, not a day. Day and night happen because Earth spins." },
    ],
    "sci-bodies": [
      { prompt: "Which one makes its own light?", correct: "a star", wrongs: ["a planet", "a moon", "a rock on the ground"], explain: "A star produces its own light. The Sun is a star. Planets and moons do not make their own light. We see them because they reflect light." },
      { prompt: "What does Earth orbit?", correct: "the Sun", wrongs: ["the Moon", "Mars", "nothing"], explain: "Earth orbits the Sun. One full orbit takes about 365 days, which is about one year. A year is a little longer than 365 days, so calendars sometimes add a leap day." },
      { prompt: "What does the Moon orbit?", correct: "Earth", wrongs: ["Mars", "Jupiter", "The Moon stays fixed while Earth orbits it."], explain: "The Moon orbits Earth. The Moon does not make its own light. We see it because it reflects sunlight." },
      { prompt: "Which sentence is true?", correct: "The Sun is a star. Earth is a planet.", wrongs: ["The Sun is a planet. Earth is a star.", "The Moon is a star.", "Earth makes its own starlight."], explain: "The Sun is a star and makes its own light. Earth is a planet that orbits the Sun. The Moon is not a star. It orbits Earth." },
      { prompt: "About how long does Earth take to orbit the Sun once?", correct: "about 365 days", wrongs: ["about 24 hours", "about 30 days", "about 7 days"], explain: "Earth takes about 365 days to orbit the Sun once. That is about one year. A day, about 24 hours, is one spin, not one orbit." },
    ],
    "sci-planets": [
      { prompt: "Which list is the eight planets in order from the Sun?", correct: "Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune", wrongs: ["Mercury, Venus, Earth, Mars, Jupiter, Saturn, Neptune, Uranus", "Venus, Mercury, Earth, Mars, Jupiter, Saturn, Uranus, Neptune", "Mercury, Earth, Venus, Mars, Jupiter, Saturn, Uranus, Neptune"], explain: "There are eight planets. From the Sun outward they are Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune." },
      { prompt: "What is Pluto?", correct: "a dwarf planet", wrongs: ["the ninth planet", "a moon of Earth", "a star"], explain: "Pluto is a dwarf planet. It is not one of the eight planets." },
      { prompt: "Which planet is third from the Sun?", correct: "Earth", wrongs: ["Venus", "Mars", "Jupiter"], explain: "Mercury is first, Venus is second, and Earth is third from the Sun." },
      { prompt: "Which of the eight planets is farthest from the Sun?", correct: "Neptune", wrongs: ["Uranus", "Saturn", "Pluto"], explain: "Neptune is the eighth planet and the farthest of the eight from the Sun. Pluto is a dwarf planet, not a ninth planet." },
      { prompt: "How many planets are in the Solar System?", correct: "8", wrongs: ["9", "7", "12"], explain: "There are eight planets. Pluto is classified as a dwarf planet, not as a ninth planet." },
    ],
    "sci-gravity": [
      { prompt: "What does Earth's gravity do to a dropped rock?", correct: "It pulls the rock toward Earth.", wrongs: ["It pushes the rock up.", "It makes the rock disappear.", "It only works on metal."], explain: "Gravity pulls objects that have mass toward each other. Earth's gravity pulls the rock toward Earth, so the rock falls." },
      { prompt: "Why does a dropped book fall?", correct: "Earth's gravity pulls it toward Earth.", wrongs: ["The book chooses to fall.", "Air sucks every book down.", "The ground throws the book down."], explain: "Earth has mass, so it pulls on the book. That pull is gravity. The book falls toward Earth." },
      { prompt: "Which way does Earth's gravity pull near the surface?", correct: "toward Earth's center", wrongs: ["away from Earth", "only toward the Moon", "only sideways"], explain: "Near Earth's surface, gravity pulls objects toward Earth's center. That direction is down." },
    ],
    "sci-matter": [
      { prompt: "Which state of matter keeps its own shape?", correct: "solid", wrongs: ["liquid", "gas", "light"], explain: "A solid keeps its own shape. A liquid flows and takes the shape of the part of the container it fills. A gas spreads out to fill its container. Light is not a state of matter." },
      { prompt: "What happens when liquid water freezes?", correct: "It becomes ice, a solid.", wrongs: ["It becomes a different element.", "It becomes light.", "It must become a gas."], explain: "Freezing turns liquid water into ice. Ice is solid water. It is still water. At sea level, pure water freezes at 0°C (32°F)." },
      { prompt: "Which state spreads out to fill its whole container?", correct: "gas", wrongs: ["solid", "a brick", "a coin"], explain: "A gas spreads through the container it is in. A liquid takes the shape of the bottom of its container. A solid keeps its own shape." },
      { prompt: "Ice, liquid water, and water vapor are...", correct: "three states of water", wrongs: ["three different elements", "three kinds of rock", "three kinds of light"], explain: "They are all water. Ice is the solid, liquid water is the liquid, and water vapor is water as a gas." },
    ],
    "sci-light": [
      { prompt: "When do we see an object?", correct: "when light from it enters our eyes", wrongs: ["when our eyes shoot beams that touch it", "when it makes a sound", "only when it is touching our face"], explain: "We see an object when light from it enters our eyes. The object either makes that light or reflects light from something else." },
      { prompt: "Why can we see the Moon?", correct: "The Moon reflects sunlight.", wrongs: ["The Moon makes its own light like a star.", "The Moon is a star.", "Earth's oceans light the Moon."], explain: "The Moon does not make its own light. Sunlight hits the Moon and reflects to our eyes." },
      { prompt: "What is reflection?", correct: "light bouncing off a surface", wrongs: ["light always disappearing", "a solid melting", "Earth spinning"], explain: "Reflection means light bounces off a surface. A mirror reflects light in an orderly way, which is why you can see an image in it." },
    ],
    "sci-seasons": [
      { prompt: "What is the main cause of Earth's seasons?", correct: "Earth's axis is tilted as Earth orbits the Sun.", wrongs: ["Earth is much closer to the Sun in summer.", "The Moon covers the Sun all winter.", "Earth stops spinning in winter."], explain: "Earth's axis is tilted about 23.5 degrees. As Earth orbits the Sun, that tilt gives a hemisphere more direct sunlight and longer days in its summer, and less direct sunlight and shorter days in its winter. Earth is closest to the Sun in January, which is winter in the north, so distance is not what makes summer.", visual: tiltFig() },
      { prompt: "During summer in the northern half of Earth, that half is...", correct: "tilted toward the Sun", wrongs: ["tilted away from the Sun", "not tilted at all", "stopped in its orbit"], explain: "In northern summer, the Northern Hemisphere tilts toward the Sun. Days are longer and sunlight is more direct, so it is warmer there. The southern half has winter at that time." },
      { prompt: "About how much is Earth's axis tilted?", correct: "about 23.5 degrees", wrongs: ["about 90 degrees", "about 1 degree", "it is not tilted"], explain: "Earth's axis is tilted about 23.5 degrees from straight up out of its orbit. That tilt is the main reason for the seasons." },
    ],
    "sci-weight": [
      { prompt: "Why would you weigh less on the Moon than on Earth?", correct: "The Moon has less mass, so its gravity is weaker.", wrongs: ["The Moon has no gravity.", "Your mass disappears on the Moon.", "The Moon pushes you away."], explain: "Weight is the pull of gravity on a mass. The Moon has less mass than Earth, so its surface gravity is weaker. You would weigh about one-sixth as much on the Moon. Your mass would stay the same." },
      { prompt: "What is weight?", correct: "the pull of gravity on a mass", wrongs: ["the same number as mass in every place", "how tall an object is", "how fast an object spins"], explain: "Mass is the amount of matter. Weight is gravity's pull on that mass. The same mass weighs less where gravity is weaker." },
      { prompt: "Which has the stronger surface gravity?", correct: "Earth, because it has more mass than the Moon", wrongs: ["the Moon, because it is smaller", "a pebble, because it is hard", "Earth and the Moon have the same pull"], explain: "The more mass an object has, the stronger its gravity. Earth has more mass than the Moon, so Earth's surface gravity is stronger." },
    ],
    "sci-rockets": [
      { prompt: "A rocket pushes gas backward. What does the gas do to the rocket?", correct: "It pushes the rocket forward.", wrongs: ["Nothing, unless air is in front.", "It pulls the rocket backward.", "It turns gravity off."], explain: "Newton's third law: if one object pushes on a second, the second pushes back with the same strength in the opposite direction. The rocket pushes gas backward. The gas pushes the rocket forward. The rocket does not need outside air.", visual: rocketFig() },
      { prompt: "Do rockets need air to push against?", correct: "No. They push their own gas backward.", wrongs: ["Yes. They cannot move in space.", "They push on the stars.", "They only work indoors."], explain: "A rocket carries the gas it will throw backward. That gas pushes the rocket forward. No outside air is required. This is Newton's third law." },
      { prompt: "Which sentence is Newton's third law, stated for kids?", correct: "A push on one object comes with an equal opposite push on the other.", wrongs: ["Heavier objects always fall faster with no air.", "A still object has no mass.", "Light cannot bounce."], explain: "Forces come in pairs. If A pushes on B, B pushes on A with the same strength, opposite direction, on the other object. The rocket and its exhaust are a pair like that. With no air in the way, objects of different mass fall together. That second fact is not the third law, but it is true." },
    ],
    "sci-refract": [
      { prompt: "What is refraction?", correct: "light changing direction as it enters another clear material", wrongs: ["light bouncing off a mirror", "a rock melting", "Earth rotating"], explain: "Refraction is light changing direction when it passes from one transparent material into another, such as from air into water." },
      { prompt: "Why can a straw in a glass of water look bent?", correct: "Light from the straw refracts at the water.", wrongs: ["The straw really breaks and rejoins.", "The water paints a new straw.", "Gravity folds the straw."], explain: "The straw stays straight. Light from the part under the water changes direction at the boundary. That refraction makes the straw look bent." },
      { prompt: "How do we see a book that does not glow?", correct: "Light hits the book and reflects into our eyes.", wrongs: ["The book makes starlight.", "Our eyes spray light on the book.", "We see the book by hearing it."], explain: "The book does not make light. A lamp or the Sun lights it. Some of that light reflects into our eyes. Reflection is a bounce. Refraction is a change of direction between materials." },
    ],
    "sci-changes": [
      { prompt: "What is melting?", correct: "a solid becoming a liquid", wrongs: ["a gas becoming a rock", "a liquid leaving the universe", "light turning into ice"], explain: "Melting is the change from solid to liquid. The solid gains enough heat to melt. Ice melting into water is an example." },
      { prompt: "At sea level, pure water boils at...", correct: "100°C (212°F)", wrongs: ["0°C (32°F)", "50°C (122°F)", "212°C"], explain: "At sea level, pure water boils at 100°C, or 212°F. It freezes at 0°C, or 32°F. Boiling turns liquid water into water vapor, a gas." },
      { prompt: "What is condensation?", correct: "a gas becoming a liquid", wrongs: ["a solid becoming a gas", "water freezing", "a planet forming"], explain: "Condensation is a gas becoming a liquid. Water vapor can condense into liquid drops." },
      { prompt: "The white cloud above a boiling kettle is mostly...", correct: "tiny drops of liquid water", wrongs: ["the invisible gas itself", "solid iron", "fire"], explain: "Water vapor, the gas, is invisible. The white cloud above a kettle is tiny liquid drops that formed when vapor condensed in cooler air." },
    ],
    "sci-sun": [
      { prompt: "How does the Sun produce its light and heat?", correct: "Nuclear fusion joins hydrogen into helium and releases energy.", wrongs: ["It burns wood like a campfire.", "It reflects light from Earth.", "It is a planet heated by the Moon."], explain: "The Sun is a star made mostly of plasma, a very hot gas of charged particles. Its energy comes from nuclear fusion: hydrogen nuclei join to make helium and release energy. That is not the same as a wood fire." },
      { prompt: "What is the Sun mostly made of?", correct: "hydrogen", wrongs: ["iron", "rock", "oxygen"], explain: "The Sun is mostly hydrogen. Helium is the next largest part. The Sun is a star, not a rock planet." },
    ],
    "tech-ipo": [
      { prompt: "You press a key and a letter appears. Which part is the input?", correct: "pressing the key", wrongs: ["the letter on the screen", "the glow of the screen", "a file you already saved"], explain: "Input is information you give the computer. Pressing the key is input. The computer processes that signal by following instructions. The letter on the screen is output." },
      { prompt: "What is output?", correct: "a result the computer shows or does", wrongs: ["a key that was never pressed", "a fact nobody can know", "only the power cord"], explain: "Output is a result after the computer follows instructions. A picture, a sound, or a letter on the screen can be output." },
      { prompt: "What is computer memory for?", correct: "storing information to use now or later", wrongs: ["making gravity", "changing the seasons", "stopping every instruction"], explain: "Memory stores information. Some is used while you work. Saving a picture keeps information for later. That saved copy is storage." },
      { prompt: "What does process mean for a computer?", correct: "following instructions to work on the input", wrongs: ["skipping the instructions", "melting the keyboard", "orbiting the desk"], explain: "A computer processes by following instructions, step by step. It does not choose to ignore them." },
      { prompt: "You tap a color, a shape fills, you see the color, and you save. Which step stores the picture for later?", correct: "saving the picture", wrongs: ["the shape's outline", "the color's name by itself", "looking away"], explain: "Saving puts the picture into storage so it can be opened later. Tapping is input. The new color on the screen is output." },
    ],
    "tech-loop": [
      { prompt: "Memory starts at 0. A loop adds 1, four times. What is memory then?", correct: "4", wrongs: ["1", "0", "8"], explain: "A loop repeats a step. Adding 1 four times does 0 + 1 + 1 + 1 + 1 = 4." },
      { prompt: "Which instruction is a loop?", correct: "Repeat 3 times: move forward", wrongs: ["Move forward once", "Stop", "Erase the screen and end"], explain: "Repeat 3 times is a loop. The move happens three times. A loop says do this again without writing the same step over and over." },
      { prompt: "A loop says: repeat 3 times, show a star. How many stars are shown?", correct: "3", wrongs: ["1", "6", "0"], explain: "The step inside the loop runs once each time through. Three repeats show three stars." },
      { prompt: "Each move is the same length. Repeat 4 times: move forward, then turn 90 degrees right. What path is that?", correct: "a square", wrongs: ["a straight line with no turns", "a triangle", "a turn with no sides"], explain: "Four equal sides and four quarter-turns of 90 degrees make a square. You finish where you started, facing the same way." },
    ],
    "tech-if": [
      { prompt: "If the number is greater than 10, show BIG. Otherwise show SMALL. The number is 7. What is shown?", correct: "SMALL", wrongs: ["BIG", "10", "7 BIG"], explain: "A condition checks whether something is true. 7 is not greater than 10, so the otherwise step runs and shows SMALL." },
      { prompt: "If the shape is a triangle, say 3. Otherwise say 4. The shape has 4 equal sides and 4 right angles. What should it say?", correct: "4", wrongs: ["3", "5", "0"], explain: "That shape is a square, not a triangle, so the condition is false. The otherwise step says 4. A square has 4 sides and 4 right angles." },
      { prompt: "Memory is 5. If memory is 5, add 2. Otherwise add 10. What is memory after the check?", correct: "7", wrongs: ["15", "5", "2"], explain: "The condition memory is 5 is true, so only add 2 runs. 5 + 2 = 7. The other step does not run." },
    ],
    "tech-debug": [
      { prompt: "We want the screen to show 9. The steps are: Put 6 in memory. Subtract 3. Show memory. Where is the bug?", correct: "Subtract 3 should be Add 3.", wrongs: ["Put 6 is impossible.", "Show memory erases the 6.", "There is no bug. It already shows 9."], explain: "The steps do what they say. 6 - 3 = 3, so the screen shows 3, not 9. Change Subtract 3 to Add 3, because 6 + 3 = 9. Finding and fixing that mistake is debugging." },
      { prompt: "The rover should face right, but one step says turn left. What is the bug?", correct: "The turn step sends it the wrong way.", wrongs: ["Forward means stay still.", "A program cannot have more than one step.", "The computer will fix the turn by itself."], explain: "Each step runs as it is written. A left turn is not a right turn. The computer does not replace it with what you meant. Change the wrong step." },
      { prompt: "A loop should repeat 5 times, but it says repeat 2 times. What is wrong?", correct: "The repeat count is 2 instead of 5.", wrongs: ["Loops always run forever.", "2 times means the same as 5 times.", "The computer adds the missing repeats."], explain: "A loop repeats the number of times it is told. Repeat 2 times runs twice, not five times. Change the 2 to a 5." },
    ],
    "tech-predict": [
      { prompt: "Memory starts at 10. Add 4. Subtract 1. Show memory. What number is shown?", correct: "13", wrongs: ["14", "10", "6"], explain: "Follow the order. 10 + 4 = 14. Then 14 - 1 = 13. The screen shows 13." },
      { prompt: "Memory starts at 3. Repeat 2 times: add 5. Then show. What is shown?", correct: "13", wrongs: ["8", "10", "5"], explain: "The loop runs twice. 3 + 5 = 8, then 8 + 5 = 13. The screen shows 13." },
      { prompt: "If memory is less than 4, show STOP. Otherwise show GO. Memory is 4. What is shown?", correct: "GO", wrongs: ["STOP", "4", "LESS"], explain: "Less than 4 is false when memory is 4. Four is not less than 4. The otherwise step shows GO." },
    ],
    "lang-phonics": [
      { prompt: "Which word has the short a sound, like the a in apple?", correct: "cat", wrongs: ["cake", "tree", "moon"], explain: "Cat has a short a, like the a in apple. Cake has a silent e, and that a says its name. Tree and moon do not have a." },
      { prompt: "Which word has the short o sound, like the o in octopus?", correct: "hop", wrongs: ["hope", "boat", "rain"], explain: "Hop has a short o. Hope has a silent e, so that o says its name." },
      { prompt: "Which word rhymes with pig?", correct: "dig", wrongs: ["page", "moon", "cake"], explain: "Pig and dig both end with the short i sound and then g. Those ending sounds match, so they rhyme." },
      { prompt: "Which word has the short u sound, like the u in umbrella?", correct: "sun", wrongs: ["use", "boat", "cake"], explain: "Sun has a short u, like umbrella. Use does not have that short u sound." },
      { prompt: "How many sounds are in the word map? Say m, a, p.", correct: "3", wrongs: ["1", "2", "4"], explain: "Map has three sounds: m, short a, and p. Tap once for each sound." },
      { prompt: "Which word has the short e sound, like the e in egg?", correct: "bed", wrongs: ["bead", "cake", "moon"], explain: "Bed has a short e, like egg. Bead uses a long e sound." },
    ],
    "lang-sight": [
      { prompt: "Tap the word look.", correct: "look", wrongs: ["book", "lock", "took"], explain: "The word is look: l, o, o, k. It is a common word, so it helps to recognize it quickly." },
      { prompt: "Tap the word said.", correct: "said", wrongs: ["sand", "sad", "side"], explain: "Said means someone spoke. It is the past tense of say. It is not spelled the way it sounds, so readers practice it by sight." },
      { prompt: "Tap the word they.", correct: "they", wrongs: ["then", "the", "tray"], explain: "They stands in for more than one person or thing already named. It is a common sight word." },
      { prompt: "Which spelling is the word that means to use your eyes?", correct: "see", wrongs: ["sea", "she", "sip"], explain: "See means to use your eyes. It is spelled s-e-e. Sea, the ocean, is spelled s-e-a. Those are different words." },
      { prompt: "Tap the word here.", correct: "here", wrongs: ["hear", "her", "hare"], explain: "Here means in this place. It is spelled h-e-r-e. Hear, about ears, is a different word." },
    ],
    "lang-vocab": [
      { prompt: "Which meaning fits the word orbit?", correct: "the path one body takes around another", wrongs: ["a kind of hat", "a mark at the end of a sentence", "a made-up spell"], explain: "An orbit is the path one body takes around another. Earth orbits the Sun. The Moon orbits Earth." },
      { prompt: "Which meaning fits the word reflect?", correct: "to bounce light off a surface", wrongs: ["to stop Earth's spin", "to add two fractions", "to store a file"], explain: "Reflect means to bounce light. We see the Moon because it reflects sunlight." },
      { prompt: "Which meaning fits the word solid?", correct: "a state of matter that keeps its shape", wrongs: ["a gas filling a room", "a question mark", "a loop in a program"], explain: "A solid keeps its own shape. Ice is solid water. Liquid and gas are other states of matter." },
      { prompt: "What is a story?", correct: "a made-up telling, not the same thing as a fact", wrongs: ["the list of the eight planets", "a right angle", "a computer's save file"], explain: "A story is made up by an author. It is for reading. It is not a science fact or a history fact. In this academy, stories are labeled STORY." },
    ],
    "lang-read": [
      { prompt: "In the story, where does Skippy put the map?", correct: "on the table", wrongs: ["in the sea", "on the Moon", "in a boot"], explain: "The first sentence says Skippy puts the map on the table. That answer is inside the story. The story is made up.", visual: STORY_FLAG + '<p class="passage">Skippy puts the map on the table. Spike says, "Let us read it together." Skippy finds a star drawn on the map.</p>' },
      { prompt: "In the story, what does Skippy find drawn on the map?", correct: "a star", wrongs: ["a boat", "a boot", "a math test"], explain: "The last sentence says Skippy finds a star drawn on the map. Stay inside the story for the answer.", visual: STORY_FLAG + '<p class="passage">Skippy puts the map on the table. Spike says, "Let us read it together." Skippy finds a star drawn on the map.</p>' },
      { prompt: "In the story, who says to read the map together?", correct: "Spike", wrongs: ["the map", "a planet", "a computer"], explain: "The story says Spike says, \"Let us read it together.\"", visual: STORY_FLAG + '<p class="passage">Skippy puts the map on the table. Spike says, "Let us read it together." Skippy finds a star drawn on the map.</p>' },
    ],
    "lang-silente": [
      { prompt: "Which word has the long a sound, the name of the letter a?", correct: "cake", wrongs: ["cat", "cap", "map"], explain: "Cake has a silent e at the end. That pattern often makes the earlier vowel say its name. Cat, cap, and map have a short a. The pattern does not work in every English word." },
      { prompt: "Which word has the long i sound?", correct: "kite", wrongs: ["kit", "sit", "pin"], explain: "Kite has a silent e, and the i says its name. Kit, sit, and pin have a short i." },
      { prompt: "Which word has the long o sound?", correct: "hope", wrongs: ["hop", "hot", "top"], explain: "Hope has a silent e, so the o is long. Hop, hot, and top have a short o." },
      { prompt: "Which word ends in e but does NOT have a long vowel?", correct: "have", wrongs: ["cake", "kite", "hope"], explain: "Have ends in e, but the a is not long. English spelling has exceptions. Cake, kite, and hope do follow the silent-e pattern." },
    ],
    "lang-vocab2": [
      { prompt: "In the sentence \"The lamp is bright,\" what does bright mean?", correct: "giving off a lot of light", wrongs: ["very quiet", "made of ice", "under the ground"], explain: "Bright describes something that gives off or reflects a lot of light. A lamp can be bright." },
      { prompt: "What is fuel?", correct: "a material used to produce energy", wrongs: ["a type of triangle", "a punctuation mark", "a dwarf planet"], explain: "Fuel is a material used to produce energy. Some engines burn fuel to run. That is the meaning of the word." },
      { prompt: "What is an author?", correct: "a person who writes a text", wrongs: ["the order of the eight planets", "a 90 degree angle", "a repeat block"], explain: "An author is a person who writes a text, such as a story or a book." },
    ],
    "lang-read2": [
      { prompt: "What is the main idea of this story?", correct: "Spike and Skippy practice reading a story.", wrongs: ["A glove orbits the Sun.", "The window boils water.", "A computer builds a rocket."], explain: "The sentences are about Spike and Skippy reading. The main idea is that they practice reading. The lost glove is inside the story they read. This passage is marked STORY.", visual: STORY_FLAG + '<p class="passage">Skippy and Spike sit by a window. Spike reads a page out loud. The page is a story about a lost glove. Skippy points to one sentence. They read that sentence again.</p>' },
      { prompt: "In the story, what is the page about?", correct: "a lost glove", wrongs: ["the eight planets", "a history of a real king", "how to boil water"], explain: "The passage says the page is a story about a lost glove. It does not say those events happened in real life.", visual: STORY_FLAG + '<p class="passage">Skippy and Spike sit by a window. Spike reads a page out loud. The page is a story about a lost glove. Skippy points to one sentence. They read that sentence again.</p>' },
      { prompt: "In the story, where do they sit?", correct: "by a window", wrongs: ["on Neptune", "under the sea", "inside a math book"], explain: "The first sentence says they sit by a window.", visual: STORY_FLAG + '<p class="passage">Skippy and Spike sit by a window. Spike reads a page out loud. The page is a story about a lost glove. Skippy points to one sentence. They read that sentence again.</p>' },
    ],
    "lang-sentence": [
      { prompt: "Which line is a complete sentence?", correct: "The Moon orbits Earth.", wrongs: ["the moon orbits earth", "Orbits the Earth", "Moon and the"], explain: "A complete sentence starts with a capital letter and ends with a period, question mark, or exclamation point. It names someone or something and what happens. \"The Moon orbits Earth.\" does that. It is also a fact: the Moon orbits Earth." },
      { prompt: "Which line is a science fact, not a story?", correct: "Earth orbits the Sun.", wrongs: ["Skippy's glove can talk.", "The academy ship eats stars.", "Spike paints the Moon blue every night."], explain: "Earth orbits the Sun. That is a science fact. The other lines are made up. Made-up lines can be stories. They are not facts." },
      { prompt: "Which mark ends a question?", correct: "?", wrongs: ["only a comma", "no mark at all", "a second capital letter"], explain: "A question ends with a question mark (?). A telling sentence ends with a period (.)." },
      { prompt: "Which line is a complete sentence about a character?", correct: "Skippy finds a glove.", wrongs: ["finds a glove", "skippy finds a glove", "Skippy a glove"], explain: "\"Skippy finds a glove.\" starts with a capital, tells who and what he does, and ends with a period. It is a sentence about a character. By itself it does not claim the event really happened." },
    ],
  };

  function makeCount() {
    const n = rand(3, 12);
    const wrongs = [n - 1, n + 1, n + 2].filter(function (x) { return x > 0 && x !== n; });
    return choice(
      "How many asteroids are there? Count each one once.",
      String(n),
      wrongs.map(String),
      "Count each asteroid once. The last number you say is the total. There are " + n + ".",
      dots(n)
    );
  }
  function makePlace(big) {
    if (big && Math.random() < 0.45) {
      const th = rand(1, 9);
      const h = rand(0, 9);
      const t = rand(0, 9);
      const o = rand(0, 9);
      const num = th * 1000 + h * 100 + t * 10 + o;
      return choice(
        "What number is " + th + " thousands, " + h + " hundreds, " + t + " tens, and " + o + " ones?",
        String(num),
        [String(th * 100 + h * 10 + t), String(h * 1000 + th * 100 + t * 10 + o), String(num + 10)],
        th + " thousands are " + (th * 1000) + ". " + h + " hundreds are " + (h * 100) + ". " + t + " tens are " + (t * 10) + ". " + o + " ones are " + o + ". Added, that is " + num + ".",
        ""
      );
    }
    const tens = rand(1, 9);
    const ones = rand(0, 9);
    const hundreds = big ? rand(1, 9) : 0;
    const num = hundreds * 100 + tens * 10 + ones;
    const prompt = big
      ? "What number is " + hundreds + " hundreds, " + tens + " tens, and " + ones + " ones?"
      : "What number is " + tens + " tens and " + ones + " ones?";
    const explain = big
      ? hundreds + " hundreds are " + (hundreds * 100) + ". " + tens + " tens are " + (tens * 10) + ". " + ones + " ones are " + ones + ". The number is " + num + "."
      : tens + " tens are " + (tens * 10) + ". " + ones + " ones are " + ones + ". " + (tens * 10) + " + " + ones + " = " + num + ".";
    return choice(prompt, String(num), [String(tens + ones + hundreds), String(ones * 10 + tens), String(num + 10)], explain, "");
  }
  function makeAdd(big) {
    const a = big ? rand(18, 70) : rand(2, 12);
    const b = big ? rand(15, 40) : rand(1, 8);
    const sum = a + b;
    return choice(
      "What is " + a + " + " + b + "?",
      String(sum),
      [String(sum + 1), String(Math.abs(a - b)), String(sum + 10)],
      a + " + " + b + " = " + sum + ". Addition puts groups together. Line the places up if the numbers have more than one digit: ones under ones, tens under tens.",
      ""
    );
  }
  function makeSub(big) {
    const a = big ? rand(40, 90) : rand(8, 18);
    const b = big ? rand(12, a - 5) : rand(1, a - 1);
    const diff = a - b;
    return choice(
      "What is " + a + " - " + b + "?",
      String(diff),
      [String(diff + 1), String(a + b), String(Math.max(0, diff - 1))],
      a + " - " + b + " = " + diff + ". Subtraction tells how many are left. If a digit is too small to subtract, trade 1 from the place to its left. That trade is worth 10 in the place you are subtracting.",
      ""
    );
  }
  function makeMul() {
    const a = rand(2, 9);
    const b = rand(2, 9);
    const p = a * b;
    const visual = p <= 24 ? dots(p) : "";
    return choice(
      "What is " + a + " × " + b + "? That means " + a + " groups of " + b + ".",
      String(p),
      [String(a + b), String(p + a), String(Math.max(1, p - b))],
      a + " × " + b + " means " + a + " groups of " + b + ". That equals " + p + ".",
      visual
    );
  }
  function makeDiv() {
    const b = rand(2, 9);
    const q = rand(2, 9);
    if (Math.random() < 0.5) {
      const a = b * q;
      return choice(
        "What is " + a + " ÷ " + b + "?",
        String(q),
        [String(q + 1), String(b), String(a)],
        a + " ÷ " + b + " = " + q + ". That is " + b + " equal groups of " + q + ", because " + b + " × " + q + " = " + a + ".",
        ""
      );
    }
    const r = rand(1, b - 1);
    const a = b * q + r;
    const ans = q + " remainder " + r;
    return choice(
      "What is " + a + " ÷ " + b + "?",
      ans,
      [q + " remainder " + ((r % (b - 1)) + 1), (q + 1) + " remainder " + r, q + " remainder 0"],
      b + " × " + q + " = " + (b * q) + ". " + a + " - " + (b * q) + " = " + r + ". So " + a + " ÷ " + b + " = " + q + " remainder " + r + ".",
      ""
    );
  }
  function makeFrac() {
    const kind = rand(1, 4);
    if (kind === 1) {
      const den = pick([2, 3, 4, 5, 6, 8]);
      const num = rand(1, den - 1);
      return choice(
        "The bar has " + den + " equal parts. " + num + " " + (num === 1 ? "is" : "are") + " filled. What fraction is filled?",
        num + "/" + den,
        [den + "/" + num, num + "/" + (den + 1), (num === 1 ? den : num - 1) + "/" + den],
        "The denominator, the bottom number, counts the equal parts. That is " + den + ". The numerator, the top number, counts the filled parts. That is " + num + ". The fraction is " + num + "/" + den + ".",
        bar(num, den)
      );
    }
    if (kind === 2) {
      return choice(
        "Which fraction equals 1/2?",
        "2/4",
        ["1/4", "2/3", "3/4"],
        "1/2 means 1 of 2 equal parts. 2/4 means 2 of 4 equal parts. Those amounts are equal. 1/2 = 2/4.",
        bar(1, 2) + bar(2, 4)
      );
    }
    if (kind === 3) {
      return choice(
        "Which fraction is greatest?",
        "1/2",
        ["1/3", "1/4", "1/8"],
        "Each of these fractions has one part filled. A half is a bigger part than a third, a fourth, or an eighth. So 1/2 is the greatest.",
        bar(1, 2) + bar(1, 3)
      );
    }
    const den = pick([4, 5, 6, 8]);
    const a = 1;
    const b = rand(1, den - 2);
    const sum = a + b;
    return choice(
      "What is " + a + "/" + den + " + " + b + "/" + den + "?",
      sum + "/" + den,
      [sum + "/" + (den * 2), a + "/" + b, (sum) + "/" + (den + 1)],
      "The denominators match, so add the numerators and keep the denominator. " + a + " + " + b + " = " + sum + ". The sum is " + sum + "/" + den + ". Do not add the denominators.",
      bar(sum, den)
    );
  }
  function makeShapes() {
    const q = rand(1, 4);
    if (q === 1) return choice("How many straight sides does a triangle have?", "3", ["2", "4", "0"], "A triangle has 3 straight sides and 3 corners.", shapeFig("tri"));
    if (q === 2) return choice("How many straight sides does a square have?", "4", ["3", "5", "0"], "A square has 4 equal straight sides and 4 right angles. Each right angle is 90 degrees.", shapeFig("sq"));
    if (q === 3) return choice("Which shape has no corners?", "circle", ["triangle", "square", "rectangle"], "A circle is round. Every point on it is the same distance from the center. It has no corners.", shapeFig("circ"));
    const a = rand(3, 5);
    const b = a + rand(2, 4);
    return choice(
      "Which bar is longer?",
      "Bar B, " + b + " units",
      ["Bar A, " + a + " units", "They are the same length", "Bar B, " + a + " units"],
      "Length tells how long something is. Count equal units. Bar A is " + a + " units. Bar B is " + b + " units. " + b + " is more than " + a + ", so Bar B is longer.",
      bars(a, b)
    );
  }
  function makeMeasure() {
    const q = rand(1, 5);
    if (q === 1) {
      const w = rand(2, 6);
      const h = rand(2, 5);
      return choice(
        "A rectangle is " + w + " units wide and " + h + " units tall. What is its area in square units?",
        String(w * h),
        [String(2 * (w + h)), String(w + h), String(w * h + 2)],
        "Area is the number of square units inside. For a rectangle, area = width × height. " + w + " × " + h + " = " + (w * h) + " square units.",
        rectFig(w, h)
      );
    }
    if (q === 2) {
      const w = rand(3, 8);
      const h = rand(2, 6);
      const p = 2 * (w + h);
      return choice(
        "A rectangle is " + w + " units wide and " + h + " units tall. What is the perimeter?",
        String(p),
        [String(w * h), String(w + h), String(p + 1)],
        "Perimeter is the distance around the outside. Add all four sides: " + w + " + " + h + " + " + w + " + " + h + " = " + p + ".",
        ""
      );
    }
    if (q === 3) {
      return choice(
        "Which angle measures 90 degrees?",
        "a right angle",
        ["an acute angle", "an obtuse angle", "a straight angle"],
        "A right angle measures 90 degrees. An acute angle is greater than 0 and less than 90. An obtuse angle is greater than 90 and less than 180. A straight angle is 180 degrees.",
        angleFig()
      );
    }
    if (q === 4) {
      return choice(
        "How many centimeters are in 1 meter?",
        "100",
        ["10", "12", "1000"],
        "A meter is a unit of length. By definition, 100 centimeters make 1 meter.",
        ""
      );
    }
    return choice(
      "The distance around a circle, divided by the distance straight across through the center, is about...",
      "3.14",
      ["exactly 2", "exactly 3", "about 10"],
      "That ratio is called π (pi). It is the same for every circle. π is about 3.14. It is not exactly 3.",
      shapeFig("circ")
    );
  }
  function makeGrid(advanced) {
    if (!advanced && Math.random() < 0.3) {
      return choice(
        "On a grid, what do we call the start point (0, 0)?",
        "the origin",
        ["the equator", "a remainder", "a denominator"],
        "The origin is the point (0, 0). Across is 0 and up is 0. It is where the two axes meet.",
        gridFig(0, 0, 4)
      );
    }
    const max = advanced ? 6 : 4;
    const x = rand(0, max);
    const y = rand(0, max);
    const ans = "(" + x + ", " + y + ")";
    return choice(
      "The star is " + x + " across and " + y + " up. Which ordered pair is that?",
      ans,
      ["(" + y + ", " + x + ")", "(" + Math.min(max, x + 1) + ", " + y + ")", "(" + x + ", " + Math.min(max, y + 1) + ")"],
      "The first number is across. The second number is up. The star is " + ans + ".",
      gridFig(x, y, max)
    );
  }
  function makeOrder() {
    const a = rand(2, 8);
    const b = rand(1, 6);
    const n = a + b;
    return {
      kind: "order",
      prompt: "Tap the steps in the order that makes the screen show " + n + ". Memory starts empty. Only one order works.",
      steps: [
        { id: "start", text: "Start" },
        { id: "put", text: "Put " + a + " in memory" },
        { id: "add", text: "Add " + b + " to memory" },
        { id: "show", text: "Show memory" },
      ],
      correct: "start,put,add,show",
      explain: "Order matters. Start, put " + a + " in memory, add " + b + ", then show. " + a + " + " + b + " = " + n + ". If you show before you add, the screen does not show " + n + ". A computer follows the list as written.",
      visual: "",
    };
  }
  function makeBelt(level) {
    if (level === "starter") {
      return {
        kind: "belt",
        prompt: "The rover faces right. The star is three squares straight ahead. Build a program that stops on the star.",
        explain: "Forward moves one square the way the rover is facing. The star is three squares ahead, so the program is Forward, Forward, Forward. The rover does only the steps you give it.",
        cols: 5,
        rows: 3,
        start: { x: 0, y: 1, dir: 1 },
        goal: { x: 3, y: 1 },
        slots: 4,
        blocks: [
          { id: "forward", label: "Forward" },
          { id: "right", label: "Turn right" },
          { id: "left", label: "Turn left" },
        ],
      };
    }
    return {
      kind: "belt",
      prompt: "The belt has only 2 spaces. The star is three squares ahead. Use the repeat block.",
      explain: "Forward ×3 is a loop. It moves forward three times. One repeat block reaches the star. A loop repeats a step so you do not have to write it again and again. The rover still does exactly what the block says.",
      cols: 5,
      rows: 3,
      start: { x: 0, y: 1, dir: 1 },
      goal: { x: 3, y: 1 },
      slots: 2,
      blocks: [
        { id: "forward", label: "Forward" },
        { id: "forward3", label: "Forward ×3" },
        { id: "right", label: "Turn right" },
      ],
    };
  }
  function makeClock() {
    return choice(
      "How many minutes are in 1 hour? How many hours are on a clock day? Pick the pair.",
      "60 minutes, 24 hours",
      ["100 minutes, 10 hours", "30 minutes, 12 hours", "60 minutes, 10 hours"],
      "There are 60 minutes in 1 hour. A clock day has 24 hours. Those are the units we use to measure time on a clock.",
      ""
    );
  }

  const LIST = [
    { id: "math-count", cls: "math", level: "starter", title: "Counting", intro: "Count each thing once. The last number you say is the total.", skill: "count", goal: 4 },
    { id: "math-place", cls: "math", level: "starter", title: "Tens and ones", intro: "Ten ones make one ten. The tens digit sits to the left of the ones digit.", skill: "place", goal: 4 },
    { id: "math-add", cls: "math", level: "starter", title: "Add", intro: "Addition puts groups together.", skill: "add", goal: 4 },
    { id: "math-sub", cls: "math", level: "starter", title: "Subtract", intro: "Subtraction tells how many are left when some are taken away.", skill: "sub", goal: 4 },
    { id: "math-shapes", cls: "math", level: "starter", title: "Shapes and length", intro: "Count sides, corners, or equal units. Do not guess from color.", skill: "shapes", goal: 4 },
    { id: "math-grid", cls: "math", level: "starter", title: "Map grids", intro: "An ordered pair is written (across, up). The start is (0, 0).", skill: "grid", goal: 4 },
    { id: "math-place2", cls: "math", level: "advanced", title: "Hundreds and thousands", intro: "Each place to the left is worth ten times the place on its right.", skill: "place2", goal: 4 },
    { id: "math-add2", cls: "math", level: "advanced", title: "Bigger sums", intro: "Line up ones, tens, and hundreds. Then add each place.", skill: "add2", goal: 4 },
    { id: "math-sub2", cls: "math", level: "advanced", title: "Bigger differences", intro: "If a place is too small, trade 1 from the left. That trade is worth 10.", skill: "sub2", goal: 4 },
    { id: "math-mul", cls: "math", level: "advanced", title: "Multiply", intro: "Multiplication counts equal groups.", skill: "mul", goal: 4 },
    { id: "math-div", cls: "math", level: "advanced", title: "Divide", intro: "Division splits a number into equal groups. A remainder is what is left over.", skill: "div", goal: 4 },
    { id: "math-frac", cls: "math", level: "advanced", title: "Fractions", intro: "The bottom number counts equal parts. The top number counts how many of those parts you have.", skill: "frac", goal: 4 },
    { id: "math-measure", cls: "math", level: "advanced", title: "Measure", intro: "Area covers the inside. Perimeter walks the outside. A right angle is 90 degrees.", skill: "measure", goal: 4 },
    { id: "math-grid2", cls: "math", level: "advanced", title: "Coordinates", intro: "Read across first, then up. Those are the x and y numbers.", skill: "grid2", goal: 4 },

    { id: "sci-day", cls: "science", level: "starter", title: "Day and night", intro: "We will use a fact: Earth spins. The Sun does not orbit Earth once a day.", pool: "sci-day", goal: 4 },
    { id: "sci-bodies", cls: "science", level: "starter", title: "Stars, planets, moons", intro: "A star makes its own light. A planet orbits a star. A moon orbits a planet.", pool: "sci-bodies", goal: 4 },
    { id: "sci-planets", cls: "science", level: "starter", title: "The eight planets", intro: "There are eight planets. Pluto is a dwarf planet.", pool: "sci-planets", goal: 4 },
    { id: "sci-gravity", cls: "science", level: "starter", title: "Gravity", intro: "Gravity pulls objects with mass toward each other.", pool: "sci-gravity", goal: 4 },
    { id: "sci-matter", cls: "science", level: "starter", title: "Solid, liquid, gas", intro: "Three states you meet every day are solid, liquid, and gas.", pool: "sci-matter", goal: 4 },
    { id: "sci-light", cls: "science", level: "starter", title: "Light and seeing", intro: "We see when light enters our eyes.", pool: "sci-light", goal: 4 },
    { id: "sci-seasons", cls: "science", level: "advanced", title: "Seasons", intro: "Seasons come from Earth's tilt, not from Earth getting much closer to the Sun.", pool: "sci-seasons", goal: 4 },
    { id: "sci-weight", cls: "science", level: "advanced", title: "Mass and weight", intro: "Mass is how much matter. Weight is gravity's pull on that mass.", pool: "sci-weight", goal: 4 },
    { id: "sci-rockets", cls: "science", level: "advanced", title: "Rockets", intro: "A rocket pushes gas back. The gas pushes the rocket forward.", pool: "sci-rockets", goal: 4 },
    { id: "sci-refract", cls: "science", level: "advanced", title: "Reflection and refraction", intro: "Reflection is a bounce. Refraction is a bend between clear materials.", pool: "sci-refract", goal: 4 },
    { id: "sci-changes", cls: "science", level: "advanced", title: "Changing state", intro: "Melting, freezing, boiling, and condensation are changes of state.", pool: "sci-changes", goal: 4 },
    { id: "sci-sun", cls: "science", level: "advanced", title: "The Sun", intro: "The Sun is a star. Its energy comes from nuclear fusion, not from a wood fire.", pool: "sci-sun", goal: 4 },

    { id: "tech-ipo", cls: "tech", level: "starter", title: "Input and output", intro: "Input goes in. The computer processes it. Output comes out. Memory stores information.", pool: "tech-ipo", goal: 4 },
    { id: "tech-sequence", cls: "tech", level: "starter", title: "Sequences", intro: "A sequence is a list of steps in order. Order changes the result.", skill: "order", goal: 3 },
    { id: "tech-loop", cls: "tech", level: "starter", title: "Loops", intro: "A loop repeats a step a set number of times.", pool: "tech-loop", goal: 4 },
    { id: "tech-if", cls: "tech", level: "starter", title: "Conditions", intro: "IF the check is true, do one step. OTHERWISE do the other.", pool: "tech-if", goal: 4 },
    { id: "tech-debug", cls: "tech", level: "starter", title: "Debugging", intro: "A bug is a mistake in the instructions. Debugging means find it and fix it.", pool: "tech-debug", goal: 4 },
    { id: "tech-belt", cls: "tech", level: "starter", title: "Belt tool", intro: "Tap blocks to build a program, then run it. The rover does only those steps.", skill: "belt", goal: 1 },
    { id: "tech-predict", cls: "tech", level: "advanced", title: "Read a program", intro: "Work each step in order. Do not skip ahead.", pool: "tech-predict", goal: 4 },
    { id: "tech-belt2", cls: "tech", level: "advanced", title: "Belt loops", intro: "A repeat block runs a move several times. It is still an exact instruction.", skill: "belt2", goal: 1 },

    { id: "lang-phonics", cls: "language", level: "starter", title: "Short vowel sounds", intro: "A short vowel does not say its letter name. Listen to cat, bed, pig, hop, and sun.", pool: "lang-phonics", goal: 4 },
    { id: "lang-sight", cls: "language", level: "starter", title: "Sight words", intro: "Some words show up so often that it helps to know them on sight.", pool: "lang-sight", goal: 4 },
    { id: "lang-vocab", cls: "language", level: "starter", title: "Word meanings", intro: "Pick the meaning a dictionary would agree with.", pool: "lang-vocab", goal: 4 },
    { id: "lang-read", cls: "language", level: "starter", title: "Read a short story", intro: "This passage is a story. Answer from its sentences, not from science class.", pool: "lang-read", goal: 3 },
    { id: "lang-silente", cls: "language", level: "advanced", title: "Silent e", intro: "A silent e often makes the vowel say its name. Not every word follows that pattern.", pool: "lang-silente", goal: 4 },
    { id: "lang-vocab2", cls: "language", level: "advanced", title: "Vocabulary", intro: "Use the meaning of the word, not a guess from a picture.", pool: "lang-vocab2", goal: 4 },
    { id: "lang-read2", cls: "language", level: "advanced", title: "A longer story", intro: "The badge STORY means the events are made up for reading practice.", pool: "lang-read2", goal: 3 },
    { id: "lang-sentence", cls: "language", level: "advanced", title: "Sentences and facts", intro: "A sentence is a grammar form. A fact is a claim that is true. They are not the same thing.", pool: "lang-sentence", goal: 4 },
    { id: "math-clock", cls: "math", level: "starter", title: "Clock units", intro: "An hour has 60 minutes. A clock day has 24 hours.", skill: "clock", goal: 3 },
  ];

  function makeItem(lesson, avoidCorrect) {
    const skill = lesson.skill;
    if (skill === "count") return makeCount();
    if (skill === "place") return makePlace(false);
    if (skill === "place2") return makePlace(true);
    if (skill === "add") return makeAdd(false);
    if (skill === "add2") return makeAdd(true);
    if (skill === "sub") return makeSub(false);
    if (skill === "sub2") return makeSub(true);
    if (skill === "mul") return makeMul();
    if (skill === "div") return makeDiv();
    if (skill === "frac") return makeFrac();
    if (skill === "shapes") return makeShapes();
    if (skill === "measure") return makeMeasure();
    if (skill === "grid") return makeGrid(false);
    if (skill === "grid2") return makeGrid(true);
    if (skill === "order") return makeOrder();
    if (skill === "belt") return makeBelt("starter");
    if (skill === "belt2") return makeBelt("advanced");
    if (skill === "clock") return makeClock();
    if (lesson.pool) return poolItem(POOLS[lesson.pool], avoidCorrect || "");
    throw new Error("No items for " + lesson.id);
  }

  function similar(lesson, previous) {
    let item = makeItem(lesson, previous && previous.correct);
    let guard = 0;
    while (previous && item.correct === previous.correct && item.prompt === previous.prompt && guard < 8) {
      item = makeItem(lesson, previous.correct);
      guard += 1;
    }
    return item;
  }

  function selfCheck() {
    const byId = {};
    LIST.forEach(function (lesson) { byId[lesson.id] = lesson; });
    for (let i = 0; i < 20; i++) {
      ["add", "add2", "sub", "sub2", "mul"].forEach(function (skill) {
        const fake = { skill: skill };
        const item = makeItem(fake);
        const plus = item.prompt.match(/(\d+) \+ (\d+)/);
        const minus = item.prompt.match(/(\d+) - (\d+)/);
        const times = item.prompt.match(/(\d+) × (\d+)/);
        if (plus && String(Number(plus[1]) + Number(plus[2])) !== item.correct) throw new Error("add check");
        if (minus && String(Number(minus[1]) - Number(minus[2])) !== item.correct) throw new Error("sub check");
        if (times && String(Number(times[1]) * Number(times[2])) !== item.correct) throw new Error("mul check");
        if (item.choices.map(function (c) { return c.label; }).indexOf(item.correct) < 0) throw new Error("missing choice");
      });
    }
    const div = makeItem({ skill: "div" });
    if (div.choices.map(function (c) { return c.label; }).indexOf(div.correct) < 0) throw new Error("div choice");
    if (!byId["sci-planets"] || !POOLS["sci-planets"].length) throw new Error("planets");
    return true;
  }

  selfCheck();

  root.LESSONS = {
    CLASSES: CLASSES,
    LIST: LIST,
    makeItem: makeItem,
    similar: similar,
    byClass: function (id) {
      return LIST.filter(function (lesson) { return lesson.cls === id; });
    },
    get: function (id) {
      return LIST.filter(function (lesson) { return lesson.id === id; })[0] || null;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
