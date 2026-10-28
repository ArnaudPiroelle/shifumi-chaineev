(() => {
  "use strict";

  const MOVES = {
    pierre:  { emoji: "✊", label: "Pierre",  beats: "ciseaux" },
    feuille: { emoji: "✋", label: "Feuille", beats: "pierre" },
    ciseaux: { emoji: "✌️", label: "Ciseaux", beats: "feuille" },
  };
  const MOVE_KEYS = Object.keys(MOVES);
  const counterOf = (m) => MOVE_KEYS.find((k) => MOVES[k].beats === m);

  const DATA = window.SHIFUMI_DATA;
  const [A, B] = DATA.players;
  const P = { a: A, b: B };
  const other = (id) => (id === "a" ? "b" : "a");
  // duel nul (fini sur une égalité, sans vainqueur)
  const DRAW = { name: "Nul", color: "#8a9aad" };
  const W = (m) => (m.winner ? P[m.winner] : DRAW);

  document.documentElement.style.setProperty("--a", A.color);
  document.documentElement.style.setProperty("--b", B.color);
  document.querySelectorAll("[data-name]").forEach((el) => (el.textContent = P[el.dataset.name].name));

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

  // "12:34", "1:02:03" ou 754 → secondes
  function toSeconds(t) {
    if (t == null || t === "") return null;
    if (typeof t === "number") return t;
    return String(t).split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
  }
  function fmtTime(s) {
    if (s == null) return "";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const mm = h ? String(m).padStart(2, "0") : m;
    return (h ? h + ":" : "") + mm + ":" + String(sec).padStart(2, "0");
  }
  function fmtDate(d) {
    return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }
  function roundResult(r) {
    if (r.a === r.b) return null;
    return MOVES[r.a].beats === r.b ? "a" : "b";
  }

  // ---------- Préparation des données ----------
  const matches = DATA.matches
    .map((m) => {
      const rounds = m.rounds.filter((r) => MOVES[r.a] && MOVES[r.b]);
      if (rounds.length !== m.rounds.length) console.warn(`[shifumi] coup inconnu dans ${m.id}`);
      // si la dernière manche est une égalité, le duel est nul (winner = null)
      const winner = rounds.length ? roundResult(rounds[rounds.length - 1]) : null;
      rounds.slice(0, -1).forEach((r, i) => {
        if (roundResult(r)) console.warn(`[shifumi] ${m.id} : la manche ${i + 1} n'est pas une égalité`);
      });
      const video = m.video || {};
      return {
        ...m,
        rounds,
        winner,
        ties: rounds.filter((r) => !roundResult(r)).length,
        start: toSeconds(video.start),
        end: toSeconds(video.end),
      };
    })
    .filter((m) => m.rounds.length)
    .sort((x, y) => x.date.localeCompare(y.date));

  // ---------- Calculs ----------
  const S = {
    wins: { a: 0, b: 0 },
    draws: 0,
    moves: { a: zero(), b: zero() },
    winningMoves: { a: zero(), b: zero() },
    opening: { a: zero(), b: zero() },
    matrix: {},
    afterTie: { a: { keep: 0, change: 0 }, b: { keep: 0, change: 0 } },
    totalRounds: 0,
    tieMatches: 0,
    longestTie: null,
  };
  function zero() { return { pierre: 0, feuille: 0, ciseaux: 0 }; }
  MOVE_KEYS.forEach((x) => MOVE_KEYS.forEach((y) => (S.matrix[x + "|" + y] = 0)));

  matches.forEach((m) => {
    if (m.winner) S.wins[m.winner]++;
    else S.draws++;
    S.totalRounds += m.rounds.length;
    if (m.ties > 0) S.tieMatches++;
    if (!S.longestTie || m.ties > S.longestTie.ties) S.longestTie = m;
    S.opening.a[m.rounds[0].a]++;
    S.opening.b[m.rounds[0].b]++;
    const last = m.rounds[m.rounds.length - 1];
    if (m.winner) S.winningMoves[m.winner][last[m.winner]]++;
    m.rounds.forEach((r, i) => {
      S.moves.a[r.a]++;
      S.moves.b[r.b]++;
      S.matrix[r.a + "|" + r.b]++;
      if (i > 0) {
        const prev = m.rounds[i - 1];
        ["a", "b"].forEach((p) => S.afterTie[p][r[p] === prev[p] ? "keep" : "change"]++);
      }
    });
  });

  // Séries
  function streaks() {
    const best = { a: 0, b: 0 };
    let cur = { who: null, n: 0 };
    matches.forEach((m) => {
      if (!m.winner) { cur = { who: null, n: 0 }; return; } // un nul casse la série
      cur = cur.who === m.winner ? { who: m.winner, n: cur.n + 1 } : { who: m.winner, n: 1 };
      best[m.winner] = Math.max(best[m.winner], cur.n);
    });
    return { best, cur };
  }
  const ST = streaks();
  const total = matches.length;
  const leader = S.wins.a === S.wins.b ? null : S.wins.a > S.wins.b ? "a" : "b";

  // ---------- Scoreboard ----------
  function playerBlock(id, side) {
    const p = P[id];
    const crown = leader === id ? '<span class="crown" title="En tête">👑</span> ' : "";
    return `<div class="player ${side}">
      <span class="name" style="color:${p.color}">${crown}${esc(p.name)}</span>
      <span class="wins" style="color:${p.color}">${S.wins[id]}</span>
      <span class="meta">${pct(S.wins[id], total)}% de victoires</span>
    </div>`;
  }
  $("#scoreboard").innerHTML = `
    ${playerBlock("a", "")}
    <div class="vs">VS<br><small>${total} duels${S.draws ? `<br>${S.draws} nul${S.draws > 1 ? "s" : ""}` : ""}</small></div>
    ${playerBlock("b", "right")}
    <div class="bar" aria-hidden="true">
      <span style="width:${pct(S.wins.a, total)}%;background:${A.color}"></span>
      <span style="width:${pct(S.draws, total)}%;background:${DRAW.color}" title="Nuls"></span>
      <span style="width:${pct(S.wins.b, total)}%;background:${B.color}"></span>
    </div>`;

  // ---------- KPIs ----------
  const kpis = [
    [total, "duels disputés"],
    [S.totalRounds, "manches jouées"],
    [pct(S.tieMatches, total) + "%", "des duels avec égalité"],
    [S.draws, "duel(s) sans vainqueur"],
    [S.longestTie ? S.longestTie.ties : 0, `égalités d'affilée max${S.longestTie && S.longestTie.ties ? " (" + esc(S.longestTie.car) + ")" : ""}`],
    [ST.cur.who ? ST.cur.n : 0, ST.cur.who ? `victoire(s) d'affilée en cours pour ${esc(P[ST.cur.who].name)}` : "série en cours"],
  ];
  $("#kpis").innerHTML = kpis.map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");

  // ---------- Timeline (victoires cumulées) ----------
  function timeline() {
    const W = 1000, H = 260, pad = { l: 36, r: 16, t: 16, b: 28 };
    const n = Math.max(total, 1);
    const max = Math.max(S.wins.a, S.wins.b, 1);
    const x = (i) => pad.l + (i / n) * (W - pad.l - pad.r);
    const y = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b);
    const pts = { a: [[x(0), y(0)]], b: [[x(0), y(0)]] };
    const c = { a: 0, b: 0 };
    matches.forEach((m, i) => {
      if (m.winner) c[m.winner]++;
      pts.a.push([x(i + 1), y(c.a)]);
      pts.b.push([x(i + 1), y(c.b)]);
    });
    const step = Math.max(1, Math.ceil(max / 5));
    let grid = "";
    for (let v = 0; v <= max; v += step) {
      grid += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    const line = (id) => {
      const p = pts[id];
      const dots = p.slice(1).map(([px, py], i) =>
        matches[i].winner === id ? `<circle cx="${px}" cy="${py}" r="4" fill="${P[id].color}"><title>${esc(matches[i].car)} — ${fmtDate(matches[i].date)}</title></circle>` : ""
      ).join("");
      return `<polyline fill="none" stroke="${P[id].color}" stroke-width="3" stroke-linejoin="round" points="${p.map((q) => q.join(",")).join(" ")}"/>${dots}`;
    };
    const first = matches[0], last = matches[matches.length - 1];
    const labels = first ? `<text x="${pad.l}" y="${H - 6}">${fmtDate(first.date)}</text><text x="${W - pad.r}" y="${H - 6}" text-anchor="end">${fmtDate(last.date)}</text>` : "";
    $("#timeline").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Victoires cumulées">${grid}${line("a")}${line("b")}${labels}</svg>${legend()}`;
  }
  function legend() {
    return `<div class="legend">${["a", "b"].map((id) => `<span><i style="background:${P[id].color}"></i>${esc(P[id].name)}</span>`).join("")}</div>`;
  }

  // ---------- Barres coups par joueur ----------
  function moveBars(target, data) {
    const max = Math.max(1, ...MOVE_KEYS.flatMap((k) => [data.a[k], data.b[k]]));
    const sum = { a: MOVE_KEYS.reduce((s, k) => s + data.a[k], 0), b: MOVE_KEYS.reduce((s, k) => s + data.b[k], 0) };
    $(target).innerHTML = MOVE_KEYS.map((k) => `
      <div class="mv-row">
        <div class="mv-emoji" title="${MOVES[k].label}">${MOVES[k].emoji}</div>
        <div class="mv-bars">
          ${["a", "b"].map((id) => `<div class="hbar"><span class="fill" style="width:${(data[id][k] / max) * 85}%;background:${P[id].color}"></span>${data[id][k]} <small>(${pct(data[id][k], sum[id])}%)</small></div>`).join("")}
        </div>
      </div>`).join("") + legend();
  }

  // ---------- Donuts (coup d'ouverture) ----------
  const SHADES = { pierre: 1, feuille: 0.6, ciseaux: 0.3 };
  function donut(id, data) {
    const sum = MOVE_KEYS.reduce((s, k) => s + data[k], 0) || 1;
    const R = 40, C = 2 * Math.PI * R;
    let off = 0;
    const arcs = MOVE_KEYS.map((k) => {
      const len = (data[k] / sum) * C;
      const el = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${P[id].color}" stroke-opacity="${SHADES[k]}" stroke-width="18" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"><title>${MOVES[k].label} : ${data[k]}</title></circle>`;
      off += len;
      return el;
    }).join("");
    const fav = MOVE_KEYS.reduce((b, k) => (data[k] > data[b] ? k : b), MOVE_KEYS[0]);
    return `<div class="donut">
      <svg viewBox="0 0 120 120">${arcs}<text x="60" y="70" text-anchor="middle" font-size="30">${MOVES[fav].emoji}</text></svg>
      <div class="who" style="color:${P[id].color}">${esc(P[id].name)}</div>
      <div class="fav">${MOVE_KEYS.map((k) => `${MOVES[k].emoji} ${pct(data[k], sum)}%`).join(" · ")}</div>
    </div>`;
  }
  $("#opening").innerHTML = `<div class="donuts">${donut("a", S.opening.a)}${donut("b", S.opening.b)}</div>`;

  // ---------- Matrice des coups ----------
  function matrix() {
    const max = Math.max(1, ...Object.values(S.matrix));
    let html = `<div class="h"></div>` + MOVE_KEYS.map((k) => `<div class="h" style="color:${B.color}">${MOVES[k].emoji}</div>`).join("");
    MOVE_KEYS.forEach((ra) => {
      html += `<div class="h">${MOVES[ra].emoji}</div>`;
      MOVE_KEYS.forEach((cb) => {
        const n = S.matrix[ra + "|" + cb];
        const res = roundResult({ a: ra, b: cb });
        const color = res ? P[res].color : "#8a9aad";
        const alpha = n ? 0.18 + 0.7 * (n / max) : 0.06;
        const label = res ? `victoire ${P[res].name}` : "égalité";
        html += `<div class="c" style="background:color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)" title="${MOVES[ra].label} vs ${MOVES[cb].label} — ${label}">${n}</div>`;
      });
    });
    $("#matrix").innerHTML = `<div class="matrix">${html}</div>
      <div class="legend"><span><i style="background:${A.color}"></i>gagné par ${esc(A.name)}</span><span><i style="background:${B.color}"></i>gagné par ${esc(B.name)}</span><span><i style="background:#8a9aad"></i>égalité</span></div>`;
  }

  // ---------- Après égalité ----------
  function afterTie() {
    const html = ["a", "b"].map((id) => {
      const { keep, change } = S.afterTie[id];
      const t = keep + change;
      if (!t) return `<div class="split"><div class="who" style="color:${P[id].color}">${esc(P[id].name)}</div><p class="sub">Pas encore de données.</p></div>`;
      return `<div class="split">
        <div class="who" style="color:${P[id].color}">${esc(P[id].name)}</div>
        <div class="track">
          <span style="width:${pct(keep, t)}%;background:${P[id].color}">${keep ? `garde ${pct(keep, t)}%` : ""}</span>
          <span style="width:${pct(change, t)}%;background:color-mix(in srgb, ${P[id].color} 45%, var(--panel-2))">${change ? `change ${pct(change, t)}%` : ""}</span>
        </div>
      </div>`;
    }).join("");
    $("#aftertie").innerHTML = html + `<p class="sub">Basé sur ${S.afterTie.a.keep + S.afterTie.a.change} manche(s) jouée(s) juste après une égalité.</p>`;
  }

  // ---------- Séries ----------
  function streaksCard() {
    const form = matches.slice(-15).map((m) => `<b style="background:${W(m).color}" title="${esc(m.car)} — ${esc(W(m).name)}">${m.winner ? esc(W(m).name[0]) : "="}</b>`).join("");
    $("#streaks").innerHTML = `
      ${["a", "b"].map((id) => `<div class="streak"><span style="color:${P[id].color}">Meilleure série de ${esc(P[id].name)}</span><span class="v">${ST.best[id]}</span></div>`).join("")}
      <div class="streak"><span>Série en cours</span><span class="v" style="color:${ST.cur.who ? P[ST.cur.who].color : "inherit"}">${ST.cur.n}</span></div>
      <p class="sub" style="margin:12px 0 0">Forme récente (du plus ancien au plus récent)</p>
      <div class="form">${form}</div>`;
  }

  // ---------- Liste des duels ----------
  function thumbUrl(m) {
    return m.video && m.video.id ? `https://i.ytimg.com/vi/${encodeURIComponent(m.video.id)}/hqdefault.jpg` : "";
  }
  function chainHtml(m) {
    return m.rounds.map((r, i) => {
      const final = i === m.rounds.length - 1;
      const wa = final && m.winner === "a" ? ' class="w"' : "";
      const wb = final && m.winner === "b" ? ' class="w"' : "";
      return `${i ? '<span class="arrow">→</span>' : ""}<span class="round${final ? " final" : ""}"><span${wa}>${MOVES[r.a].emoji}</span><small>vs</small><span${wb}>${MOVES[r.b].emoji}</span></span>`;
    }).join("");
  }
  function duelCard(m) {
    const w = W(m);
    const t = thumbUrl(m);
    return `<button class="duel" style="--winner:${w.color}" data-id="${esc(m.id)}">
      <div class="thumb" style="${t ? `background-image:url('${t}')` : ""}">
        ${t ? '<span class="play">▶</span>' : '<span class="noid">vidéo à renseigner</span>'}
        ${m.start != null ? `<span class="ts">${fmtTime(m.start)}</span>` : ""}
      </div>
      <div class="duel-body">
        <div class="duel-top"><span>${fmtDate(m.date)}</span>${m.ties ? `<span class="badge-ties">${m.ties} égalité${m.ties > 1 ? "s" : ""}</span>` : ""}</div>
        <div class="car">${esc(m.car)}</div>
        ${m.stake ? `<div class="stake">🎯 ${esc(m.stake)}</div>` : ""}
        <div class="chain">${chainHtml(m)}</div>
        <div class="winner-tag">${m.winner ? `🏆 ${esc(w.name)}` : "🤝 Pas de vainqueur"}</div>
      </div>
    </button>`;
  }

  const filter = { q: "", winner: "all", ties: false };
  $("#f-winner").innerHTML = [["all", "Tous"], ["a", A.name], ["b", B.name], ["draw", "Nuls"]]
    .map(([v, l]) => `<button data-v="${v}" aria-pressed="${v === "all"}">${esc(l)}</button>`).join("");
  $("#f-winner").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    filter.winner = b.dataset.v;
    $("#f-winner").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    renderList();
  });
  $("#q").addEventListener("input", (e) => { filter.q = e.target.value.trim().toLowerCase(); renderList(); });
  $("#f-ties").addEventListener("change", (e) => { filter.ties = e.target.checked; renderList(); });

  function renderList() {
    const list = matches
      .filter((m) => filter.winner === "all" || (filter.winner === "draw" ? !m.winner : m.winner === filter.winner))
      .filter((m) => !filter.ties || m.ties > 0)
      .filter((m) => !filter.q || [m.car, m.stake, m.note, m.video && m.video.title].join(" ").toLowerCase().includes(filter.q))
      .slice().reverse();
    $("#count").textContent = `${list.length} duel${list.length > 1 ? "s" : ""}`;
    $("#list").innerHTML = list.map(duelCard).join("") || '<p class="sub">Aucun duel ne correspond.</p>';
  }
  $("#list").addEventListener("click", (e) => {
    const card = e.target.closest(".duel");
    if (card) openDuel(card.dataset.id);
  });

  // ---------- Lecteur (modal) ----------
  const dlg = $("#player");
  function openDuel(id) {
    const m = matches.find((x) => x.id === id);
    if (!m) return;
    const w = W(m);
    dlg.style.setProperty("--winner", w.color);
    $("#dlg-title").textContent = (m.video && m.video.title) || m.car;

    const vid = m.video && m.video.id;
    if (vid) {
      const params = new URLSearchParams({ autoplay: "1", rel: "0", modestbranding: "1" });
      if (m.start != null) params.set("start", m.start);
      if (m.end != null) params.set("end", m.end);
      $("#dlg-video").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(vid)}?${params}" title="Extrait YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    } else {
      $("#dlg-video").innerHTML = `<div class="empty"><p>Pas encore d'ID YouTube pour ce duel.<br>Ajoute-le dans <code>data.js</code>.</p></div>`;
    }

    const steps = m.rounds.map((r, i) => {
      const res = roundResult(r);
      const final = i === m.rounds.length - 1;
      return `<div class="step${final ? " final" : ""}">
        <span class="n">Manche ${i + 1}</span>
        <span class="m" title="${esc(A.name)} : ${MOVES[r.a].label}">${MOVES[r.a].emoji}</span>
        <span class="res">${res ? `<span style="color:${P[res].color}">${esc(P[res].name)}</span>` : "égalité"}</span>
        <span class="m" title="${esc(B.name)} : ${MOVES[r.b].label}">${MOVES[r.b].emoji}</span>
      </div>`;
    }).join("");
    const ytLink = vid ? `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(vid)}${m.start != null ? "&t=" + m.start + "s" : ""}" target="_blank" rel="noopener">Ouvrir sur YouTube ↗</a>` : "";

    $("#dlg-body").innerHTML = `
      <div class="duel-top"><span>${fmtDate(m.date)} · ${esc(m.car)}</span><span>${ytLink}</span></div>
      ${m.stake ? `<div>🎯 Enjeu : <strong>${esc(m.stake)}</strong></div>` : ""}
      <div class="step" style="background:none;padding-top:0;padding-bottom:0"><span></span><strong style="text-align:center;color:${A.color}">${esc(A.name)}</strong><span></span><strong style="text-align:center;color:${B.color}">${esc(B.name)}</strong></div>
      <div class="steps">${steps}</div>
      <div class="winner-tag" style="color:${w.color};font-size:1.1rem">${m.winner
        ? `🏆 Victoire de ${esc(w.name)}${m.ties ? ` après ${m.ties} égalité${m.ties > 1 ? "s" : ""}` : ""}`
        : `🤝 Pas de vainqueur après ${m.ties} égalité${m.ties > 1 ? "s" : ""}`}</div>
      ${m.note ? `<p class="sub" style="margin:0">${esc(m.note)}</p>` : ""}`;

    dlg.showModal();
    history.replaceState(null, "", "#duel-" + m.id);
  }
  function closeDuel() {
    dlg.close();
  }
  dlg.addEventListener("close", () => {
    $("#dlg-video").innerHTML = ""; // coupe la vidéo
    if (location.hash.startsWith("#duel-")) history.replaceState(null, "", location.pathname + location.search);
  });
  $("#dlg-close").addEventListener("click", closeDuel);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) closeDuel(); });

  // ---------- Coach ----------
  function coach() {
    if (!total) {
      $("#coach-cards").innerHTML = '<p class="sub">Le coach attend les premiers duels pour donner ses conseils.</p>';
      return;
    }
    $("#coach-cards").innerHTML = ["a", "b"].map((id) => {
      const opp = other(id);
      const open = S.opening[id];
      const fav = MOVE_KEYS.reduce((b, k) => (open[k] > open[b] ? k : b), MOVE_KEYS[0]);
      const counter = counterOf(fav);
      const keepRate = pct(S.afterTie[id].keep, S.afterTie[id].keep + S.afterTie[id].change);
      const tieTip = S.afterTie[id].keep + S.afterTie[id].change
        ? keepRate >= 50
          ? `Après une égalité, ${esc(P[id].name)} <strong>garde son coup ${keepRate}%</strong> du temps : joue ce qui bat le coup précédent.`
          : `Après une égalité, ${esc(P[id].name)} <strong>change de coup ${100 - keepRate}%</strong> du temps : évite de rejouer ce qui battait son coup précédent.`
        : "";
      return `<article class="card coach" style="border-color:color-mix(in srgb, ${P[opp].color} 50%, var(--line))">
        <h3>Pour battre <span style="color:${P[id].color}">${esc(P[id].name)}</span></h3>
        <div class="big" style="margin-top:12px">${MOVES[counter].emoji}</div>
        <p>En ouverture, ${esc(P[id].name)} joue <strong>${MOVES[fav].label.toLowerCase()} ${pct(open[fav], total)}%</strong> du temps. ${esc(P[opp].name)}, ouvre avec <strong>${MOVES[counter].label.toLowerCase()}</strong>.</p>
        ${tieTip ? `<p>${tieTip}</p>` : ""}
      </article>`;
    }).join("");
  }

  // ---------- Rendu ----------
  timeline();
  moveBars("#moves", S.moves);
  moveBars("#winning", S.winningMoves);
  matrix();
  afterTie();
  streaksCard();
  renderList();
  coach();

  // Lien partageable vers un duel : index.html#duel-<id>
  const m = location.hash.match(/^#duel-(.+)$/);
  if (m) openDuel(decodeURIComponent(m[1]));
})();
