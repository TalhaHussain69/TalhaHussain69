// scripts/update-readme.js
// Fetches your latest / top repositories from GitHub and injects a
// dynamic "Featured Projects" section into README.md between the
// markers: <!--START_SECTION:projects--> ... <!--END_SECTION:projects-->

const fs = require("fs");
const path = require("path");

const USERNAME = "TalhaHussain69";
const README_PATH = path.join(__dirname, "..", "README.md");
const MAX_PROJECTS = 4; // how many repo cards to show
const TOKEN = process.env.GITHUB_TOKEN;

// Repos to always ignore (profile repo itself, forks, archived, etc.)
const IGNORE_REPOS = [USERNAME.toLowerCase()]; // e.g. "TalhaHussain69/TalhaHussain69"

async function fetchRepos() {
  const res = await fetch(
    `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=pushed&direction=desc`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }

  const repos = await res.json();

  return repos
    .filter((r) => !r.fork) // skip forked repos
    .filter((r) => !r.archived) // skip archived repos
    .filter((r) => !IGNORE_REPOS.includes(r.name.toLowerCase())) // skip profile repo
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at)) // newest activity first
    .slice(0, MAX_PROJECTS);
}

function buildCard(repo) {
  const pinUrl =
    `https://github-readme-stats.vercel.app/api/pin/?username=${USERNAME}` +
    `&repo=${repo.name}` +
    `&theme=transparent` +
    `&title_color=FF8E01` +
    `&text_color=CCD6F6` +
    `&icon_color=FF8E01` +
    `&border_color=FF8E01` +
    `&bg_color=00000000` +
    `&hide_border=false`;

  return `<td align="center" width="50%">
<a href="${repo.html_url}">
<img src="${pinUrl}" width="480" alt="${repo.name}" />
</a>
</td>`;
}

function buildSection(repos) {
  const cards = repos.map(buildCard);
  const rows = [];
  for (let i = 0; i < cards.length; i += 2) {
    rows.push(`<tr>\n${cards[i] || ""}\n${cards[i + 1] || ""}\n</tr>`);
  }

  return `<!--START_SECTION:projects-->
<div align="center">

## 🚀 Featured Projects
<sub>Auto-updated from my most recently active repositories</sub>

<table cellpadding="0" cellspacing="0" border="0" width="100%">
${rows.join("\n")}
</table>

</div>
<!--END_SECTION:projects-->`;
}

async function run() {
  const repos = await fetchRepos();

  if (repos.length === 0) {
    console.log("No eligible repos found, skipping update.");
    return;
  }

  const newSection = buildSection(repos);
  const readme = fs.readFileSync(README_PATH, "utf8");

  const regex = /<!--START_SECTION:projects-->[\s\S]*?<!--END_SECTION:projects-->/;

  if (!regex.test(readme)) {
    console.error(
      "Could not find <!--START_SECTION:projects--> ... <!--END_SECTION:projects--> markers in README.md"
    );
    process.exit(1);
  }

  const updated = readme.replace(regex, newSection);

  if (updated === readme) {
    console.log("No changes needed.");
    return;
  }

  fs.writeFileSync(README_PATH, updated, "utf8");
  console.log(`README.md updated with ${repos.length} project(s):`);
  repos.forEach((r) => console.log(` - ${r.name}`));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
