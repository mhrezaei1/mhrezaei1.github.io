// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-publications",
          title: "publications",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-cv",
          title: "CV",
          description: "I have three documents that might be of interest to you; My Resume, My CV, and My Coursework.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "news-i-participated-in-sonic-summer-research-workshop-2023-at-cornell-university",
          title: 'I participated in SoNIC Summer Research Workshop 2023 at Cornell University.',
          description: "",
          section: "News",},{id: "news-our-paper-on-interpreting-indirect-answers-to-yes-no-questions-in-multiple-languages-has-been-accepted-to-emnlp-findings-2023",
          title: 'Our paper on Interpreting Indirect Answers to Yes-No Questions in Multiple Languages has...',
          description: "",
          section: "News",},{id: "news-my-paper-paraphrasing-in-affirmative-terms-improves-negation-understanding-has-been-accepted-to-acl-2024",
          title: 'My paper, Paraphrasing in Affirmative Terms Improves Negation Understanding, has been accepted to...',
          description: "",
          section: "News",},{id: "news-i-participated-in-the-linxs-summer-research-program-at-stanford-university-in-the-summer-of-2024-as-an-undergraduate-visiting-research-intern-i-was-advised-by-dr-diyi-yang-in-the-salt-lab",
          title: 'I participated in the LINXS Summer Research Program at Stanford University in the...',
          description: "",
          section: "News",},{id: "news-my-paper-making-language-models-robust-against-negation-has-been-accepted-to-naacl-2025-see-you-in-albuquerque",
          title: 'My paper, Making Language Models Robust Against Negation, has been accepted to NAACL...',
          description: "",
          section: "News",},{id: "news-check-out-our-recent-preprint-on-egonormia-benchmarking-physical-social-norm-understanding-https-egonormia-org",
          title: 'Check out our recent preprint on [EgoNormia: Benchmarking Physical Social Norm Understanding][https://egonormia.org].',
          description: "",
          section: "News",},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%6D%68%72%65%7A%61%65%69@%61%72%69%7A%6F%6E%61.%65%64%75", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/mhrezaei1", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/mhrezaeics", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=INq7JWIAAAAJ", "_blank");
        },
      },{
        id: 'social-x',
        title: 'X',
        section: 'Socials',
        handler: () => {
          window.open("https://twitter.com/mhrezaeics", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
