# The site

Static HTML, CSS and JavaScript. No Jekyll, no bundler, no plugins, no build
step for the pages themselves. Open `index.html` in a browser and it works.

## Layout

    index.html                 the homepage
    publications.html          generated -- see below
    assets/css/site.css        every style for both pages
    assets/js/eliza.js         the chatbot: pure logic, touches no DOM
    assets/js/eggs.js          the page effects it can trigger
    assets/js/terminal.js      the prompt; wires the other two together
    assets/img/photo.jpg       portrait used on the homepage
    tools/build-publications.py   regenerates publications.html

Everything else in the repository is left over from the previous al-folio
theme. It is not served: the deploy workflow copies only `index.html`,
`publications.html` and `assets/`. It is kept because `assets/pdf/` and
`assets/img/` hold files linked from elsewhere, and those URLs still resolve.

## Publications

`publications.html` is generated from `_bibliography/papers.bib` and
`_data/coauthors.yml`, which stay the single source of truth:

    python3 tools/build-publications.py

Commit the result. CI regenerates it and fails the build if the committed file
does not match the bib, so the page cannot silently drift.

Two matching rules worth knowing, both of which caused real bugs:

- Surnames are compared with accents folded, so `akyurek` matches `Akyürek`.
- First names must match **exactly**. Prefix matching once linked
  "Yannis Yiming He" to Yunzhong He's page via the initial `Y.`.

To add a paper: add it to the bib, add an entry to the `VENUE` map in the
generator (it sets the short venue and sort year), then rerun the script.

## The chatbot

`ELIZA.respond(text)` returns a reply plus flags saying which page effect the
matched rule wants:

    { text, storm, negate, desert, ego, hack, rgsd, onrub }

`terminal.js` prints the reply and calls `EGGS[flag]()` for whichever fired.
Rules are ranked; the highest-ranked match wins, which is how "online rubrics"
reaches the elicitation demo rather than the rubric storm.

Effects, and what triggers them:

| ask about        | effect                                            |
| ---------------- | ------------------------------------------------- |
| rubrics          | criteria scattered across the page                |
| negation         | every sentence in the bio rewritten, in red       |
| Arizona          | cacti growing out of the bottom edge              |
| Stanford         | norm inference over an egocentric scene           |
| reward hacking   | proxy vs reference reward curves                  |
| RGSD             | token-level teacher → student                     |
| online rubrics   | criteria read off pairwise comparisons            |

Plus a scorecard on the photo, and a console greeting.

The bio negation is tuned to the sentences currently in `index.html`. After
rewriting that copy, ask the page about negation and check the inserted words
still read grammatically.

## Deploying

Push to `main`. The workflow rebuilds publications, assembles `_site/` and
publishes it to the `gh-pages` branch — the same target the al-folio workflow
used, so no Pages setting needs changing.

## Known gaps

- Old al-folio URLs (`/cv/`, `/publications/`, `/news/`) no longer resolve.
  Files under `assets/` are unaffected.
- The other workflows in `.github/workflows/` are al-folio's and are untouched;
  several will fail or are pointless now.
