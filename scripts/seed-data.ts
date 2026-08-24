/**
 * Real content, transcribed verbatim from the existing production copy in
 * `web/src/lib/roadmaps/foundations.ts` and `web/src/lib/multiverse/graph.ts`
 * (`PLANNED_TRACKS`) — this is what "seed data reproduces the current
 * roadmap from database content" means: no placeholder text, the actual
 * shipped copy. The five tracks beyond Foundations have no built curriculum
 * yet (status was "coming-soon" in the old hard-coded model) — they're
 * seeded as career paths with zero modules, which the frontend already
 * treats as "not yet available" once modules.length === 0.
 */

export type SeedResource = { label: string; url: string };
export type SeedNode = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  resources: SeedResource[];
};
export type SeedModule = {
  slug: string;
  title: string;
  description: string;
  nodes: SeedNode[];
};
export type SeedCareerPath = {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  displayOrder: number;
  modules: SeedModule[];
};

export const CAREER_PATHS: SeedCareerPath[] = [
  {
    slug: 'foundations',
    title: 'Foundations',
    shortDescription: 'From zero to a small, finished project you can talk about.',
    description:
      'For starting from zero. This roadmap gets you from no programming background to a small, finished project you can talk about in an interview — without pretending you already know what a career changer or self-taught beginner rarely does.',
    displayOrder: 0,
    modules: [
      {
        slug: 'how-the-web-works',
        title: 'Learn how the web actually works',
        description: 'Before writing code, understand the machine you\'re writing it for.',
        nodes: [
          {
            slug: 'what-happens-when-you-load-a-page',
            title: 'What happens when you load a web page',
            summary:
              'The request/response loop behind every website — the mental model everything else builds on.',
            description:
              "Most beginners skip this and end up debugging by guesswork later. Spend one focused session understanding what actually happens between typing a URL and seeing a page: DNS, HTTP requests, how HTML/CSS/JS are parsed and rendered. You don't need to memorize it — you need the shape of it in your head.",
            resources: [
              { label: 'MDN — Learn web development', url: 'https://developer.mozilla.org/en-US/docs/Learn' },
            ],
          },
          {
            slug: 'set-up-a-real-dev-environment',
            title: 'Set up a real dev environment',
            summary: 'A code editor, a terminal, and version control — configured once, used every day after.',
            description:
              'Install a proper code editor and get comfortable with its basics (multi-file navigation, extensions, integrated terminal). This is infrastructure, not busywork — a broken environment is the single biggest cause of beginners quitting in week one.',
            resources: [
              { label: 'VS Code — Getting started', url: 'https://code.visualstudio.com/docs' },
            ],
          },
          {
            slug: 'command-line-basics',
            title: 'Command line basics',
            summary: 'Navigate, create, and move files without a mouse — every real workflow assumes this.',
            description:
              "You don't need to become a shell wizard. You need enough command-line fluency (cd, ls/dir, mkdir, running a script) to follow along with any tutorial, README, or job that assumes it — which is nearly all of them.",
            resources: [
              {
                label: 'MDN — Command line crash course',
                url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Environment_setup/Command_line',
              },
            ],
          },
        ],
      },
      {
        slug: 'programming-fundamentals',
        title: 'Programming fundamentals that transfer',
        description: 'Language-agnostic building blocks — learn them once, reuse them in every language after.',
        nodes: [
          {
            slug: 'variables-types-and-control-flow',
            title: 'Variables, types, and control flow',
            summary: 'Storing data and making decisions — the two things every program does.',
            description:
              'Every language expresses this differently, but the underlying ideas (naming data, branching with conditionals, repeating with loops) are the same everywhere. Pick one language and get genuinely comfortable here before moving on — depth beats breadth this early.',
            resources: [
              { label: 'MDN — JavaScript guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide' },
            ],
          },
          {
            slug: 'functions-and-thinking-in-small-pieces',
            title: 'Functions and thinking in small pieces',
            summary: 'Breaking a problem into named, reusable pieces instead of one long script.',
            description:
              "This is where 'programming' starts to feel different from 'following steps.' Practice writing small functions with clear inputs and outputs, then combining them — this habit is what separates code that can grow from code that has to be rewritten.",
            resources: [{ label: 'freeCodeCamp curriculum', url: 'https://www.freecodecamp.org/' }],
          },
          {
            slug: 'reading-code-you-didnt-write',
            title: "Reading code you didn't write",
            summary: "The most underrated beginner skill — you'll spend more time reading code than writing it.",
            description:
              "Find a small open-source project or a classmate's project and trace through it without running it first: what does this file do, what calls what. Reading unfamiliar code without panicking is a trainable skill, and it's tested constantly in real jobs and interviews.",
            resources: [{ label: 'CS50', url: 'https://cs50.harvard.edu/x/' }],
          },
        ],
      },
      {
        slug: 'ship-something-small',
        title: 'Ship something small, end to end',
        description: "One finished project beats five abandoned tutorials. This is the 'Do' most self-learners skip.",
        nodes: [
          {
            slug: 'scope-a-project-you-can-finish',
            title: 'Scope a project you can actually finish',
            summary: 'Pick something small enough to finish in days, not months.',
            description:
              'The single biggest reason self-learners never ship is scope: they pick something too ambitious, stall, and abandon it. Choose a project you can describe in one sentence and finish in a few focused sessions. Finished and small beats impressive and unfinished, every time.',
            resources: [],
          },
          {
            slug: 'build-without-a-tutorial',
            title: "Build without a tutorial holding your hand",
            summary: 'Use docs and search, not a step-by-step video, to build this one.',
            description:
              'Tutorials teach you to follow; projects teach you to build. Once you understand the fundamentals, force yourself to build from a written spec (even one you wrote yourself) and only reach for documentation and search when you\'re stuck — not a video walking you through every keystroke.',
            resources: [],
          },
          {
            slug: 'debug-systematically',
            title: 'Debug systematically instead of guessing',
            summary: "Form a hypothesis, test it, narrow it down — not random changes until it works.",
            description:
              "Random-change debugging is slow and doesn't teach you anything. Practice isolating the problem: what did you expect, what actually happened, what's the smallest change that reproduces it. This habit compounds — it's the same skill senior engineers use, just applied to smaller problems right now.",
            resources: [],
          },
        ],
      },
      {
        slug: 'get-it-in-front-of-people',
        title: 'Get it in front of people',
        description: 'A project only counts as portfolio evidence once someone else can find and understand it.',
        nodes: [
          {
            slug: 'put-your-project-on-github',
            title: 'Put your project on GitHub',
            summary: 'Version control your work and make it visible — this is table stakes, not optional polish.',
            description:
              "If your project only exists on your machine, it doesn't exist for a hiring purpose. Push it to GitHub with real commit history (not one giant 'initial commit'), so anyone evaluating your work can see how you actually work, not just the final result.",
            resources: [{ label: 'GitHub — Getting started', url: 'https://docs.github.com/en/get-started' }],
          },
          {
            slug: 'write-a-readme-a-stranger-can-follow',
            title: 'Write a README a stranger can follow',
            summary: 'What it does, why, and how to run it — assume the reader has 30 seconds.',
            description:
              "Most project READMEs fail the '30-second stranger' test. Write yours so someone with zero context understands what the project does, why you built it, and how to run it, without asking you a single question.",
            resources: [
              {
                label: 'GitHub — About READMEs',
                url: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes',
              },
            ],
          },
          {
            slug: 'ask-for-feedback-that-is-actually-useful',
            title: "Ask for feedback that's actually useful",
            summary: "Specific questions get specific answers — 'is this good?' doesn't.",
            description:
              "Vague requests ('what do you think?') get vague, unhelpful answers. Ask specific questions instead: 'is this the right approach for X', 'what would you check first if this broke'. Specific questions signal that you can take feedback seriously, which matters as much as the feedback itself.",
            resources: [],
          },
        ],
      },
    ],
  },
  {
    slug: 'git-github',
    title: 'Git & GitHub',
    shortDescription: 'Version control and a visible, real commit history.',
    description: 'Version control and a visible, real commit history.',
    displayOrder: 1,
    modules: [],
  },
  {
    slug: 'coding-with-ai',
    title: 'Coding With AI',
    shortDescription: 'Using AI tools well, without letting them think for you.',
    description: 'Using AI tools well, without letting them think for you.',
    displayOrder: 2,
    modules: [],
  },
  {
    slug: 'projects',
    title: 'Projects',
    shortDescription: 'Portfolio-grade builds that prove what you can do.',
    description: 'Portfolio-grade builds that prove what you can do.',
    displayOrder: 3,
    modules: [],
  },
  {
    slug: 'career-literacy',
    title: 'Career Literacy',
    shortDescription: 'How hiring actually works, so you stop guessing.',
    description: 'How hiring actually works, so you stop guessing.',
    displayOrder: 4,
    modules: [],
  },
  {
    slug: 'interviews',
    title: 'Interviews',
    shortDescription: 'Referrals and interview performance — the last mile.',
    description: 'Referrals and interview performance — the last mile.',
    displayOrder: 5,
    modules: [],
  },
];
