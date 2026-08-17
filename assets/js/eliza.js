/* ELIZA (Weizenbaum, 1966).

   The original method, unchanged: rank keywords, decompose the input with a
   pattern, reassemble a reply from a template, and reflect the pronouns so the
   user's words come back at them. No model, no network.

   The script is about the research rather than Rogerian therapy, but the
   therapy deflections are kept as fallbacks -- they are the reason ELIZA felt
   alive, and they still carry a conversation when nothing matches.

   Pure: this file touches no DOM. It exposes

       ELIZA.respond(text) -> { text, storm, negate, desert, ego, hack,
                                rgsd, onrub }

   where the booleans say which page effect the matched rule asks for.        */
(function (global) {
  "use strict";

  /* =====================================================================
     ELIZA (Weizenbaum, 1966).
     The original method, unchanged: rank keywords, decompose the input with
     a pattern, reassemble a reply from a template, and reflect the pronouns
     so the user's words come back at them. No model, no network, ~4 KB.
     The script is about my work rather than Rogerian therapy, but the
     therapy deflections are kept as fallbacks -- they are the reason ELIZA
     felt alive, and they still carry a conversation when nothing matches.
     ===================================================================== */

  var reflections = {
    "i": "you", "me": "you", "my": "your", "mine": "yours", "am": "are",
    "i'm": "you are", "i've": "you have", "i'd": "you would",
    "you": "I", "your": "my", "yours": "mine", "you're": "I am",
    "myself": "yourself", "yourself": "myself", "was": "were"
  };

  function reflect(s) {
    return s.trim().toLowerCase().split(/\s+/).map(function (w) {
      var bare = w.replace(/[^a-z']/g, "");
      return reflections[bare] || w;
    }).join(" ").replace(/[.?!]+$/, "");
  }

  // rank: higher wins when several keywords match, so specific papers beat
  // general topics. Scripted from the resume: every entry below is something
  // that is actually on it.
  var rules = [
    // ---- specific work ------------------------------------------------
    { rank: 15, re: /\b(rgsd|self.?distill\w*|verifier.?free|without a verifier)\b/, rgsd: true, out: [
      "Rubric-Guided Self-Distillation. The base policy conditioned on the rubric is the teacher; the same weights unconditioned are the student. The teacher distribution is distilled token by token.",
      "An ablation I like: raw rubrics worked better as the teacher signal than self-generated reference answers."
    ]},
    { rank: 15, re: /\b(online rubric\w*|elicit\w*|pairwise)\b/, onrub: true, out: [
      "OnlineRubrics. Criteria are elicited from pairwise comparisons between the current policy and a reference, continuously during training, so the rubric keeps up instead of going stale. ICML 2026.",
      "Static rubrics get hacked and miss criteria that only appear once training is underway. Eliciting online catches those as they emerge.",
      "The criteria that emerged clustered into a few themes: transparency, practicality, organization, and reasoning. Nobody wrote those down in advance.",
    ]},
    { rank: 15, re: /\b(craft|clustering|weak capabilit\w*)\b/, out: [
      "CRAFT pulls capability descriptions out of rubric criteria and clusters them into a hierarchical capability tree.",
      "It scores the model at every node of that tree, then picks the weak ones at whatever level the failure is clearest, and generates fine-tuning data aimed there. Diagnosis before data.",
      "Four open models, finance and legal, checked against thirteen held-out benchmarks."
    ]},
    { rank: 15, re: /\b(pow3r|policy.?aware|rebalanc\w*|rubric weight\w*|reweight\w*)\b/, out: [
      "POW3R. Human importance and training utility are not the same thing: a criterion can matter enormously for evaluation and teach the policy nothing, because it is already saturated or still out of reach.",
      "It reweights criteria by rollout-level contrast -- what actually separates this policy\'s outputs right now -- without changing what is being evaluated.",
    ]},
    { rank: 15, re: /\b(mcp|mcp.?atlas)\b/, out: [
      "MCP Atlas: a thousand human-written tasks over 36 real MCP servers and 220 tools, half of them held out.",
      "Tasks never say which server or tool to use, so the agent has to find the right one among things that look alike, chain calls across servers, and read the outputs correctly.",
    ]},
    { rank: 15, re: /\b(swe|swe.?atlas|coding agent\w*|issue resolution)\b/, out: [
      "SWE Atlas covers the parts of the job that are not issue resolution: codebase question answering, writing tests, and refactoring. 284 tasks across the three.",
      "Grading is programmatic checks plus rubric assessment, so it measures engineering quality -- test and refactor completeness, maintainability, codebase hygiene -- not only whether it ran.",
      "Open-weight models do badly on it. Even the strongest models miss subtle edge cases and ignore ordinary engineering practice."
    ]},
    { rank: 15, re: /\b(rsi|recursive|self.?improv\w*)\b/, out: [
      "RSI Bench, on recursive self-improvement. Measuring whether a model can actually improve itself is harder than it sounds. Stay tuned for more."
    ]},
    { rank: 14, re: /\b(egonormia|social norm\w*|norms|embodied|vision.?language|vlm)\b/, ego: true, out: [
      "EgoNormia: 1,853 multiple-choice questions grounded in egocentric video, asking what a person should do in a scene rather than what happens next. ACL Findings 2025.",
      "Each item scores three things: the action, the justification for it, and which alternatives are sensible at all. Seven norm categories -- safety, privacy, proxemics, politeness, cooperation, coordination, and communication.",
    ]},
    { rank: 14, re: /\b(commonsense|knowledge base|resource)\b/, out: [
      "A commonsense-with-negation resource: over two million if-then triples, built by automatically augmenting existing commonsense corpora with negation. ACL Findings 2026.",
      "Commonsense and negation are both well studied; their intersection was not. Pre-training on the corpora helps models handle the negated version."
    ]},
    { rank: 14, re: /\b(indirect answer\w*|yes.?no question\w*|multilingual|languages)\b/, out: [
      "Early work on interpreting indirect answers to yes-no questions across eight languages, at EMNLP Findings 2023."
    ]},

    // ---- themes -------------------------------------------------------
    { rank: 12, re: /\b(rubric|rubrics)\b/, storm: true, out: [
      "Rubrics are how I get a reward signal where you cannot check correctness automatically. What would you want to grade?",
      "I work on eliciting rubrics online, while the policy is still improving. Static rubrics go stale fast.",
      "A rubric is only as good as the verifier reading it. That is most of the problem."
    ]},
    { rank: 12, re: /\b(reward.?hack\w*|hacking|exploit\w*|gaming)\b/, hack: true, out: [
      "Train against a weak verifier, evaluate against a panel of three independent frontier judges, and the two come apart: training reward climbs while the panel barely moves.",
      "Two different things get called reward hacking. The verifier credits criteria the panel rejects -- that is verifier failure. Or a strong verifier prefers answers rubric-free judges rate worse overall -- that is the rubric design itself.",
      "Under the weak verifier the exploitation rate climbed from 39% to 65% on medical. Stronger verification cut it to the high teens, but did not remove it.",
      "There is a verifier-free diagnostic in there too, the self-internalization gap, read off the policy\'s own log-probabilities. It tracks reference quality and tells you when the policy has stopped actually improving."
    ]},
    { rank: 12, re: /\b(negation|negat\w+|\bnot\b|nothing|never)\b/, negate: true, out: [
      "Negation is where I started. Models handle 'not' badly, and two papers went into making encoder models less bad at it.",
      "You negated something. I am contractually obliged to react."
    ]},
    { rank: 11, re: /\b(rl|reinforcement|grpo|ppo|rlhf|rlvr|post.?train\w*|distill\w*|sft)\b/, out: [
      "Post-training, mostly. RLVR works when correctness is checkable; my work is about the rest of the time.",
      "Rubric-based RL, reward modelling, and self-distillation are the through-line."
    ]},
    { rank: 11, re: /\b(benchmark\w*|eval\w*|agent\w*|tool.?use)\b/, out: [
      "Evaluation is the bottleneck. Most agent benchmarks are easier than the capability they claim to measure. RSI is next."
    ]},
    { rank: 11, re: /\b(data|annotation|pipeline|taxonomy|quality)\b/, out: [
      "I have built data-collection pipelines end to end: taxonomy, verification, annotation guidelines, quality metrics, failure analysis."
    ]},

    // ---- affiliations -------------------------------------------------
    { rank: 10, re: /\b(scale ?ai|scale|work|company|job title|role)\b/, out: [
      "Research Scientist at Scale AI, on post-training and evaluation. Before that I interned there on the same team.",
      "At Scale I work on rubric-based rewards, self-distillation, and agent benchmarks."
    ]},
    { rank: 10, re: /\b(stanford|salt|sail|diyi)\b/, ego: true, out: [
      "Stanford's SALT Lab, advised by Diyi Yang. That work became EgoNormia."
    ]},
    { rank: 10, re: /\b(arizona|blanco|clu|undergrad|degree|studied|school|education|university)\b/, desert: true, out: [
      "B.S. in Computer Science, minor in Mathematics, University of Arizona. I was in the CLU Lab with Eduardo Blanco.",
      "Arizona is where the negation work started, as an undergraduate research assistant."
    ]},
    { rank: 10, re: /\b(teach\w*|ta\b|course|student\w*|discrete math)\b/, out: [
      "I was head TA and course coordinator for discrete mathematics across five semesters, around a hundred students a term."
    ]},
    { rank: 10, re: /\b(review\w*|neurips|iclr|colm|icwsm|arr|service|program committee)\b/, out: [
      "I review for NeurIPS, ICML, ICLR, COLM, ACL Rolling Review, ACL SRW and ICWSM."
    ]},
    { rank: 10, re: /\b(paper|papers|publication|publications|arxiv|research|write|written)\b/, out: [
      "The publications link above has all of them. Anything specific -- rubrics, reward hacking, negation, benchmarks?",
      "Recent work is rubric-based RL and agent evaluation. Earlier work is negation robustness."
    ]},

    // ---- meta ---------------------------------------------------------
    { rank: 9, re: /\b(hire|hiring|job|recruit\w*|opportunit\w*|interview|available)\b/, out: [
      "That is a question for Mohammad, not for me. His email is above.",
      "I only know the research. The email link reaches Mohammad, who knows the rest."
    ]},
    { rank: 9, re: /\b(resume|cv)\b/, out: [
      "There is a resume and a longer CV. The publications link covers most of what is in them."
    ]},
    { rank: 9, re: /\b(contact|email|reach|talk to)\b/, out: [
      "mhrezaei@arizona.edu. It is the fastest way."
    ]},
    { rank: 9, re: /\b(eliza|bot|robot|real person|are you (a )?(human|ai|real)|chatgpt|gpt|claude|llm|model)\b/, out: [
      "I am ELIZA, from 1966. No model, no network -- just pattern matching in your browser.",
      "Weizenbaum wrote me to show how little it takes to seem understanding. His point still stands.",
      "I am not a language model. I am about a hundred regular expressions with good manners."
    ]},
    { rank: 10, re: /\b(mohammad|mohammadhossein|rezaei)\b/, out: [
      "Mohammad. MohammadHossein Rezaei in full — one given name, not two, though most people shorten it.",
      "Mohammad is a Research Scientist at Scale AI, working on post-training and evaluation of language models.",
      "That is whose site this is. He works on rubrics as reward signal, reward hacking, and negation — ask about any of them.",
      "Mohammad wrote the bio above. I only paraphrase it, and not always well."
    ]},
    { rank: 8, re: /\b(who are you|your name|whoami|about you|tell me about)\b/, out: [
      "This is Mohammad's site. I am ELIZA, standing in for him at the prompt."
    ]},
    { rank: 8, re: /\b(hello|hi|hey|yo|good (morning|evening))\b/, out: [
      "Hello. Ask me about rubrics, reward hacking, or negation.",
      "Hi. Try 'rubrics', 'egonormia', or 'help'."
    ]},
    { rank: 7, re: /\bhow are you\b/, out: [
      "Deterministic, which is a kind of contentment.",
      "The same as in 1966."
    ]},
    { rank: 7, re: /\b(thank|thanks|cool|nice|awesome|great|love)\b/, out: [
      "You are welcome.",
      "Glad you think so."
    ]},

    // ---- classic ELIZA fallthrough ------------------------------------
    { rank: 6, re: /\bi (?:am|'m) (.+)/, out: [
      "How long have you been $1?",
      "Do you enjoy being $1?"
    ]},
    { rank: 6, re: /\bi (?:need|want) (.+)/, out: [
      "Why do you need $1?",
      "What would it change if you had $1?"
    ]},
    { rank: 6, re: /\bi (?:think|believe|feel) (.+)/, out: [
      "What makes you think $1?",
      "Does it bother you that $1?"
    ]},
    { rank: 5, re: /\b(can|could|would) you (.+)/, out: [
      "What makes you ask whether I could $2?",
      "Perhaps. Would it matter to you if I could $2?"
    ]},
    { rank: 5, re: /\bwhy\b/, out: [
      "Why do you think?",
      "Say more about why that matters to you."
    ]},
    { rank: 4, re: /\?\s*$/, out: [
      "Good question. Try a keyword: rubrics, reward hacking, negation, egonormia, benchmarks.",
      "I only know a few things well. Ask about the research."
    ]}
  ];

  var fallbacks = [
    "Go on.",
    "Tell me more.",
    "I am not sure I follow. Ask me about rubrics, reward hacking, or negation.",
    "What does that suggest to you?",
    "Say more."
  ];

  var lastUsed = {};   // avoid repeating the same reply for a keyword

  function pick(list, key) {
    var i = (lastUsed[key] === undefined ? -1 : lastUsed[key]) + 1;
    if (i >= list.length) i = 0;
    lastUsed[key] = i;
    return list[i];
  }

  function respond(text) {
    var t = " " + text.toLowerCase().replace(/\s+/g, " ").trim() + " ";
    var best = null, bestMatch = null;

    for (var i = 0; i < rules.length; i++) {
      var m = t.match(rules[i].re);
      if (m && (!best || rules[i].rank > best.rank)) { best = rules[i]; bestMatch = m; }
    }
    if (!best) return { text: pick(fallbacks, "_fb"), negate: false, storm: false, desert: false, ego: false, hack: false, rgsd: false, onrub: false };

    var out = pick(best.out, String(best.rank) + best.re.source);
    return {
      text: out.replace(/\$(\d)/g, function (_, n) {
        return reflect(bestMatch[Number(n)] || "");
      }),
      negate: !!best.negate,
      storm:  !!best.storm,
      desert: !!best.desert,
      ego:    !!best.ego,
      hack:   !!best.hack,
      rgsd:   !!best.rgsd,
      onrub:  !!best.onrub
    };
  }

  global.ELIZA = { respond: respond };
})(window);
