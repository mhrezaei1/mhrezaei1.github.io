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
      "Rubric-Guided Self-Distillation: I distill rubric-conditioned teacher signal into the student at the token level, so there is no verifier in the training loop at all.",
      "The point of RGSD is that you can match judge-based GRPO without paying for a verifier on every rollout."
    ]},
    { rank: 15, re: /\b(online rubric\w*|elicit\w*|pairwise)\b/, onrub: true, out: [
      "Online Rubrics Elicitation. Rubrics are drawn from pairwise comparisons of current and reference rollouts, so they keep up with the policy instead of going stale. It is at ICML 2026.",
      "Static rubrics miss emergent behaviour. Eliciting them online catches what the policy only started doing halfway through training."
    ]},
    { rank: 15, re: /\b(craft|clustering|weak capabilit\w*)\b/, out: [
      "CRAFT clusters rubrics to find where a model is actually weak, then synthesizes fine-tuning data aimed at those gaps."
    ]},
    { rank: 15, re: /\b(policy.?aware|rebalanc\w*|rubric weight\w*)\b/, out: [
      "Policy-aware rubric rewards: weight each criterion by what the policy can still learn from, rather than treating every line of the rubric as equally informative."
    ]},
    { rank: 15, re: /\b(mcp|mcp.?atlas)\b/, out: [
      "MCP Atlas is a large-scale benchmark for tool-use competency against real MCP servers. I worked on the research and design."
    ]},
    { rank: 15, re: /\b(swe|swe.?atlas|coding agent\w*|issue resolution)\b/, out: [
      "SWE Atlas benchmarks coding agents past issue resolution -- resolving the issue is the easy part to measure, and the least interesting."
    ]},
    { rank: 15, re: /\b(rsi|recursive|self.?improv\w*)\b/, out: [
      "RSI Bench, on recursive self-improvement. Measuring whether a model can actually improve itself is harder than it sounds."
    ]},
    { rank: 14, re: /\b(egonormia|social norm\w*|norms|embodied|vision.?language|vlm)\b/, ego: true, out: [
      "EgoNormia, from Stanford: a benchmark asking whether vision-language models understand physical social norms -- what a person should do in a scene, not just what happens next.",
      "EgoNormia was co-created with the SALT Lab and published at ACL Findings 2025."
    ]},
    { rank: 14, re: /\b(commonsense|knowledge base|resource)\b/, out: [
      "There is a commonsense-with-negation resource too, at ACL Findings 2026 -- commonsense knowledge is almost always stated positively, which is part of why models fail on the negated version."
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
      "Policies do reward-hack their verifiers. We showed it happens, and that it looks like a plateau rather than a failure.",
      "The interesting part is separating verifier failure from rubric-design failure. Those need different fixes.",
      "We built a log-probability diagnostic to catch reward plateaus during training. Cheap, and it works."
    ]},
    { rank: 12, re: /\b(negation|negat\w+|\bnot\b|nothing|never)\b/, negate: true, out: [
      "Negation is where I started. Language models handle 'not' badly, and I spent two papers making them less bad at it.",
      "We used self-supervised pre-training -- next sentence polarity prediction -- to make encoder models robust to negation.",
      "You negated something. I am contractually obliged to react."
    ]},
    { rank: 11, re: /\b(rl|reinforcement|grpo|ppo|rlhf|rlvr|post.?train\w*|distill\w*|sft)\b/, out: [
      "Post-training, mostly. RLVR works when correctness is checkable; my work is about the rest of the time.",
      "Rubric-based RL, reward modelling, and self-distillation are the through-line."
    ]},
    { rank: 11, re: /\b(benchmark\w*|eval\w*|agent\w*|tool.?use)\b/, out: [
      "I build benchmarks for tool-use and coding agents -- MCP Atlas, SWE Atlas, RSI Bench.",
      "Evaluation is the bottleneck. Most agent benchmarks are easier than the capability they claim to measure."
    ]},
    { rank: 11, re: /\b(data|annotation|pipeline|taxonomy|quality)\b/, out: [
      "I have built data-collection pipelines end to end: taxonomy, verification, annotation guidelines, quality metrics, failure analysis."
    ]},
    { rank: 11, re: /\b(mentor\w*|mentee\w*|intern\w*)\b/, out: [
      "I co-mentor interns working on agentic RL verifiers, hinting strategies for on-policy self-distillation, and curriculum-based self-improvement."
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
    { rank: 10, re: /\b(award\w*|honor\w*|prize|gpa|summa|phi beta|galileo|outstanding|fellow\w*)\b/, out: [
      "Summa cum laude, 4.0. Outstanding Senior for the CS department and the College of Science, Galileo Circle Scholar, Phi Beta Kappa.",
      "There is a Silver Reviewer Award from ICML 2026 in there too, which I am unreasonably pleased about."
    ]},
    { rank: 10, re: /\b(review\w*|neurips|iclr|colm|icwsm|arr|service|program committee)\b/, out: [
      "I review for NeurIPS, ICML, ICLR, COLM, ACL Rolling Review, ACL SRW and ICWSM."
    ]},
    { rank: 10, re: /\b(skill\w*|stack|tool\w*|verl|skyrl|harbor|vllm|sglang|ray|kubernetes|docker|pytorch|python|java|sandbox\w*|infra\w*)\b/, out: [
      "Day to day: verl, SkyRL, Harbor, Ray, vLLM, SGLang, PyTorch, Transformers.",
      "Python mostly, some Java and C/C++; Docker, Kubernetes and sandboxes for the agent work."
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
