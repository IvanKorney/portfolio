import type { FsDir, FsFile, FsNode } from "./types";

/* ──────────────────────────────────────────────────────────────────
 * Virtual filesystem rooted at ~ (the user's home).
 * `cat` reads file contents; `ls` lists directories.
 * ────────────────────────────────────────────────────────────────── */

const README_MD = `# ~/README.md

Hey, I'm Ivan — welcome to my terminal.

This site is real-time interactive. Type a command and hit Enter.
Try:  help, about, experience, projects, skills, contact, resume

Tips
  • Tab          autocompletes commands and paths
  • ↑ / ↓        cycles through previous commands
  • Ctrl+L       clears the screen (same as 'clear')
  • theme amber  switches the look (also: green, modern)

Source for this site lives on GitHub — type \`github\` to jump there.
`;

const ABOUT_TXT = `Ivan Korneychuk
Computer Engineering @ University of Waterloo (cGPA 3.9, expected 2027)

I build software end-to-end. Most recently I've been writing Kotlin
microservices at Faire, but I'm just as happy in TypeScript on the
frontend, wiring up Postgres on the backend, or hacking on side
projects like a real-time 1v1 coding platform.

What I like:
  • Untangling monoliths into well-bounded services
  • Type-safe data layers (DrizzleORM, Zod, Prisma)
  • Real-time systems and the small puzzles they cause
  • Tooling that makes the next engineer's life easier

I'm based in Waterloo / Montreal and open to chatting — see contact.md.
`;

const CONTACT_MD = `# Contacts

  email      ikorneyc@uwaterloo.ca
  linkedin   https://linkedin.com/in/ivan-korneychuk
  github     https://github.com/IvanKorney

Quick commands:
  open linkedin     → opens LinkedIn
  open github       → opens GitHub
  resume            → downloads my CV (PDF)
`;

const SKILLS_TXT = `Languages
  Python · JavaScript · TypeScript · Java · Kotlin · Go · SQL · HTML/CSS

Frameworks & Libraries
  React · React Native · Next.js · Spring Boot
  Zustand · Zod · TailwindCSS · TanStack Query

Databases / ORMs
  PostgreSQL · MySQL · MongoDB · Firebase · Redis
  Prisma · DrizzleORM

Tools & Platforms
  Git · Docker · AWS · Vercel · Snowflake · Stripe
  Braze · Postman · Graphite · DataGrip
`;

const EDUCATION_TXT = `University of Waterloo                              Waterloo, ON
Bachelor of Applied Science, Computer Engineering    Expected 2027
cGPA: 3.9
`;

const EXP_FAIRE_BACKEND = `Backend Engineer · Faire                          Jan 2026 – Apr 2026
Waterloo, ON  ·  Kotlin · TypeScript · Next.js · MySQL · Snowflake

• Extracted a brand loyalty program from the monolith into a
  dedicated microservice — migrated 15+ database entities, 10+
  endpoints, and quarterly batch jobs behind a feature flag for
  gradual rollout.

• Shipped a Shopify price-sync option letting merchants sync only
  wholesale or retail prices, preserving manually curated pricing
  for 1,000+ brands and reducing unintended price overrides.

• Built a Snowflake-driven email pipeline in Braze that nudged
  2,000 merchants to enable price sync, using milestone records
  to guarantee idempotent intro and reminder sends.

• Designed catalog-level case-pack normalization, converting
  case-priced inventory and orders to unit-level to fix inflated
  prices and deflated stock counts across the Shopify integration.
`;

const EXP_FAIRE_FULLSTACK = `Fullstack Engineer · Faire                       May 2025 – Aug 2025
Waterloo, ON  ·  Next.js · React · TypeScript · Tailwind

• Designed a product-review incentive system that drove a 60%
  increase in total reviews submitted by retailers.

• Built an admin dashboard for tracking product reviews and
  resolving merchant-reported issues at scale.

• Contributed to a MobX refactor of 30+ components to modernize
  state management and improve maintainability.

• Rolled out features behind Eppo experimentation flags and tracked
  user analytics for data-informed decisions.

• Built an internal staging tool for generating mock orders, cutting
  QA setup time from minutes to seconds.
`;

const EXP_BLAISE = `Fullstack Engineer · Blaise Transit               Sep 2024 – Dec 2024
Montreal, QC  ·  React · React Native · Node.js · MySQL

• Developed an admin pricing-override feature, securing a $10,000+
  contract with Muskoka Transit.

• Refactored 20+ legacy class components to use custom React hooks
  and TypeScript for future maintainability.

• Integrated 10+ REST endpoints with Axios, including custom invoice
  generation and region-specific pricing.

• Resolved location tracking and fare-calculation bugs in the React
  Native rider app, improving trip reliability.
`;

const EXP_WE = `Software Engineer · WE Accelerate                 Jan 2024 – Apr 2024
Waterloo, ON  ·  React · TypeScript · Azure OpenAI · Cypress

• Built an Azure OpenAI-powered chatbot that streamlined clinical
  data retrieval for healthcare professionals.

• Fine-tuned the model with NLP techniques on peer-reviewed medical
  articles, improving response accuracy by 25%.

• Wrote 15+ unit and end-to-end tests in Cypress to harden chatbot
  reliability across deployment environments.
`;

const PROJ_CODE_CLASH = `Code Clash
Next.js · TypeScript · PostgreSQL · DrizzleORM · Supabase

A real-time 1v1 competitive coding platform.

• Supports 5 languages with a Monaco editor and a Piston-backed
  execution pipeline that generates per-language driver code for
  complex input types.

• Tiered ELO ranking system with atomic match resolution via
  UPDATE...RETURNING to handle near-simultaneous submissions,
  plus per-user history charts and a top-100 leaderboard.

• Hybrid real-time layer: TanStack Query polling + Supabase Broadcast
  events for instant rematch notifications. Auth via Better-Auth OAuth.
`;

const PROJ_AI_PDF = `AI PDF Summarizer
Next.js · TypeScript · TailwindCSS · DrizzleORM · OpenAI
Feb 2024 – Mar 2024

• Utilized the OpenAI API to let users summarize and ask
  questions about selected PDFs.

• Implemented Clerk authentication to support multiple accounts
  and display each user's existing PDFs.

• Developed reusable UI components with TailwindCSS and ShadCn,
  enhancing development efficiency.

• Integrated DrizzleORM to streamline SQL query/mutation
  development and ensure efficient database interactions.
`;

const PROJ_NOTE_VAULT = `NoteVault SaaS
React · TypeScript · Stripe · Supabase · Prisma · Kinde · ShadCn
Mar 2024 – Apr 2024

• Utilized Supabase and Prisma to query/mutate notes, ensuring
  seamless data management and scalability.

• Set up a subscription model by integrating Stripe payments and
  webhooks for real-time billing updates.

• Implemented Kinde authentication to allow different accounts
  to log in with their own personal settings.

• Integrated ContextAPI state management to efficiently pass
  data to components, including the overall theme.
`;

const PROJ_FOOD_ORDERING = `Full Stack Food Ordering Platform
React · TypeScript · Express.js · MongoDB · Stripe
Sep 2024 – Oct 2024

• Developed Express.js API endpoints to efficiently manage and
  interact with MongoDB data for the client.

• Integrated Stripe payment processing and webhooks for
  real-time order transactions and tracking.

• Implemented backend filtering, pagination, and sorting for
  data retrieval via React Query.

• Set up Zod schema validation and dynamic routing with
  react-router-dom.
`;

const PROJ_INVESTMENT = `Personal Investment Portfolio Tracker
React · TypeScript · TailwindCSS · C# · ASP.NET
Oct 2024 – Nov 2024

• Optimized data handling in ASP.NET APIs through an
  interface-repository model for better scalability.

• Implemented authorization using JWT web tokens created in
  the C# backend to support multiple clients.

• Connected to a financial modeling API to retrieve live stock
  data using Axios.
`;

const f = (content: string): FsFile => ({ type: "file", content });
const d = (children: Record<string, FsNode>): FsDir => ({
  type: "dir",
  children,
});

export const FS: FsDir = d({
  "README.md": f(README_MD),
  "about.txt": f(ABOUT_TXT),
  "contact.md": f(CONTACT_MD),
  "skills.txt": f(SKILLS_TXT),
  "education.txt": f(EDUCATION_TXT),
  experience: d({
    "faire-backend-2026.md": f(EXP_FAIRE_BACKEND),
    "faire-fullstack-2025.md": f(EXP_FAIRE_FULLSTACK),
    "blaise-transit-2024.md": f(EXP_BLAISE),
    "we-accelerate-2024.md": f(EXP_WE),
  }),
  projects: d({
    "code-clash.md": f(PROJ_CODE_CLASH),
    "ai-pdf-summarizer.md": f(PROJ_AI_PDF),
    "note-vault.md": f(PROJ_NOTE_VAULT),
    "food-ordering.md": f(PROJ_FOOD_ORDERING),
    "investment-portfolio.md": f(PROJ_INVESTMENT),
  }),
});

/* ─── path utilities ──────────────────────────────────────────── */

export function cwdToString(cwd: string[]): string {
  return cwd.length === 0 ? "~" : "~/" + cwd.join("/");
}

/** Resolves `target` (relative or absolute) against `cwd`. */
export function resolvePath(cwd: string[], target: string): string[] {
  if (!target || target === "~" || target === "/") return [];
  // strip leading ~/
  let parts: string[];
  if (target.startsWith("~/")) {
    parts = target.slice(2).split("/");
  } else if (target.startsWith("/")) {
    parts = target.slice(1).split("/");
  } else {
    parts = [...cwd, ...target.split("/")];
  }
  const out: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") {
      out.pop();
      continue;
    }
    out.push(p);
  }
  return out;
}

export function lookup(path: string[]): FsNode | null {
  let node: FsNode = FS;
  for (const seg of path) {
    if (node.type !== "dir") return null;
    const child: FsNode | undefined = node.children[seg];
    if (!child) return null;
    node = child;
  }
  return node;
}

/** Returns children names of a directory at `path`, or null. */
export function listDir(path: string[]): string[] | null {
  const node = lookup(path);
  if (!node || node.type !== "dir") return null;
  return Object.keys(node.children).sort((a, b) => {
    const aDir = node.children[a].type === "dir";
    const bDir = node.children[b].type === "dir";
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.localeCompare(b);
  });
}
