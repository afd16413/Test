/* Shared by the editor and the admin page: turns an editor test into a standalone test page. */
const TF = { TFNG: ["TRUE", "FALSE", "NOT GIVEN"], YNNG: ["YES", "NO", "NOT GIVEN"] };

const esc = v => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const L = i => String.fromCharCode(65 + i);
const letterIndex = l => String(l || "").toUpperCase().charCodeAt(0) - 65;
const clone = o => JSON.parse(JSON.stringify(o));
const slugify = v => String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "test";

/* ---------- Compile the editor format into the test format ---------- */
function compile(d) {
  const errors = [];
  let counter = 0;
  const next = () => ++counter;

  const parts = (d.parts || []).map((p, pi) => {
    const where = `Passage ${pi + 1}`;
    const paragraphs = (p.paragraphs || []).map(s => String(s).trim()).filter(Boolean);
    const type = d.type || "reading";
    const hasAudio = type === "listening" && !!p.audioUrl;
    if (type === "listening" && !p.audioUrl) errors.push(`${where}: upload the audio file`);
    const hasImage = type === "writing" && !!p.imageUrl;
    if (!paragraphs.length && !hasAudio && !hasImage) errors.push(`${where}: add at least one ${type === "writing" ? "task prompt" : "paragraph"}`);
    const groups = (type === "writing" || type === "speaking")
      ? []
      : (p.groups || []).map((g, gi) => compileGroup(g, next, errors, `${where}, question group ${gi + 1}`));
    return {
      passageTitle: p.passageTitle || `Passage ${pi + 1}`, instruction: p.instruction || "", instruction2: p.instruction2 || "", paragraphs, groups,
      audioUrl: p.audioUrl || "", imageUrl: p.imageUrl || "", minWords: Math.max(0, Number(p.minWords) || 0),
      labels: p.labels !== undefined ? p.labels !== false : d.labels !== false
    };
  });

  if (!parts.length) errors.push("Add at least one passage");

  return {
    test: { title: d.title || "Untitled test", type: d.type || "reading", time: Math.max(1, Number(d.time) || 20), labels: d.labels !== false, parts },
    errors,
    count: counter
  };
}

function compileGroup(g, next, errors, where) {
  const out = { type: g.type, heading: g.heading || "", instruction: g.instruction || "", items: [] };

  if (g.type === "GAP") {
    out.box = g.box || "";
    out.lines = [];
    let gaps = 0;
    (g.lines || []).forEach(line => {
      const raw = String(line.text || "");
      if (!raw.trim()) return;
      const text = raw.replace(/\[([^\]]+)\]/g, (_, inner) => {
        const no = next();
        gaps++;
        out.items.push({ nos: [no], answers: inner.split("/").map(v => v.trim()).filter(Boolean) });
        return `{${no}}`;
      });
      out.lines.push({ kind: line.kind || "b", text });
    });
    if (!gaps) errors.push(`${where}: add at least one answer in [square brackets]`);
  } else if (g.type === "MATCH") {
    out.options = [...(g.options || [])];
    if (out.options.length < 2) errors.push(`${where}: add at least two options`);
    if (out.options.some(o => !String(o).trim())) errors.push(`${where}: some options are empty`);
    (g.items || []).forEach((item, i) => {
      const no = next();
      if (!String(item.text || "").trim()) errors.push(`${where}, item ${i + 1}: type the item text`);
      if (!/^[A-Z]$/.test(item.answer || "") || letterIndex(item.answer) >= out.options.length) {
        errors.push(`${where}, item ${i + 1}: choose the correct heading`);
      }
      // The question number is added automatically, so a number typed at the end of the text ("…____ (27)") is dropped.
      out.items.push({ nos: [no], text: String(item.text || "").replace(/\s*\(\d+\)/g, ""), answers: [item.answer || ""] });
    });
    // Optional summary: its blanks (____) are filled, in order, with the items' numbers.
    if (g.summary) {
      let k = 0;
      out.summary = String(g.summary).replace(/_{3,}/g, () => (out.items[k] ? `{${out.items[k++].nos[0]}}` : "____"));
      if (k !== out.items.length) errors.push(`${where}: the summary needs one blank (____) for each item (${out.items.length})`);
    }
  } else if (g.type === "MCQ") {
    (g.items || []).forEach((item, i) => {
      const w = `${where}, item ${i + 1}`;
      const opts = item.options || [];
      const correct = [...(item.correct || [])].sort();
      if (!String(item.text || "").trim()) errors.push(`${w}: type the question`);
      if (opts.filter(o => String(o).trim()).length < 2) errors.push(`${w}: add at least two options`);
      if (!correct.length) errors.push(`${w}: tick the correct answer`);
      const nos = Array.from({ length: Math.max(1, correct.length) }, () => next());
      out.items.push({ nos, text: item.text || "", options: [...opts], answers: correct.length ? correct : ["A"], multi: nos.length > 1 });
    });
  } else if (g.type === "SHORT") {
    (g.items || []).forEach((item, i) => {
      const no = next();
      const answers = String(item.alts || "").split(",").map(v => v.trim()).filter(Boolean);
      if (!String(item.text || "").trim()) errors.push(`${where}, item ${i + 1}: type the question`);
      if (!answers.length) errors.push(`${where}, item ${i + 1}: add the accepted answer(s)`);
      out.items.push({ nos: [no], text: item.text || "", answers });
    });
  } else {
    const allowed = TF[g.type] || TF.TFNG;
    (g.items || []).forEach((item, i) => {
      const no = next();
      if (!String(item.text || "").trim()) errors.push(`${where}, item ${i + 1}: type the statement`);
      if (!allowed.includes(item.answer)) errors.push(`${where}, item ${i + 1}: choose the answer`);
      out.items.push({ nos: [no], text: item.text || "", answers: [item.answer] });
    });
  }

  const nos = out.items.flatMap(it => it.nos);
  out.range = nos.length > 1 ? `${nos[0]}–${nos[nos.length - 1]}` : nos.length ? String(nos[0]) : "";
  return out;
}

/* ---------- Convert a test back into editor format (for files without editor data) ---------- */
function fromRuntime(data) {
  if (!data || !Array.isArray(data.parts)) throw new Error("Not a test");

  const parts = data.parts.map(p => {
    const groups = (p.groups || []).map(g => {
      const base = { type: g.type, heading: g.heading || "", instruction: g.instruction || "", box: g.box || "", lines: [], items: [], options: [] };
      const byNo = new Map((g.items || []).map(it => [String(it.nos[0]), it]));

      if (g.type === "GAP") {
        base.lines = (g.lines || []).map(ln => ({
          kind: ln.kind === "h" || ln.kind === "t" ? ln.kind : "b",
          text: String(ln.text || "").replace(/\{(\d+)\}/g, (_, no) => {
            const it = byNo.get(no);
            return `[${(it && it.answers ? it.answers : []).join("/")}]`;
          })
        }));
      } else if (g.type === "MATCH") {
        base.options = [...(g.options || [])];
        base.items = (g.items || []).map(it => ({ ...blankItem("MATCH"), text: it.text || "", answer: (it.answers || [])[0] || "A" }));
      } else if (g.type === "MCQ") {
        base.items = (g.items || []).map(it => ({ ...blankItem("MCQ"), text: it.text || "", options: [...(it.options || [])], correct: [...(it.answers || [])] }));
      } else if (g.type === "SHORT") {
        base.items = (g.items || []).map(it => ({ ...blankItem("SHORT"), text: it.text || "", alts: (it.answers || []).join(", ") }));
      } else {
        base.items = (g.items || []).map(it => ({ ...blankItem(g.type), text: it.text || "", answer: (it.answers || [])[0] || "" }));
      }
      return base;
    });

    return {
      passageTitle: p.passageTitle || "",
      instruction: p.instruction || "",
      paragraphs: (p.paragraphs || []).length ? [...p.paragraphs] : [""],
      // Keep the per-passage "Show paragraph letters" setting when a saved test is opened again.
      ...(p.labels !== undefined ? { labels: p.labels !== false } : {}),
      groups
    };
  });

  return { title: data.title || "Untitled test", time: Number(data.time) || 20, labels: data.labels !== false, parts };
}

/* Reads a saved test page, a tests/*.js file, or a plain JSON test. */
function parseTestFile(text) {
  const m = text.match(/window\.TEST_DATA\s*=\s*([\s\S]*?);\s*<\/script>/);
  if (m) return JSON.parse(m[1]);
  const t = text.trim();
  if (t.indexOf("window.TEST_DATA") === 0) {
    return JSON.parse(t.replace(/^window\.TEST_DATA\s*=\s*/, "").replace(/;\s*$/, ""));
  }
  return JSON.parse(t);
}

/* ---------- Build a standalone test page ---------- */
// Writing and speaking use their own player pages, loaded once when the editor opens.
const TEMPLATE_FILES = { reading: "templates/reading.html", writing: "templates/writing.html", speaking: "templates/speaking.html" };
const templateCache = {};
function templateFor(type) {
  if (type === "writing" || type === "speaking") return templateCache[type] || null;
  return templateCache.reading || null;
}

function buildTestPage(source, id) {
  const { test, errors } = compile(source);
  const payload = { ...test, id: id || null, editor: clone(source) };
  const json = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const closeTag = "<" + "/script>";
  const raw = templateFor(test.type);
  if (!raw) return { html: "", test, errors: [...errors, "The page template for this test type could not load. Reload the editor and try again."] };
  const template = raw.replace(/<\\\/script>/g, closeTag);
  return { html: template.replace("__TEST_DATA__", () => json), test, errors };
}

/* Loads every page template. Resolves when all are cached (or failed). */
function loadTemplates() {
  return Promise.all(Object.entries(TEMPLATE_FILES).map(([type, file]) =>
    fetch(file)
      .then(r => (r.ok ? r.text() : Promise.reject(r.status)))
      .then(text => { templateCache[type] = text; })
  ));
}
