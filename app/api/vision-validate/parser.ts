export type Parsed = {
  face_value: number | null;
  location: string | null;
  event: string | null;
  event_day: string | null; // YYYY-MM-DD
  ticket_type: "vip" | "standard" | null;
  entry_by: "early" | "normal" | "late" | null;
};

export function parseTicket(textRaw: string): Parsed {
  const text = normalize(textRaw);

  const face_value = grabFaceValue(text);
  const location   = lineAfter(text, /^location$/i);
  const eventLine  = lineAfter(text, /^event$/i);
  const event      = eventLine ? eventLine.replace(/\b20\d{2}\b$/, "").trim() : null;

  const startsLine = lineAfter(text, /^starts$/i);
  const yearHint   = findYear(text);
  const event_day  = extractEventDay(text);

  const ticket_type = classifyTicketType(text);       // vip | standard (default standard)
  const entry_by    = classifyEntryBy(text);          // early | normal | late (default normal)

  return { face_value, location, event, event_day, ticket_type, entry_by };
}

/* ---------------- helpers ---------------- */

function normalize(s: string) {
  return s.replace(/\u00A0/g, " ").replace(/[ \t]+\n/g, "\n").trim();
}

function lineAfter(text: string, label: RegExp): string | null {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (label.test(lines[i].trim())) {
      for (let j = i + 1; j < lines.length; j++) {
        const val = lines[j].trim();
        if (val) return val;
      }
    }
  }
  return null;
}

function grabFaceValue(text: string): number | null {
  // Handles "Face value" on its own line or same line
  const afterFace = lineAfter(text, /face\s*value/i) ?? "";
  const m = /£?\s*([\d]{1,3}(?:,[\d]{3})*(?:\.[\d]{2})?)/i.exec(afterFace);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

function findYear(s: string): number | null {
  const m = s.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}


// --- drop-in: robust event-day extractor --------------------

export function extractEventDay(textRaw: string): string | null {
  const text = textRaw.replace(/\u00A0/g, " ");
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const startsIdx = indexOfLabel(lines, "starts");
  const endsIdx   = indexOfLabel(lines, "ends");

  // collect date candidates from any line that looks like "Tue 4 Mar 10:00pm" or "4 March 22:00"
  const candidates = collectDateCandidates(lines); // [{idx, day, monthIdx}]

  if (candidates.length === 0) return null;

  // score candidates: prefer within ±10 lines of "Starts", else before "Ends", else first
  const best = pickBestCandidate(candidates, startsIdx, endsIdx);

  // choose a year: prefer explicit 20xx near Event section; else any 20xx; else infer (this year or next)
  const yearHint = findYearHintNearEvent(lines) ?? findAnyYear(text);

  return toIso(best.day, best.monthIdx, yearHint);
}

/* ---------------- helpers ---------------- */

function indexOfLabel(lines: string[], label: string) {
  const i = lines.findIndex((l) => l.toLowerCase() === label.toLowerCase());
  return i >= 0 ? i : null;
}

function collectDateCandidates(lines: string[]) {
  const months = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const dateRe = new RegExp(
    `^(?:mon|tue|wed|thu|fri|sat|sun)?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+${months}\\b`,
    "i"
  );

  const out: Array<{ idx: number; day: number; monthIdx: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(dateRe);
    if (!m) continue;
    const day = Number(m[1]);
    const mon3 = m[2].slice(0, 3).toLowerCase();
    const monthIdx = "jan feb mar apr may jun jul aug sep oct nov dec"
      .split(" ")
      .indexOf(mon3) + 1;
    if (day >= 1 && day <= 31 && monthIdx >= 1) {
      out.push({ idx: i, day, monthIdx });
    }
  }
  return out;
}

function pickBestCandidate(
  cands: Array<{ idx: number; day: number; monthIdx: number }>,
  startsIdx: number | null,
  endsIdx: number | null
) {
  // score: lower is better
  const scored = cands.map((c) => {
    let score = 1000 + c.idx; // base preference = earlier in doc
    if (startsIdx != null) {
      const dist = Math.abs(c.idx - startsIdx);
      if (dist <= 10) score = dist;        // strongest preference: near "Starts"
    }
    if (endsIdx != null && c.idx < endsIdx) {
      score -= 50; // prefer a date before "Ends"
    }
    return { ...c, score };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored[0];
}

function findYearHintNearEvent(lines: string[]): number | null {
  const i = lines.findIndex((l) => l.toLowerCase() === "event");
  if (i === -1) return null;
  for (let j = i; j < Math.min(lines.length, i + 5); j++) {
    const m = lines[j].match(/\b(20\d{2})\b/);
    if (m) return Number(m[1]);
  }
  return null;
}

function findAnyYear(text: string): number | null {
  const m = text.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

function toIso(day: number, monthIdx: number, yearHint?: number | null): string | null {
  const now = new Date();
  let year = yearHint ?? now.getUTCFullYear();
  const iso = (y: number) =>
    `${y}-${String(monthIdx).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // if we had to infer the year and the date already passed, roll to next year
  if (!yearHint) {
    const dt = new Date(`${iso(year)}T00:00:00Z`);
    if (dt.getTime() < Date.now() - 24 * 3600 * 1000) year += 1;
  }
  return iso(year);
}


/* ---- your classifications ---- */

// Only vip or standard; default to standard if neither keyword is present
function classifyTicketType(text: string): "vip" | "standard" | null {
  const s = text.toLowerCase();
  if (/\bvip\b/.test(s)) return "vip";
  if (/\bstandard\b/.test(s)) return "standard";
  return "standard";
}

// Entry category by phrases; default to normal
function classifyEntryBy(text: string): "early" | "normal" | "late" | null {
  const s = text.toLowerCase();
  if (/\bearly\s*entry\b/.test(s)) return "early";
  if (/\blate\s*entry\b/.test(s))  return "late";
  if (/\bnormal\s*entry\b|\bstandard\s*entry\b/.test(s)) return "normal";
  // also catch short labels like "Entry: Early/Late/Normal"
  if (/\bentry\b.*\bearly\b/.test(s)) return "early";
  if (/\bentry\b.*\blate\b/.test(s))  return "late";
  if (/\bentry\b.*\bnormal\b/.test(s))return "normal";
  return "normal";
}
