/* The prompt at the foot of the page: prints lines, keeps the page receding as
   the conversation grows, and hands each reply's flags to EGGS. */
(function () {
  "use strict";

  var log     = document.getElementById("log"),
      input   = document.getElementById("in"),
      page    = document.getElementById("page"),
      started = false,
      turns   = 0;

  function line(text, cls) {
    var d = document.createElement("div");
    d.className = cls;
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  // Each exchange dims the page a little further, to a floor -- it never
  // disappears, and the first message is barely a change.
  function recede() {
    turns++;
    page.style.opacity = Math.max(0.16, 1 - 0.12 * turns).toFixed(2);
    page.style.transform = "translateY(-" + (turns * 10) + "px)";
  }

  function begin() {
    if (started) return;
    started = true;
    input.placeholder = "";        // the invitation has been accepted
  }

  // the long hint overflows a phone and gets cut mid-word ("running loc…")
  var HINT = matchMedia("(max-width: 40rem)").matches
    ? "ask me something"
    : "ask me something \u2014 this is eliza (1966), running locally";

  var commands = {
    help: function () {
      line("keywords: rubrics, reward hacking, negation, benchmarks, scale, stanford, arizona", "e");
      line("commands: help, whoami, ls, clear, exit", "e");
    },
    whoami: function () { line("guest", "e"); },
    ls: function () { line("bio  publications  email  scholar  github  linkedin  x", "e"); },
    clear: function () {
      log.innerHTML = "";
      started = false;
      turns = 0;
      page.style.opacity = "";
      page.style.transform = "";
      input.placeholder = HINT;
    },
    exit: function () { commands.clear(); }
  };

  input.placeholder = HINT;      // markup ships empty; the hint depends on width
  EGGS.init({ line: line, page: page });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { commands.clear(); return; }
    if (e.key !== "Enter") return;

    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    begin();
    recede();
    line(text, "u");
    EGGS.rubricMet("talk");

    var cmd = text.toLowerCase().replace(/[^a-z]/g, "");
    if (commands[cmd]) { commands[cmd](); return; }

    // A beat before replying -- instant answers read as a lookup table.
    setTimeout(function () {
      var r = ELIZA.respond(text);
      line(r.text, "e");
      ["negate", "storm", "desert", "ego", "hack", "rgsd", "onrub"]
        .forEach(function (k) { if (r[k]) EGGS[k](); });
    }, 260);
  });

  // Focus the prompt on desktop only; on touch this would open the keyboard
  // the moment the page loads.
  if (matchMedia("(hover: hover)").matches) input.focus();
  document.addEventListener("click", function (e) {
    if (e.target.closest("a, button, #rubric, .photo")) return;
    input.focus();
  });

  console.log(
    "%cyou opened the console. that's the kind of thing i'd do too.\nsay hi: mhrezaei@arizona.edu",
    "font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace"
  );
})();
