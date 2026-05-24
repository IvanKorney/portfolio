import { cloneElement } from "react";
import type { ReactElement, ReactNode } from "react";
import type { Command, CommandContext, SplitDir, ThemeId } from "./types";
import { cwdToString, listDir, lookup, resolvePath } from "./filesystem";
import { THEMES, isThemeId } from "./themes";

/* ─── tiny styled helpers ─────────────────────────────────────── */
const Accent = ({ children }: { children: ReactNode }) => (
  <span style={{ color: "var(--accent)" }}>{children}</span>
);
const Accent2 = ({ children }: { children: ReactNode }) => (
  <span style={{ color: "var(--accent-2)" }}>{children}</span>
);
const Dim = ({ children }: { children: ReactNode }) => (
  <span style={{ color: "var(--text-dim)" }}>{children}</span>
);
const Bold = ({ children }: { children: ReactNode }) => (
  <span style={{ color: "var(--text)", fontWeight: 600 }}>{children}</span>
);
const Err = ({ children }: { children: ReactNode }) => (
  <span style={{ color: "var(--error)" }}>{children}</span>
);
const Ok = ({ children }: { children: ReactNode }) => (
  <span style={{ color: "var(--success)" }}>{children}</span>
);
const Link = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

/* Convert a multi-line plain string into a column of <div>s */
function pre(text: string): ReactNode[] {
  return text
    .replace(/\s+$/g, "")
    .split("\n")
    .map((ln, i) => <div key={i}>{ln === "" ? " " : ln}</div>);
}

function spacer(): ReactNode {
  return <div key={`sp-${Math.random()}`}>&nbsp;</div>;
}

/**
 * Render file content with light terminal styling:
 *   - `#` lines → accent header
 *   - `•` lines → accent-2 ▸ bullet
 *   - first non-blank, non-special line → bold  (title)
 *   - second non-blank, non-special line → dim   (subtitle / tech)
 *   - everything else → normal text
 */
function renderFileLines(content: string): ReactNode[] {
  const lines = content.replace(/\n$/, "").split("\n");
  const out: ReactNode[] = [];
  let titlesUsed = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === "") {
      out.push(<div key={i}>&nbsp;</div>);
    } else if (trimmed.startsWith("#")) {
      out.push(<div key={i}><Accent>{trimmed.replace(/^#+\s*/, "")}</Accent></div>);
    } else if (trimmed.startsWith("•")) {
      out.push(
        <div key={i}>
          {"  "}<Accent2>▸</Accent2>{" "}{trimmed.slice(1).trim()}
        </div>,
      );
    } else if (titlesUsed === 0) {
      titlesUsed++;
      out.push(<div key={i}><Bold>{raw}</Bold></div>);
    } else if (titlesUsed === 1) {
      titlesUsed++;
      out.push(<div key={i}><Dim>{raw}</Dim></div>);
    } else {
      out.push(<div key={i}>{raw}</div>);
    }
  }
  return out;
}

/* ─── individual commands ─────────────────────────────────────── */

const helpCmd: Command = {
  name: "help",
  summary: "show this help",
  run: (ctx) => {
    const groups: { title: string; items: [string, string][] }[] = [
      {
        title: "about me",
        items: [
          ["about", "intro & bio"],
          ["whoami", "alias for about"],
          ["experience", "work history"],
          ["projects", "selected projects"],
          ["skills", "tech stack"],
          ["education", "school"],
          ["contact", "how to reach me"],
          ["resume", "download my CV (PDF)"],
          ["github", "open my GitHub + live stats"],
        ],
      },
      {
        title: "filesystem",
        items: [
          ["ls [path]", "list a directory"],
          ["cat <file>", "print a file"],
          ["cd [path]", "change directory"],
          ["pwd", "print working directory"],
        ],
      },
      {
        title: "shell",
        items: [
          ["theme [id]", "modern | green | amber"],
          ["clear", "clear the screen"],
          ["history", "show recent commands"],
          ["date", "show today's date"],
          ["echo <text>", "print text"],
          ["open <target>", "open linkedin | github | email | site"],
          ["neofetch", "system info"],
          ["banner", "show the welcome banner"],
        ],
      },
      {
        title: "window",
        items: [
          ["split right", "open a new pane on the right"],
          ["split down", "open a new pane below"],
          ["close", "close this pane"],
        ],
      },
    ];
    const out: ReactNode[] = [];
    out.push(
      <div key="h">
        <Accent>commands</Accent>{" "}
        <Dim>— Tab autocompletes, ↑/↓ cycle history</Dim>
      </div>,
    );
    for (const g of groups) {
      out.push(spacer());
      out.push(
        <div key={g.title}>
          <Accent2>{g.title}</Accent2>
        </div>,
      );
      for (const [cmd, desc] of g.items) {
        out.push(
          <div key={g.title + cmd}>
            {"  "}
            <Bold>{cmd.padEnd(16)}</Bold>
            <Dim>{desc}</Dim>
          </div>,
        );
      }
    }
    void ctx;
    return out;
  },
};

const aboutCmd: Command = {
  name: "about",
  summary: "intro & bio",
  run: () => {
    return [
      <div key="n">
        <Accent>Ivan Korneychuk</Accent>{" "}
        <Dim>· Computer Engineering @ Waterloo · cGPA 3.9 · grad 2027</Dim>
      </div>,
      spacer(),
      <div key="i">Hey, I&apos;m Ivan — I like to code.</div>,
      spacer(),
      <div key="s">
        <Accent2>tech stack</Accent2>
      </div>,
      ...pre(
        `  TS · Kotlin · Python · Go · SQL
  React · Next.js · Node · Spring Boot
  Postgres · MongoDB · Redis · DrizzleORM · Prisma`,
      ),
      spacer(),
      <div key="h">
        <Accent2>hobbies</Accent2>
      </div>,
      ...pre(`  soccer · cooking · gym`),
      spacer(),
      <div key="x">
        <Dim>
          Try <Bold>experience</Bold>, <Bold>projects</Bold>, or{" "}
          <Bold>contact</Bold>.
        </Dim>
      </div>,
    ];
  },
};

const whoamiCmd: Command = {
  ...aboutCmd,
  name: "whoami",
  summary: "alias for about",
};

const experienceCmd: Command = {
  name: "experience",
  summary: "work history",
  run: () => {
    const jobs = [
      [
        "Backend Engineer",
        "Faire",
        "Jan 2026 – Apr 2026",
        "faire-backend-2026.md",
      ],
      [
        "Fullstack Engineer",
        "Faire",
        "May 2025 – Aug 2025",
        "faire-fullstack-2025.md",
      ],
      [
        "Fullstack Engineer",
        "Blaise Transit",
        "Sep 2024 – Dec 2024",
        "blaise-transit-2024.md",
      ],
      [
        "Software Engineer",
        "WE Accelerate",
        "Jan 2024 – Apr 2024",
        "we-accelerate-2024.md",
      ],
    ];
    const out: ReactNode[] = [];
    out.push(
      <div key="h">
        <Accent>work history</Accent>{" "}
        <Dim>— cat the .md to read the details</Dim>
      </div>,
    );
    out.push(spacer());
    for (const [role, company, dates, file] of jobs) {
      out.push(
        <div key={file}>
          <Bold>{role}</Bold> <Dim>·</Dim> <Accent2>{company}</Accent2>
        </div>,
      );
      out.push(
        <div key={file + "d"}>
          <Dim>
            {"  "}
            {dates} <span style={{ marginLeft: 8 }}>cat experience/{file}</span>
          </Dim>
        </div>,
      );
      out.push(spacer());
    }
    return out;
  },
};

const projectsCmd: Command = {
  name: "projects",
  summary: "selected projects",
  run: () => {
    const projects = [
      [
        "Code Clash",
        "Real-time 1v1 competitive coding — Monaco editor, Piston runtimes, ELO ladder.",
        "code-clash.md",
      ],
      [
        "AI PDF Summarizer",
        "OpenAI-powered PDF Q&A with Clerk auth and per-user document storage.",
        "ai-pdf-summarizer.md",
      ],
      [
        "NoteVault SaaS",
        "Subscription note-taking app — Stripe billing, Supabase + Prisma, Kinde auth.",
        "note-vault.md",
      ],
      [
        "Food Ordering Platform",
        "Full-stack ordering app with Express/MongoDB API, Stripe payments, and React Query.",
        "food-ordering.md",
      ],
      [
        "Investment Portfolio Tracker",
        "React + ASP.NET tracker with JWT auth, interface-repository pattern, live stock data.",
        "investment-portfolio.md",
      ],
    ];
    const out: ReactNode[] = [];
    out.push(
      <div key="h">
        <Accent>selected projects</Accent>
      </div>,
    );
    out.push(spacer());
    for (const [name, blurb, file] of projects) {
      out.push(
        <div key={file}>
          <Bold>▸ {name}</Bold>
        </div>,
      );
      out.push(
        <div key={file + "b"}>
          <Dim>
            {"  "}
            {blurb}
          </Dim>
        </div>,
      );
      out.push(
        <div key={file + "p"}>
          <Dim>
            {"  "}cat projects/{file}
          </Dim>
        </div>,
      );
      out.push(spacer());
    }
    out.push(
      <div key="t">
        <Dim>
          More on GitHub —{" "}
          <Link href="https://github.com/IvanKorney">
            github.com/IvanKorney
          </Link>
        </Dim>
      </div>,
    );
    return out;
  },
};

const skillsCmd: Command = {
  name: "skills",
  summary: "tech stack",
  run: () =>
    pre(`Languages
  Python · JavaScript · TypeScript · Java · Kotlin · Go · SQL · HTML/CSS

Frameworks & Libraries
  React · React Native · Next.js · Spring Boot
  Zustand · Zod · TailwindCSS · TanStack Query

Databases / ORMs
  PostgreSQL · MySQL · MongoDB · Firebase · Redis
  Prisma · DrizzleORM

Tools & Platforms
  Git · Docker · AWS · Vercel · Snowflake · Stripe
  Braze · Postman · Graphite · DataGrip`),
};

const educationCmd: Command = {
  name: "education",
  summary: "school",
  run: () => [
    <div key="u">
      <Bold>University of Waterloo</Bold> <Dim>· Waterloo, ON</Dim>
    </div>,
    <div key="d">
      BASc, Computer Engineering <Dim>· cGPA 3.9 · expected 2027</Dim>
    </div>,
  ],
};

const contactCmd: Command = {
  name: "contact",
  summary: "how to reach me",
  run: () => [
    <div key="e">
      {"  "}
      <Accent>email </Accent>{" "}
      <Link href="mailto:ikorneyc@uwaterloo.ca">ikorneyc@uwaterloo.ca</Link>
    </div>,
    <div key="l">
      {"  "}
      <Accent>linkedin </Accent>{" "}
      <Link href="https://linkedin.com/in/ivan-korneychuk">
        linkedin.com/in/ivan-korneychuk
      </Link>
    </div>,
    <div key="g">
      {"  "}
      <Accent>github </Accent>{" "}
      <Link href="https://github.com/IvanKorney">github.com/IvanKorney</Link>
    </div>,
  ],
};

const resumeCmd: Command = {
  name: "resume",
  summary: "download CV (PDF)",
  run: () => {
    // Trigger download in a side-effect way during render is fine here:
    if (typeof window !== "undefined") {
      const a = document.createElement("a");
      a.href = "/Ivan_Korneychuk_CV.pdf";
      a.download = "Ivan_Korneychuk_CV.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    return [
      <div key="1">
        <Ok>✓</Ok> downloading <Bold>Ivan_Korneychuk_CV.pdf</Bold>
      </div>,
      <div key="2">
        <Dim>
          If the download didn't start,{" "}
          <Link href="/Ivan_Korneychuk_CV.pdf">click here</Link>.
        </Dim>
      </div>,
    ];
  },
};

const githubCmd: Command = {
  name: "github",
  summary: "open my GitHub + live stats",
  run: async () => {
    const out: ReactNode[] = [];
    out.push(
      <div key="o">
        <Accent>github.com/IvanKorney</Accent> <Dim>· fetching live stats…</Dim>
      </div>,
    );
    try {
      const [userRes, reposRes] = await Promise.all([
        fetch("https://api.github.com/users/IvanKorney"),
        fetch(
          "https://api.github.com/users/IvanKorney/repos?per_page=100&sort=updated",
        ),
      ]);
      if (!userRes.ok || !reposRes.ok) throw new Error("github api");
      const user = (await userRes.json()) as {
        public_repos: number;
        followers: number;
        following: number;
        bio?: string;
        name?: string;
      };
      const repos = (await reposRes.json()) as Array<{
        name: string;
        description: string | null;
        stargazers_count: number;
        language: string | null;
        html_url: string;
        fork: boolean;
        updated_at: string;
      }>;
      const top = repos
        .filter((r) => !r.fork)
        .sort(
          (a, b) =>
            b.stargazers_count - a.stargazers_count ||
            Date.parse(b.updated_at) - Date.parse(a.updated_at),
        )
        .slice(0, 5);
      out.push(spacer());
      out.push(
        <div key="s">
          <Bold>{user.name ?? "Ivan Korneychuk"}</Bold>{" "}
          <Dim>
            · public repos: <Accent>{user.public_repos}</Accent> · followers:{" "}
            <Accent>{user.followers}</Accent> · following:{" "}
            <Accent>{user.following}</Accent>
          </Dim>
        </div>,
      );
      if (user.bio) {
        out.push(
          <div key="b">
            <Dim>{user.bio}</Dim>
          </div>,
        );
      }
      out.push(spacer());
      out.push(
        <div key="t">
          <Accent2>recent / top repos</Accent2>
        </div>,
      );
      for (const r of top) {
        out.push(
          <div key={r.name}>
            {"  "}
            <Link href={r.html_url}>{r.name}</Link>{" "}
            <Dim>
              ★{r.stargazers_count}
              {r.language ? ` · ${r.language}` : ""}
            </Dim>
          </div>,
        );
        if (r.description) {
          out.push(
            <div key={r.name + "d"}>
              <Dim>{"    " + r.description}</Dim>
            </div>,
          );
        }
      }
    } catch {
      out.push(
        <div key="err">
          <Dim>(couldn't reach the GitHub API right now — visit </Dim>
          <Link href="https://github.com/IvanKorney">
            github.com/IvanKorney
          </Link>
          <Dim> directly)</Dim>
        </div>,
      );
    }
    // also pop open in a new tab
    if (typeof window !== "undefined") {
      window.open("https://github.com/IvanKorney", "_blank", "noopener");
    }
    return out;
  },
};

/* ─── filesystem commands ─────────────────────────────────────── */

const pwdCmd: Command = {
  name: "pwd",
  summary: "print working directory",
  run: (ctx) => [<div key="p">{cwdToString(ctx.cwd)}</div>],
};

const lsCmd: Command = {
  name: "ls",
  summary: "list a directory",
  run: (ctx) => {
    const target = ctx.args[0] ?? "";
    const path = resolvePath(ctx.cwd, target || ".");
    const items = listDir(path);
    if (!items) {
      const node = lookup(path);
      if (node && node.type === "file") {
        return [<div key="f">{target}</div>];
      }
      return [
        <Err key="e">
          ls: cannot access &apos;{target || "."}&apos;: no such file or
          directory
        </Err>,
      ];
    }
    const dirNode = lookup(path);
    return [
      <div
        key="ls"
        style={{ display: "flex", flexWrap: "wrap", gap: "0 1.5em" }}
      >
        {items.map((name) => {
          const child =
            dirNode && dirNode.type === "dir" ? dirNode.children[name] : null;
          const isDir = child?.type === "dir";
          return (
            <span
              key={name}
              style={{ color: isDir ? "var(--accent)" : undefined }}
            >
              {name}
              {isDir ? "/" : ""}
            </span>
          );
        })}
      </div>,
    ];
  },
};

const catCmd: Command = {
  name: "cat",
  summary: "print a file",
  run: (ctx) => {
    if (ctx.args.length === 0) {
      return [<Err key="u">usage: cat &lt;file&gt;</Err>];
    }
    const out: ReactNode[] = [];
    for (const target of ctx.args) {
      const path = resolvePath(ctx.cwd, target);
      const node = lookup(path);
      if (!node) {
        out.push(
          <div key={"e" + target}>
            <Err>cat: {target}: no such file or directory</Err>
          </div>,
        );
        continue;
      }
      if (node.type === "dir") {
        out.push(
          <div key={"d" + target}>
            <Err>cat: {target}: is a directory</Err>
          </div>,
        );
        continue;
      }
      out.push(
        ...renderFileLines(node.content).map((el, j) =>
          cloneElement(el as ReactElement, { key: "f" + target + j }),
        ),
      );
    }
    return out;
  },
};

const cdCmd: Command = {
  name: "cd",
  summary: "change directory",
  run: (ctx) => {
    const target = ctx.args[0] ?? "";
    const path = resolvePath(ctx.cwd, target);
    const node = lookup(path);
    if (!node) {
      return [<Err key="e">cd: {target}: no such file or directory</Err>];
    }
    if (node.type !== "dir") {
      return [<Err key="e">cd: {target}: not a directory</Err>];
    }
    ctx.setCwd(path);
  },
};

/* ─── shell-ish commands ──────────────────────────────────────── */

const clearCmd: Command = {
  name: "clear",
  summary: "clear the screen",
  run: (ctx) => {
    ctx.clear();
  },
};

const themeCmd: Command = {
  name: "theme",
  summary: "modern | green | amber",
  run: (ctx) => {
    if (ctx.args.length === 0) {
      return [
        <div key="c">
          current theme: <Accent>{ctx.theme}</Accent>
        </div>,
        spacer(),
        <div key="l">
          <Dim>available:</Dim>
        </div>,
        ...THEMES.map((t) => (
          <div key={t.id}>
            {"  "}
            <Bold>{t.label.padEnd(8)}</Bold>
            <Dim>{t.description}</Dim>
          </div>
        )),
        spacer(),
        <div key="u">
          <Dim>usage: theme &lt;modern|green|amber&gt;</Dim>
        </div>,
      ];
    }
    const id = ctx.args[0].toLowerCase();
    if (!isThemeId(id)) {
      return [<Err key="e">theme: unknown theme &apos;{id}&apos;</Err>];
    }
    ctx.setTheme(id as ThemeId);
    return [
      <div key="o">
        <Ok>✓</Ok> theme set to <Accent>{id}</Accent>
      </div>,
    ];
  },
};

const dateCmd: Command = {
  name: "date",
  summary: "show today's date",
  run: () => [<div key="d">{new Date().toString()}</div>],
};

const echoCmd: Command = {
  name: "echo",
  summary: "print text",
  run: (ctx) => [<div key="e">{ctx.args.join(" ")}</div>],
};

const historyCmd: Command = {
  name: "history",
  summary: "show recent commands",
  run: (ctx) => {
    if (ctx.history.length === 0) return [<Dim key="d">(no history yet)</Dim>];
    return ctx.history.map((h, i) => (
      <div key={i}>
        <Dim>{String(i + 1).padStart(4)}</Dim> {h}
      </div>
    ));
  },
};

const openCmd: Command = {
  name: "open",
  summary: "open linkedin | github | email | site",
  run: (ctx) => {
    const target = (ctx.args[0] ?? "").toLowerCase();
    const map: Record<string, string> = {
      linkedin: "https://linkedin.com/in/ivan-korneychuk",
      github: "https://github.com/IvanKorney",
      gh: "https://github.com/IvanKorney",
      email: "mailto:ikorneyc@uwaterloo.ca",
      mail: "mailto:ikorneyc@uwaterloo.ca",
      site: "https://ivan-korneychuk.vercel.app",
      portfolio: "https://ivan-korneychuk.vercel.app",
      resume: "/Ivan_Korneychuk_CV.pdf",
      cv: "/Ivan_Korneychuk_CV.pdf",
    };
    if (!target) {
      return [
        <Dim key="d">
          usage: open &lt;linkedin | github | email | site | resume&gt;
        </Dim>,
      ];
    }
    const url = map[target];
    if (!url) {
      return [<Err key="e">open: unknown target &apos;{target}&apos;</Err>];
    }
    if (typeof window !== "undefined") {
      if (url.startsWith("mailto:")) window.location.href = url;
      else window.open(url, "_blank", "noopener");
    }
    return [
      <div key="o">
        <Ok>✓</Ok> opening <Link href={url}>{url}</Link>
      </div>,
    ];
  },
};

const neofetchCmd: Command = {
  name: "neofetch",
  summary: "system info",
  run: (ctx) => {
    const art = [
      "     ╔══════════╗",
      "     ║  ╔═══╗   ║",
      "     ║  ║   ║   ║",
      "     ║  ║   ║   ║",
      "     ║  ╚═══╝   ║",
      "     ║          ║",
      "     ╚══════════╝",
    ];
    const info: [string, ReactNode][] = [
      ["user", <Accent key="u">ivan@korneychuk</Accent>],
      ["role", "Computer Engineering @ Waterloo"],
      ["term", "ivan-term v1.0.0"],
      ["theme", <Accent key="t">{ctx.theme}</Accent>],
      ["uptime", `${new Date().getFullYear() - 2005} years (born 2005)`],
      ["editor", "Neovim · VS Code"],
      ["langs", "TS · Kotlin · Python · Go"],
      ["site", "ivan-korneychuk.vercel.app"],
    ];
    const rows = Math.max(art.length, info.length);
    const out: ReactNode[] = [];
    for (let i = 0; i < rows; i++) {
      const a = art[i] ?? "                  ";
      const kv = info[i];
      out.push(
        <div key={i} style={{ whiteSpace: "pre" }}>
          <span style={{ color: "var(--accent-2)" }}>{a}</span>
          {"   "}
          {kv ? (
            <>
              <Bold>{kv[0]}</Bold>
              <Dim>: </Dim>
              {kv[1]}
            </>
          ) : null}
        </div>,
      );
    }
    return out;
  },
};

const bannerCmd: Command = {
  name: "banner",
  summary: "show the welcome banner",
  run: (ctx) => buildBanner(ctx.theme),
};

const sudoCmd: Command = {
  name: "sudo",
  summary: "do something dangerous",
  hidden: true,
  run: () => [
    <Err key="e">[sudo] password for ivan: ********</Err>,
    <div key="b">
      <Dim>Sorry, user </Dim>visitor
      <Dim> is not in the sudoers file. This incident will be reported.</Dim>
    </div>,
  ],
};

const exitCmd: Command = {
  name: "exit",
  summary: "log out",
  hidden: true,
  run: () => [
    <div key="e">
      <Dim>nice try. you can&apos;t leave that easily.</Dim>
    </div>,
  ],
};

/* ─── window-manager commands ────────────────────────────────── */

function parseSplitDir(args: string[]): SplitDir {
  const flag = args[0]?.toLowerCase();
  // tmux convention: -h = horizontal divider = stacked, -v = vertical divider = side-by-side
  // I find that confusing — use words instead, but accept flags too.
  if (
    flag === "right" ||
    flag === "-h" ||
    flag === "h" ||
    flag === "horizontal"
  )
    return "horizontal";
  if (flag === "down" || flag === "-v" || flag === "v" || flag === "vertical")
    return "vertical";
  return "horizontal"; // default: open a new pane to the right
}

const splitCmd: Command = {
  name: "split",
  summary: "split this pane (right | down)",
  usage: "split [right|down]",
  run: (ctx) => {
    const dir = parseSplitDir(ctx.args);
    ctx.splitPane(dir);
    return [
      <div key="s">
        <Ok>✓</Ok>{" "}
        <Dim>
          split {dir === "horizontal" ? "right ↦" : "down ↓"} — Alt+Arrow to
          move focus, type <Bold>close</Bold> to remove a pane
        </Dim>
      </div>,
    ];
  },
};

const vsplitCmd: Command = {
  name: "vsplit",
  summary: "split pane vertically (new pane below)",
  hidden: true,
  run: (ctx) => {
    ctx.splitPane("vertical");
  },
};

const hsplitCmd: Command = {
  name: "hsplit",
  summary: "split pane horizontally (new pane to the right)",
  hidden: true,
  run: (ctx) => {
    ctx.splitPane("horizontal");
  },
};

const closePaneCmd: Command = {
  name: "close",
  summary: "close this pane",
  run: (ctx) => {
    const ok = ctx.closePane();
    if (!ok) {
      return [
        <Err key="e">close: can&apos;t close the last remaining pane</Err>,
      ];
    }
  },
};

const focusCmd: Command = {
  name: "focus",
  summary: "move focus to the next pane",
  hidden: true,
  run: (ctx) => {
    ctx.focusNext();
  },
};

/* ─── banner factory ─────────────────────────────────────────── */

export function buildBanner(_theme: ThemeId): ReactNode[] {
  const art = [
    "  ___                    _  __                                _           _    ",
    " |_ _|_   ____ _ _ __   | |/ /___  _ __ _ __   ___ _   _  ___| |__  _   _| | __",
    "  | |\\ \\ / / _` | '_ \\  | ' // _ \\| '__| '_ \\ / _ \\ | | |/ __| '_ \\| | | | |/ /",
    "  | | \\ V / (_| | | | | | . \\ (_) | |  | | | |  __/ |_| | (__| | | | |_| |   < ",
    " |___| \\_/ \\__,_|_| |_| |_|\\_\\___/|_|  |_| |_|\\___|\\__, |\\___|_| |_|\\__,_|_|\\_\\",
    "                                                   |___/                       ",
  ];
  const out: ReactNode[] = [];
  for (const ln of art) {
    out.push(
      <div key={ln} style={{ whiteSpace: "pre", color: "var(--accent)" }}>
        {ln}
      </div>,
    );
  }
  out.push(spacer());
  out.push(
    <div key="t1">
      <Dim>welcome to </Dim>
      <Accent>ivan@korneychuk</Accent>
      <Dim> — type </Dim>
      <Bold>help</Bold>
      <Dim> to get started.</Dim>
    </div>,
  );
  out.push(
    <div key="t2">
      <Dim>quick: </Dim>
      <Bold>about</Bold>
      <Dim> · </Dim>
      <Bold>experience</Bold>
      <Dim> · </Dim>
      <Bold>projects</Bold>
      <Dim> · </Dim>
      <Bold>resume</Bold>
      <Dim> · </Dim>
      <Bold>contact</Bold>
    </div>,
  );
  return out;
}

/* ─── registry ───────────────────────────────────────────────── */

export const COMMANDS: Command[] = [
  helpCmd,
  aboutCmd,
  whoamiCmd,
  experienceCmd,
  projectsCmd,
  skillsCmd,
  educationCmd,
  contactCmd,
  resumeCmd,
  githubCmd,
  lsCmd,
  catCmd,
  cdCmd,
  pwdCmd,
  clearCmd,
  themeCmd,
  dateCmd,
  echoCmd,
  historyCmd,
  openCmd,
  neofetchCmd,
  bannerCmd,
  splitCmd,
  vsplitCmd,
  hsplitCmd,
  closePaneCmd,
  focusCmd,
  sudoCmd,
  exitCmd,
];

export const COMMAND_MAP: Record<string, Command> = Object.fromEntries(
  COMMANDS.map((c) => [c.name, c]),
);

export function notFound(name: string): ReactNode[] {
  return [
    <div key="e">
      <Err>{name}: command not found.</Err>{" "}
      <Dim>
        Type <Bold>help</Bold> to see what&apos;s available.
      </Dim>
    </div>,
  ];
}

/* For path tab-completion */
export function completePath(cwd: string[], fragment: string): string[] {
  // Split fragment into dir prefix + leaf
  const lastSlash = fragment.lastIndexOf("/");
  const dirPart = lastSlash >= 0 ? fragment.slice(0, lastSlash + 1) : "";
  const leaf = lastSlash >= 0 ? fragment.slice(lastSlash + 1) : fragment;
  const basePath = resolvePath(cwd, dirPart || ".");
  const node = lookup(basePath);
  if (!node || node.type !== "dir") return [];
  return Object.keys(node.children)
    .filter((n) => n.startsWith(leaf))
    .map((n) => {
      const isDir = node.children[n].type === "dir";
      return dirPart + n + (isDir ? "/" : "");
    });
}

export function fsExists(cwd: string[], target: string): boolean {
  return lookup(resolvePath(cwd, target)) != null;
}
