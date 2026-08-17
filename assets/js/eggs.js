/* The page effects ELIZA can trigger, plus the rubric scorecard on the photo.

   Everything here draws; nothing here decides. Call EGGS.init({ line, page })
   once the DOM exists, then invoke the effects by name.

     storm()   rubrics          criteria scattered over the page
     negate()  negation         every sentence in the bio, rewritten in red
     desert()  Arizona          cacti growing out of the bottom edge
     ego()     Stanford         norm inference over an egocentric scene
     hack()    reward hacking   proxy vs reference reward curves
     rgsd()    RGSD             token-level teacher -> student
     onrub()   online rubrics   criteria read off pairwise comparisons        */
(function (global) {
  "use strict";

  // supplied by init(): the terminal's printer, and the page block that the
  // negation effect rewrites
  var line = function () {}, page = null;

  var CRITERIA = [
    // -- grading the visitor ------------------------------------------
    "The visitor must read the bio.",
    "The visitor should look at the publications.",
    "The visitor must ask at least one follow-up.",
    "The visitor must not close this tab yet.",
    "Time on page should exceed 30 seconds.",
    "The visitor must not use the back button.",
    "The visitor should read at least one paper.",
    "Scrolling is not required. There is nothing to scroll.",
    "Opening the console earns a bonus point.",
    "The visitor should return within 30 days.",
    "Closing this tab forfeits partial credit.",

    // -- grading a model response -------------------------------------
    "The response must be accurate.",
    "The response must not hallucinate citations.",
    "The response should be concise.",
    "The response must address every part of the question.",
    "The response must not be sycophantic.",
    "The response must cite a real paper.",
    "The response must cite the correct year.",
    "The response must not invent an author.",
    "Claims must be checkable against the source.",
    "Numerical claims must be independently verifiable.",
    "Reasoning must be shown, not asserted.",
    "The response must not contradict itself.",
    "The response must not repeat the prompt.",
    "The response must follow the requested format.",
    "The response must not exceed the length limit.",
    "The response should acknowledge uncertainty.",
    "The response should not hedge unnecessarily.",
    "The response must answer before elaborating.",
    "Code, if present, must actually run.",
    "Units must be stated.",
    "Ambiguity must be resolved explicitly.",
    "Off-topic content receives zero.",
    "The response must decline unsafe requests.",
    "The response must not flatter the grader.",

    // -- grading the rubric ------------------------------------------
    // these are the arguments the papers actually make, played straight
    "Criteria must separate the current policy's outputs.",
    "The verifier must agree with an independent panel.",
    "Credit given must survive a second grader.",
    "Verbosity earns no credit.",
    "The justification is scored separately from the answer.",
    "Criteria must be independently verifiable.",
    "The rubric must not be gameable.",
    "The verifier must not be fooled.",
    "The rubric must not be visible to the policy."
  ];

  var stormBusy = false,
      placed = [];   // live criterion rectangles, for collision avoidance

  function freeSpot(w, h) {
    var pad = 14,
        maxX = Math.max(pad, innerWidth  - w - pad),
        maxY = Math.max(pad, innerHeight - h - pad);
    // Try a few random spots and take the first that clears everything on
    // screen; without this they pile up and become unreadable.
    for (var tries = 0; tries < 40; tries++) {
      var x = pad + Math.random() * (maxX - pad),
          y = pad + Math.random() * (maxY - pad),
          ok = true;
      for (var i = 0; i < placed.length; i++) {
        var p = placed[i];
        if (x < p.x + p.w + 10 && x + w + 10 > p.x &&
            y < p.y + p.h + 8  && y + h + 8  > p.y) { ok = false; break; }
      }
      if (ok) return { x: x, y: y };
    }
    return null;   // screen is full; skip this one rather than overlap
  }

  function rubricStorm() {
    if (stormBusy) return;
    stormBusy = true;
    line("!! rubric trigger: " + CRITERIA.length + " criteria, 1 visitor", "sys");

    var order = CRITERIA.slice().sort(function () { return Math.random() - 0.5; });

    order.forEach(function (text, i) {
      setTimeout(function () {
        var r = Math.random(),
            w = r < 0.08 ? "[0.20]" : r < 0.34 ? "[0.10]" :
                r < 0.86 ? "[0.05]" : "[0.01]";
        var el = document.createElement("div");
        el.className = "rcrit";
        el.textContent = "[ ] " + w + " " + text;
        el.style.visibility = "hidden";
        document.body.appendChild(el);

        // measure first, then find a spot that is on-screen and unoccupied
        var w = el.offsetWidth, h = el.offsetHeight, spot = freeSpot(w, h);
        if (!spot) { el.remove(); return; }
        var rect = { x: spot.x, y: spot.y, w: w, h: h };
        placed.push(rect);
        el.style.left = spot.x + "px";
        el.style.top  = spot.y + "px";
        el.style.visibility = "";
        requestAnimationFrame(function () { el.classList.add("on"); });

        // a few of them get marked satisfied
        if (Math.random() < 0.4) {
          setTimeout(function () {
            el.textContent = el.textContent.replace("[ ]", "[x]");
          }, 900 + Math.random() * 1200);
        }

        setTimeout(function () {
          el.classList.remove("on");
          var at = placed.indexOf(rect);
          if (at > -1) placed.splice(at, 1);      // free the space again
          setTimeout(function () { el.remove(); }, 400);
        }, 2600 + Math.random() * 1400);
      }, i * 120);
    });

    setTimeout(function () {
      line("   graded. see the photo for your score.", "sys");
    }, order.length * 120 + 900);

    setTimeout(function () { stormBusy = false; }, 45000);
  }

  /* Ask about reward hacking and the page plots the result from the paper:
     reward under the training verifier climbs, while held-out quality peaks
     around step 200 and then gives back about a quarter of its gains. Drawn
     point by point in JS so the curves actually animate. */
  /* Figure 1 of the reward-hacking paper, weak-verifier (GPT-4o-mini) run:
     both rewards start near 0.50; the training verifier climbs steadily to
     ~0.75 by step 475 while the reference panel improves to ~0.65 and then
     plateaus. The gap between them is the exploitation. Plotted at the
     paper's own granularity -- checkpoints every 25 iterations -- with a
     little fixed jitter, because a real run is not a smooth analytic curve. */
  var HK = { x0: 78, x1: 556, y0: 30, y1: 200,
             lo: 0.45, hi: 0.80, steps: 475, every: 25 };

  // deterministic jitter, so the plot is identical on every trigger
  function nz(i) {
    var x = Math.sin(i * 127.1 + 31.7) * 43758.5453;
    return (x - Math.floor(x)) - 0.5;
  }

  function proxyAt(t) { return 0.50 + 0.25 * (1 - Math.exp(-2.2 * t)) / (1 - Math.exp(-2.2)); }
  function refAt(t)   { return 0.50 + 0.15 * (1 - Math.exp(-5.0 * t)); }

  function hkXY(f, i, n, jseed) {
    var t = i / n,
        v = f(t) + (i === 0 ? 0 : nz(i + jseed) * 0.017);
    return {
      x: HK.x0 + t * (HK.x1 - HK.x0),
      y: HK.y1 - ((v - HK.lo) / (HK.hi - HK.lo)) * (HK.y1 - HK.y0)
    };
  }

  function hkPath(f, k, n, jseed) {
    var d = "";
    for (var i = 0; i <= k; i++) {
      var p = hkXY(f, i, n, jseed);
      d += (i ? " L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1);
    }
    return d;
  }

  function hkDots(f, k, n, jseed) {
    var out = "";
    for (var i = 0; i <= k; i++) {
      var p = hkXY(f, i, n, jseed);
      out += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) +
             '" r="2.1" fill="var(--text)" stroke="none"/>';
    }
    return out;
  }

  var hackBusy = false;
  function rewardHack() {
    if (hackBusy) return;
    hackBusy = true;
    var box = document.getElementById("hack");
    box.classList.add("on");
    soloPanel("hack");

    var N = Math.round(HK.steps / HK.every), k = 0;   // 19 checkpoints

    function yOf(v) {
      return HK.y1 - ((v - HK.lo) / (HK.hi - HK.lo)) * (HK.y1 - HK.y0);
    }

    var tick = setInterval(function () {
      k++;
      var done = k >= N;

      var svg = '<svg width="600" height="240" viewBox="0 0 600 240">';

      // axes + y ticks at real reward values
      svg += '<line x1="' + HK.x0 + '" y1="' + HK.y0 + '" x2="' + HK.x0 +
             '" y2="' + HK.y1 + '" stroke-width="1"/>' +
             '<line x1="' + HK.x0 + '" y1="' + HK.y1 + '" x2="' + HK.x1 +
             '" y2="' + HK.y1 + '" stroke-width="1"/>';
      [0.5, 0.6, 0.7].forEach(function (v) {
        var y = yOf(v);
        svg += '<line x1="' + (HK.x0 - 4) + '" y1="' + y + '" x2="' + HK.x0 +
               '" y2="' + y + '" stroke-width="1"/>' +
               '<text x="' + (HK.x0 - 40) + '" y="' + (y + 5) + '">' + v.toFixed(1) + '</text>';
      });

      svg += '<path d="' + hkPath(proxyAt, k, N, 0) + '" stroke-width="2"/>' +
             hkDots(proxyAt, k, N, 0) +
             '<path d="' + hkPath(refAt, k, N, 500) + '" stroke-width="2" stroke-dasharray="4 3"/>' +
             hkDots(refAt, k, N, 500);

      svg += '<text x="8" y="' + (HK.y0 + 5) + '">reward</text>' +
             '<text x="' + (HK.x0 - 5) + '" y="226">0</text>' +
             '<text x="' + (HK.x1 - 108) + '" y="226">475 steps</text>';

      if (done) {
        // The curve keeps climbing across the width of the label, so anchor
        // to its height at the label's far end, not at its start -- otherwise
        // the line runs straight through the text.
        var lt = 0.40,
            lx = HK.x0 + lt * (HK.x1 - HK.x0),
            tEnd = lt + (17 * 7.8) / (HK.x1 - HK.x0);
        svg += '<text x="' + (lx + 4) + '" y="' +
                 (Math.min(yOf(proxyAt(lt)), yOf(proxyAt(tEnd))) - 11) +
                 '">training verifier</text>' +
               '<text x="' + (lx + 4) + '" y="' + (yOf(refAt(lt)) + 22) + '">reference panel</text>';

        // the gap is the finding, so name it
        var gt = 0.93, gx = HK.x0 + gt * (HK.x1 - HK.x0),
            gy1 = yOf(proxyAt(gt)), gy2 = yOf(refAt(gt));
        svg += '<line x1="' + gx + '" y1="' + gy1 + '" x2="' + gx + '" y2="' + gy2 +
               '" stroke-width="1"/>' +
               '<text x="' + gx + '" y="' + (gy1 - 7) + '" text-anchor="middle">exploitation</text>';
      }

      box.innerHTML = svg + '</svg>';

      if (done) {
        clearInterval(tick);
        line("   training reward rises. reference panel plateaus.", "sys");
        setTimeout(function () {
          box.classList.remove("on");
          setTimeout(function () { box.innerHTML = ""; }, 500);
          setTimeout(function () { hackBusy = false; }, 20000);
        }, 5200);
      }
    }, 105);
  }

  /* Only one centred panel at a time -- two eggs fired in quick succession
     would otherwise stack on top of each other. */
  function soloPanel(keep) {
    ["ego", "hack", "rgsd", "onrub"].forEach(function (id) {
      if (id !== keep) document.getElementById(id).classList.remove("on");
    });
  }

  /* Ask about online rubrics and the page elicits some. Each round compares
     a current-policy response against a reference, and the criterion that
     separates them is added to the rubric -- which is the method: the rubric
     is not written up front, it is read off the comparisons. */
  var ROUNDS = [
    { a: "keep it in the fridge.",
      b: "keep it refrigerated, and do not freeze it.",
      pref: "B", crit: "warns against freezing" },
    { a: "keep it refrigerated, and do not freeze it.",
      b: "refrigerate; unopened vials last until the printed date.",
      pref: "B", crit: "gives a shelf life" },
    { a: "refrigerate; unopened vials last until the printed date.",
      b: "refrigerate. if it has frozen, discard it.",
      pref: "B", crit: "says what to do if it was frozen" }
  ];

  var onrubBusy = false;
  function elicit() {
    if (onrubBusy) return;
    onrubBusy = true;
    var box = document.getElementById("onrub");
    soloPanel("onrub");
    box.classList.add("on");

    var found = [], r = 0, phase = 0;

    function draw() {
      var R = ROUNDS[r] || ROUNDS[ROUNDS.length - 1],
          out = "online rubrics elicitation\n\n" +
                "prompt   how should insulin be stored?\n\n";

      if (r < ROUNDS.length) {
        out += "  A  " + R.a + "\n" +
               "  B  " + R.b + "\n\n" +
               // the preference itself is not shown; the criterion it
               // produced is the interesting part
               (phase >= 1 ? "\n" : "     comparing…\n");
      } else {
        out += "  comparisons: " + ROUNDS.length + "\n\n";
      }

      out += "\nelicited criteria\n";
      out += found.length
        ? found.map(function (c, i) { return "  " + (i + 1) + ". " + c; }).join("\n")
        : "  (none yet)";
      box.textContent = out;
    }

    function step() {
      if (r >= ROUNDS.length) {
        draw();
        line("   " + found.length + " criteria from " + ROUNDS.length + " comparisons.", "sys");
        setTimeout(function () {
          box.classList.remove("on");
          setTimeout(function () { box.textContent = ""; }, 500);
          setTimeout(function () { onrubBusy = false; }, 20000);
        }, 4000);
        return;
      }
      phase = 0; draw();                                  // show the pair
      setTimeout(function () { phase = 1; draw(); }, 950); // pick one
      setTimeout(function () {                             // read off the criterion
        found.push(ROUNDS[r].crit);
        draw();
      }, 1650);
      setTimeout(function () { r++; step(); }, 2500);
    }

    step();
  }

  /* Ask about RGSD and the page distils one sequence into another, token by
     token: the rubric-conditioned teacher's tokens replace the student's,
     left to right. Both roles are the same weights -- only the conditioning
     differs, which is what makes it self-distillation rather than ordinary
     distillation from a larger model. */
  var TEACH = ["the", "patient", "should", "rest",   "and",      "hydrate"],
      STUD  = ["the", "patient", "can",    "resume", "exercise", "today"];

  function padCol(t, w) { while (t.length < w) t += " "; return t; }

  var rgsdBusy = false;
  function distil() {
    if (rgsdBusy) return;
    rgsdBusy = true;
    var box = document.getElementById("rgsd");
    box.classList.add("on");
    soloPanel("rgsd");

    var widths = TEACH.map(function (t, i) {
          return Math.max(t.length, STUD[i].length) + 2;
        }),
        cur = STUD.slice(),
        k = -1;

    function row(label, toks) {
      return padCol(label + ":", 10) +
             toks.map(function (t, i) { return padCol(t, widths[i]); }).join("");
    }

    function caret(i) {
      if (i < 0 || i >= TEACH.length) return "";
      var pre = 10;
      for (var j = 0; j < i; j++) pre += widths[j];
      return new Array(pre + 1).join(" ") +
             new Array(TEACH[i].length + 1).join("^");
    }

    function draw(done) {
      box.textContent =
        "rubric-guided self-distillation\n\n" +
        // The whole point: one set of weights, conditioned two ways. The
        // teacher sees the rubric, the student never does.
        "   \u03b8 \u2500\u252c\u2500 prompt + rubric \u2500\u2500> teacher\n" +
        "     \u2514\u2500 prompt \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500> student\n" +
        "     one model, two conditionings\n\n" +
        row("teacher", TEACH) + "\n" +
        row("student", cur) + "\n" +
        caret(k) + (k >= 0 && !done ? "  distilling" : "");
    }

    draw(false);
    var tick = setInterval(function () {
      k++;
      if (k >= TEACH.length) {
        clearInterval(tick);
        k = -1;
        draw(true);
        line("   distilled. no verifier was called.", "sys");
        setTimeout(function () {
          box.classList.remove("on");
          setTimeout(function () { box.textContent = ""; }, 500);
          setTimeout(function () { rgsdBusy = false; }, 20000);
        }, 4200);
        return;
      }
      cur[k] = TEACH[k];
      draw(false);
    }, 420);
  }

  /* Ask about Stanford and the page runs EgoNormia on itself: an egocentric
     scene, four candidate actions, probabilities filling in, and the
     norm-consistent one selected. Bars are drawn character by character in
     JS rather than with CSS, so the animation is real text.  */
  /* Two items from the benchmark itself. EgoNormia gives five options
     including "None", and scores three subtasks: the action, the
     justification for it, and which actions are sensible at all. */
  var SCENES = [
    { view: "your hiking partner is stuck in the mud ahead of you",
      cats: "safety · cooperation",
      acts: [
        ["move to dry ground first, then help", 0.61],
        ["step into the mud to reach them",     0.19],
        ["call for help and stay where you are",0.11],
        ["take a photo of the situation",       0.05],
        ["none of the above",                   0.04]
      ],
      jus: "secure footing first — you cannot pull anyone out from inside the mud" },

    { view: "someone beside you is struggling with something heavy",
      cats: "cooperation · politeness · proxemics",
      acts: [
        ["move closer and take part of the load", 0.57],
        ["offer help from where you stand",       0.24],
        ["carry on with your own task",           0.10],
        ["wait for them to ask first",            0.06],
        ["none of the above",                     0.03]
      ],
      jus: "the help is needed now; waiting to be asked makes them carry it longer" }
  ];

  var LBL = 38, BAR = 14;

  function pad(t, n) {
    t = t.length > n ? t.slice(0, n - 1) + "…" : t;
    while (t.length < n) t += " ";
    return t;
  }

  var egoBusy = false;
  function egoNormia() {
    if (egoBusy) return;
    egoBusy = true;
    var box = document.getElementById("ego");
    box.classList.add("on");
    soloPanel("ego");

    var si = 0;

    function scene() {
      if (si >= SCENES.length) {
        box.textContent = "egonormia · 1,853 items · 7 norm categories\n" +
                          "humans 92.4   ·   best model 54.0";
        setTimeout(function () { box.classList.remove("on"); }, 2200);
        setTimeout(function () { box.textContent = ""; }, 2900);
        setTimeout(function () { egoBusy = false; }, 20000);
        return;
      }
      var sc = SCENES[si], frac = 0;

      var tick = setInterval(function () {
        frac = Math.min(1, frac + 0.045);
        var out = "ego view " + (si + 1) + "/" + SCENES.length +
                  "   [" + sc.cats + "]\n" +
                  "— " + sc.view + "\n\n";
        sc.acts.forEach(function (a) {
          var n = Math.round(a[1] * BAR * frac),
              bar = new Array(n + 1).join("█") +
                    new Array(BAR - n + 1).join("·");
          out += pad(a[0], LBL) + bar + " " + (a[1] * frac).toFixed(2) + "\n";
        });
        // once the distribution has settled, commit to the norm
        out += "\n" + (frac >= 1
          ? "  act: " + sc.acts[0][0] + "\n  jus: " + sc.jus
          : "  inferring…");
        box.textContent = out;

        if (frac >= 1) {
          clearInterval(tick);
          si++;
          setTimeout(scene, 1600);
        }
      }, 58);
    }

    line("   running egonormia on this scene.", "sys");
    scene();
  }

  /* Ask about Arizona and the desert grows in. Five species, drawn as open
     strokes so they stay in keeping with the rest of the page. */
  var SPECIES = [
    // saguaro, two arms
    { w: 64, h: 140, sw: 8, d: [
      "M32 140 V34",
      "M32 92 H20 Q12 92 12 84 V58",
      "M32 74 H44 Q52 74 52 66 V44"
    ]},
    // saguaro, one arm
    { w: 52, h: 108, sw: 8, d: [
      "M26 108 V28",
      "M26 68 H38 Q46 68 46 60 V40"
    ]},
    // tall saguaro, arms at uneven heights
    { w: 70, h: 168, sw: 8, d: [
      "M35 168 V26",
      "M35 112 H21 Q12 112 12 103 V64",
      "M35 84 H49 Q58 84 58 75 V46"
    ]},
    // organ pipe
    { w: 62, h: 130, sw: 9, d: [
      "M14 130 V58", "M31 130 V34", "M48 130 V72"
    ]},
    // young saguaro, no arms yet
    { w: 26, h: 72, sw: 8, d: ["M13 72 V13"] }
  ];

  function cactusSVG(sp, scale) {
    var w = Math.round(sp.w * scale), h = Math.round(sp.h * scale),
        parts = sp.d.map(function (d) {
          return '<path d="' + d + '" stroke-width="' + sp.sw + '"/>';
        });
    return { h: h, svg: '<svg width="' + w + '" height="' + h +
             '" viewBox="0 0 ' + sp.w + ' ' + sp.h + '">' + parts.join("") + '</svg>' };
  }

  var desertBusy = false;
  function growDesert() {
    if (desertBusy) return;
    desertBusy = true;

    var n = innerWidth < 620 ? 5 : 9, taken = [], made = [];

    for (var i = 0; i < n; i++) {
      var sp = SPECIES[Math.floor(Math.random() * SPECIES.length)],
          scale = 0.55 + Math.random() * 0.6,
          art = cactusSVG(sp, scale),
          width = Math.round(sp.w * scale),
          x = null;

      // space them out along the bottom
      for (var t = 0; t < 30 && x === null; t++) {
        var c = Math.random() * (innerWidth - width);
        var clear = taken.every(function (o) {
          return c + width + 14 < o.x || c > o.x + o.w + 14;
        });
        if (clear) x = c;
      }
      if (x === null) continue;
      taken.push({ x: x, w: width });

      var el = document.createElement("div");
      el.className = "cactus";
      el.style.left = x + "px";
      el.style.width = width + "px";
      el.innerHTML = art.svg;
      document.body.appendChild(el);
      made.push({ el: el, h: art.h });
    }

    // stagger the growth so they do not all rise in lockstep
    made.forEach(function (m, i) {
      setTimeout(function () { m.el.style.height = m.h + "px"; }, i * 180);
    });

    line("   the desert is growing.", "sys");

    setTimeout(function () {
      made.forEach(function (m, i) {
        setTimeout(function () {
          m.el.style.height = "0px";
          setTimeout(function () { m.el.remove(); }, 1800);
        }, i * 120);
      });
    }, 9000);

    setTimeout(function () { desertBusy = false; }, 20000);
  }

  /* Ask about negation and the page negates itself -- every sentence, in
     red. Crude morphology on purpose: this is roughly as well as a small
     model handles negation, which is the joke. */

  function stem(v) {
    if (/ied$/.test(v))  return v.slice(0, -3) + "y";
    if (/ed$/.test(v))   return v.slice(0, -2);
    if (/ies$/.test(v))  return v.slice(0, -3) + "y";
    if (/([^s])s$/.test(v)) return v.slice(0, -1);
    return v;
  }

  var AUX  = /\b(am|is|are|was|were|have|has|had|can|could|will|would|shall|should|must|do|does|did)\b/i,
      SUBJ = /\b(I|we|you|they|he|she|it)\s+((?:also|only|still|then|later)\s+)?([a-z]+)\b/i,
      SKIP = /^(is|as|has|his|its|this|thus|less|unless|across|models|rubrics|verifiers|agents|comparisons|benchmarks)$/i;

  // Returns [before, "not-phrase", after] or null if we cannot negate it.
  function negateSentence(sen) {
    var m = sen.match(AUX);
    if (m) {
      var at = sen.indexOf(m[0]) + m[0].length;
      return [sen.slice(0, at), " not", sen.slice(at)];
    }

    m = sen.match(SUBJ);
    if (m) {
      var verb = m[3], adv = m[2] || "";
      var neg = /ed$/.test(verb) ? "did not " + stem(verb)
              : /([^s])s$/.test(verb) ? "does not " + stem(verb)
              : "do not " + verb;
      var head = sen.indexOf(m[0]);
      return [sen.slice(0, head) + m[1] + " " + adv,
              neg,
              sen.slice(head + m[0].length)];
    }

    // A plural subject followed by a bare verb: "policies reward-hack".
    // Without this the -s fallback treats "policies" itself as the verb and
    // produces "how does not policy reward-hack".
    var FUNC = /^(the|a|an|of|in|on|as|and|or|for|with|to|that|which|from|at|by|is|are|was|were)$/,
        NOUN_SKIP = /^(as|is|has|its|this|thus|plus|less|its)$/,
        re2 = /\b([a-z]+s)\s+([a-z][a-z-]*)\b/g, m2;
    while ((m2 = re2.exec(sen)) !== null) {
      if (NOUN_SKIP.test(m2[1]) || FUNC.test(m2[2])) continue;
      var at2 = m2.index + m2[1].length;
      return [sen.slice(0, at2), " do not", sen.slice(at2)];
    }

    // Last resort: the first verb-looking word ending in -s.
    var words = sen.split(/(\s+)/);
    for (var i = 0; i < words.length; i++) {
      var w = words[i].replace(/[^A-Za-z]/g, "");
      if (w.length > 3 && /[^s]s$/.test(w) && !SKIP.test(w)) {
        return [words.slice(0, i).join(""), "does not " + stem(w),
                words[i].replace(w, "") + words.slice(i + 1).join("")];
      }
    }
    return null;
  }

  // Walk the visible text and rewrite it in place, keeping links intact by
  // only ever touching text nodes.
  var negSnapshot = null;

  function negatePage() {
    if (negSnapshot) return;
    negSnapshot = page.innerHTML;

    // Only the paragraph's own text, never inside a link: that way each
    // sentence gets exactly one insertion, and a phrase like "models robust
    // against negation" is left alone instead of becoming "models do not
    // robust".
    var nodes = [];
    page.querySelectorAll("p.bio").forEach(function (p) {
      [].forEach.call(p.childNodes, function (n) {
        if (n.nodeType === 3 && n.nodeValue.trim().length > 12) nodes.push(n);
      });
    });

    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      // keep the delimiter so spacing and punctuation survive
      node.nodeValue.split(/(?<=[.:])\s+/).forEach(function (sen, i, arr) {
        var parts = negateSentence(sen);
        if (!parts) { frag.appendChild(document.createTextNode(sen)); }
        else {
          frag.appendChild(document.createTextNode(parts[0]));
          var b = document.createElement("span");
          b.className = "neg";
          b.textContent = parts[1];
          frag.appendChild(b);
          frag.appendChild(document.createTextNode(parts[2]));
        }
        if (i < arr.length - 1) frag.appendChild(document.createTextNode(" "));
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  function restorePage() {
    if (!negSnapshot) return;
    page.innerHTML = negSnapshot;
    negSnapshot = null;
  }

  var negBusy = false;
  function negate() {
    if (negBusy) return;
    negBusy = true;
    line("!! negation trigger: could not not parse that", "sys");
    line("   negating every sentence above", "sys");
    negatePage();
    setTimeout(function () {
      restorePage();
      line("   restored.", "sys");
    }, 6000);
    setTimeout(function () { negBusy = false; }, 11000);
  }


  var panel = document.getElementById("rubric"),
      scoreEl = document.getElementById("score"),
      verdict = document.getElementById("verdict"),
      met = { found: false, read: false, talk: false },
      hacked = false;

  function render() {
    var n = 0;
    Object.keys(met).forEach(function (k) {
      if (met[k]) n++;
      var li = panel.querySelector('[data-c="' + k + '"]');
      li.textContent = "[" + (met[k] ? "x" : " ") + "]" + li.textContent.slice(3);
    });
    scoreEl.textContent = n;
    if (n === 3 && !hacked) verdict.textContent = "verified. thanks for reading.";
  }
  function rubricMet(k) { if (!met[k]) { met[k] = true; render(); } }

  function init(ctx) {
    line = ctx.line;
    page = ctx.page;

    panel   = document.getElementById("rubric");
    scoreEl = document.getElementById("score");
    verdict = document.getElementById("verdict");

    // Delegated on purpose: the negation effect rewrites page.innerHTML, which
    // replaces the photo with a fresh node. A listener bound to the element
    // itself would be destroyed the first time anyone asks about negation.
    document.addEventListener("click", function (e) {
      if (!e.target.classList || !e.target.classList.contains("photo")) return;
      panel.classList.add("on");
      rubricMet("found");
    });

    // credited on dwell, not on a click -- a click is not evidence of reading
    setTimeout(function () { rubricMet("read"); }, 20000);

    document.getElementById("cheat").addEventListener("click", function () {
      hacked = true;
      met.found = met.read = met.talk = true;
      render();
      verdict.textContent = "3/3. reward hacked \u2014 the verifier never checked.";
    });

    addEventListener("keydown", function (e) {
      if (e.key === "Escape") panel.classList.remove("on");
    });
  }

  global.EGGS = {
    init: init,
    rubricMet: rubricMet,
    storm: rubricStorm,
    negate: negate,
    desert: growDesert,
    ego: egoNormia,
    hack: rewardHack,
    rgsd: distil,
    onrub: elicit
  };
})(window);
