(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const M = window.MISSIONS, CATS = window.CATS, RAR = window.RARITY;
  const byId = Object.fromEntries(M.map((m) => [m.id, m]));
  const KEY = "shinsetsu-gacha-v1";
  const REROLL_MAX = 3, DAY_GOAL = 5;
  const CAP_COLORS = ["#FFD166", "#FF9AA2", "#8FD6C1", "#A0C4FF", "#C79BE8", "#FFB347"];

  const todayStr = (d = new Date()) => {
    const z = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- state ----------
  let S;
  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
    S.done = Array.isArray(S.done) ? S.done : [];
    S.cats = Array.isArray(S.cats) && S.cats.length ? S.cats : Object.keys(CATS);
    S.reroll = S.reroll && S.reroll.date === todayStr() ? S.reroll : { date: todayStr(), n: 0 };
    S.name = S.name || "";
    if (S.active && !byId[S.active.id]) S.active = null;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  const points = () => S.done.reduce((a, d) => a + (byId[d.id] ? RAR[byId[d.id].r].pt : 0), 0);
  const todayDone = () => S.done.filter((d) => d.date === todayStr()).length;
  const rerollLeft = () => Math.max(0, REROLL_MAX - (S.reroll.date === todayStr() ? S.reroll.n : 0));
  function streak() {
    const days = new Set(S.done.map((d) => d.date));
    let n = 0; const d = new Date();
    if (!days.has(todayStr(d))) d.setDate(d.getDate() - 1);
    while (days.has(todayStr(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------- render helpers ----------
  function cardHTML(m) {
    const c = CATS[m.cat], r = RAR[m.r];
    return `<div class="mc-top"><span class="mc-cat">${c.emoji} ${c.label}</span><span class="mc-rar">${r.short} ${r.stars}</span></div>
      <p class="mc-text">${esc(m.t)}</p><p class="mc-tip">💡 ${esc(m.tip)}</p>`;
  }
  function fillCard(el, m) {
    el.innerHTML = cardHTML(m);
    el.style.setProperty("--cc", CATS[m.cat].color);
    el.classList.toggle("r3", m.r === 3);
  }

  function renderHeader() {
    $("#ptsNum").textContent = points();
    const n = todayDone();
    $("#todayNum").textContent = n;
    $("#hearts").innerHTML = Array.from({ length: DAY_GOAL }, (_, i) => `<span class="${i < n ? "on" : ""}">${i < n ? "💛" : "♡"}</span>`).join("");
    $("#todayNote").textContent = n >= DAY_GOAL
      ? "きょうは5つ達成！「しんせつデー」おめでとうございます 🎉"
      : n > 0 ? `あと${DAY_GOAL - n}つで「しんせつデー」達成。1日に5つの親切をすると、幸福感がぐっと上がるという研究があります。`
      : "1日に5つの親切をすると、幸福感がぐっと上がるという研究があります。まずはひとつから。";
  }

  function renderGacha() {
    renderHeader();
    const a = S.active && byId[S.active.id];
    $("#activeBox").classList.toggle("hidden", !a);
    $("#machineBox").classList.toggle("hidden", !!a);
    if (a) fillCard($("#activeCard"), a);
    $("#rerollLeft").textContent = $("#rerollLeft2").textContent = rerollLeft();
    $("#rerollBtn").disabled = $("#resultReroll").disabled = rerollLeft() === 0;
    // chips
    $("#chips").innerHTML = Object.entries(CATS).map(([k, c]) =>
      `<button class="chip ${S.cats.includes(k) ? "on" : ""}" data-cat="${k}" aria-pressed="${S.cats.includes(k)}">${c.emoji} ${c.label}</button>`).join("");
  }

  function renderCapsules() {
    const box = $("#capsules"); let h = "";
    const pos = [[20,120],[62,138],[106,128],[150,136],[178,104],[40,82],[86,92],[130,86],[168,62],[60,40],[108,48],[148,26],[16,40]];
    pos.forEach(([x, y], i) => {
      h += `<span class="cap" style="left:${x}px;top:${y}px;background:${CAP_COLORS[i % CAP_COLORS.length]};transform:rotate(${(i * 47) % 360}deg)"></span>`;
    });
    box.innerHTML = h;
  }

  function renderZukan() {
    const got = new Map();
    S.done.forEach((d) => got.set(d.id, (got.get(d.id) || 0) + 1));
    const uniq = got.size;
    $("#stats").innerHTML = `<div><b>${S.done.length}</b>やさしさの数</div><div><b>${streak()}</b>れんぞく日数</div><div><b>${uniq}/${M.length}</b>ずかん</div>`;
    $("#zukan").innerHTML = M.map((m) => {
      const c = CATS[m.cat], n = got.get(m.id);
      return `<button class="zk ${n ? "got" : ""} r${m.r}" style="--cc:${c.color}" data-id="${m.id}" aria-label="${n ? esc(m.t) : "まだ見ぬミッション"}">
        ${n && n > 1 ? `<span class="n">×${n}</span>` : ""}<span class="e">${c.emoji}</span>${n ? RAR[m.r].short : "？"}</button>`;
    }).join("");
  }

  function renderKiroku() {
    // calendar: last 5 weeks
    const days = {}; S.done.forEach((d) => (days[d.date] = (days[d.date] || 0) + 1));
    const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - now.getDay() - 28);
    let h = `<div class="cap-title">この5週間のやさしさ</div>` + ["日","月","火","水","木","金","土"].map((w) => `<div class="dw">${w}</div>`).join("");
    for (let i = 0; i < 35; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = todayStr(d), n = days[k] || 0, lv = n >= 5 ? 3 : n >= 2 ? 2 : n >= 1 ? 1 : 0;
      const fut = d > now;
      h += `<div class="d ${lv ? "l" + lv : ""} ${k === todayStr() ? "today" : ""}" style="${fut ? "opacity:.35" : ""}" title="${k} ${n}件">${d.getDate()}</div>`;
    }
    $("#calendar").innerHTML = h;
    const list = [...S.done].reverse();
    $("#log").innerHTML = list.length ? list.map((d) => {
      const m = byId[d.id]; if (!m) return "";
      return `<li style="--cc:${CATS[m.cat].color}"><span class="lm">${d.mood || CATS[m.cat].emoji}</span><div><div class="ld">${d.date.replace(/-/g, "/")}・${CATS[m.cat].label}・${RAR[m.r].short}</div>
        <div class="lt">${esc(m.t)}</div>${d.memo ? `<div class="lmemo">「${esc(d.memo)}」</div>` : ""}</div></li>`;
    }).join("") : `<li class="empty">まだきろくはありません。ガチャをまわしてみよう！</li>`;
    $("#nameInput").value = S.name;
  }

  function renderAll() { renderGacha(); renderZukan(); renderKiroku(); }

  // ---------- draw ----------
  function pickMission(excludeId) {
    const pool = M.filter((m) => S.cats.includes(m.cat) && m.id !== excludeId);
    const roll = Math.random();
    let rar = roll < 0.1 ? 3 : roll < 0.4 ? 2 : 1;
    let cand = pool.filter((m) => m.r === rar);
    if (!cand.length) cand = pool;
    // まだやっていないものを少し優先
    const doneIds = new Set(S.done.map((d) => d.id));
    const fresh = cand.filter((m) => !doneIds.has(m.id));
    if (fresh.length && Math.random() < 0.75) cand = fresh;
    return cand[Math.floor(Math.random() * cand.length)];
  }

  let pending = null, busy = false;
  function spin() {
    if (busy) return;
    if (!S.cats.length) return toast("ジャンルをひとつ以上えらんでね");
    busy = true;
    const m = pickMission(); pending = m;
    const mach = $("#machine"), handle = $("#handle"), cap = $("#dropCapsule");
    $("#spinBtn").disabled = true;
    handle.classList.remove("turn"); void handle.offsetWidth; handle.classList.add("turn");
    mach.classList.add("shake");
    vibrate(30);
    setTimeout(() => {
      mach.classList.remove("shake");
      cap.style.setProperty("--capc", m.r === 3 ? "linear-gradient(90deg,#FF9AA2,#FFD166,#8FD6C1,#A0C4FF)" : CATS[m.cat].color);
      if (m.r === 3) cap.querySelector(".cap-bottom").style.background = "linear-gradient(90deg,#FF9AA2,#FFD166,#8FD6C1,#A0C4FF)";
      else cap.querySelector(".cap-bottom").style.background = CATS[m.cat].color;
      cap.classList.remove("hidden", "pop");
      vibrate([20, 40, 20]);
    }, 1000);
    setTimeout(() => {
      cap.classList.add("pop");
      setTimeout(() => { cap.classList.add("hidden"); showResult(m); busy = false; $("#spinBtn").disabled = false; }, 450);
    }, 1900);
  }

  function showResult(m) {
    pending = m;
    const b = $("#rarityBanner");
    b.className = "rarity-banner r" + m.r;
    b.innerHTML = `${m.r === 3 ? "✨ でた！ ✨" : m.r === 2 ? "いいね！" : "きょうのミッション"}<b>${RAR[m.r].label}</b>`;
    $("#burst").className = "burst" + (m.r === 3 ? " r3" : "");
    fillCard($("#resultCard"), m);
    $("#rerollLeft2").textContent = rerollLeft();
    $("#resultReroll").disabled = rerollLeft() === 0;
    open("#resultOv");
    if (m.r === 3) confetti(120);
  }

  function useReroll() {
    if (rerollLeft() <= 0) { toast("きょうの引き直しはおしまい。このミッションでいってみよう！"); return false; }
    if (S.reroll.date !== todayStr()) S.reroll = { date: todayStr(), n: 0 };
    S.reroll.n++; save(); return true;
  }

  function accept(m) {
    S.active = { id: m.id, date: todayStr() }; save();
    close("#resultOv"); close("#batonOv");
    renderGacha(); showView("gacha");
    toast("ミッションスタート！できたら「できた！」を押してね");
  }

  // ---------- done ----------
  let mood = "";
  function openDone() {
    const m = byId[S.active.id];
    mood = "";
    $$("#moods button").forEach((b) => b.classList.remove("on"));
    $("#memoInput").value = "";
    $("#stampDate").textContent = todayStr().replace(/-/g, ".");
    const st = $("#stamp"); st.style.animation = "none"; void st.offsetWidth; st.style.animation = "";
    $("#doneSub").textContent = `+${RAR[m.r].pt} やさしさポイント。あなたのおかげで、だれかの一日がちょっとよくなりました。`;
    open("#doneOv");
    confetti(80); vibrate([30, 50, 30]);
  }
  function saveDone() {
    const m = byId[S.active.id];
    const entry = { id: m.id, date: todayStr(), mood, memo: $("#memoInput").value.trim().slice(0, 60), ts: Date.now() };
    S.done.push(entry); S.active = null; save();
    close("#doneOv");
    renderAll();
    const n = todayDone();
    if (n === DAY_GOAL) { confetti(220); toast("🎉 しんせつデー達成！ 5つのやさしさ"); }
    openShare(entry);
  }

  // ---------- share ----------
  let shareBlob = null, shareEntry = null;
  function batonURL(entry) {
    const u = new URL(location.href.split("#")[0].split("?")[0]);
    u.searchParams.set("baton", entry.id);
    if (S.name) u.searchParams.set("from", S.name);
    return u.toString();
  }
  function wrapText(ctx, text, maxW) {
    const lines = []; let cur = "";
    for (const ch of text) {
      if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function drawCard(entry) {
    const m = byId[entry.id], c = CATS[m.cat];
    const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1080;
    const x = cv.getContext("2d");
    const F = getComputedStyle(document.body).fontFamily;
    x.fillStyle = "#FFF4E6"; x.fillRect(0, 0, 1080, 1080);
    // dots
    CAP_COLORS.forEach((col, i) => { x.fillStyle = col; x.globalAlpha = .35; x.beginPath(); x.arc(120 + i * 170, 90 + (i % 2) * 40, 50, 0, 7); x.fill(); x.beginPath(); x.arc(960 - i * 170, 1000 - (i % 2) * 40, 40, 0, 7); x.fill(); });
    x.globalAlpha = 1;
    // card
    const rr = (X, Y, W, H, R) => { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); };
    x.fillStyle = c.color; rr(90, 210, 900, 640, 56); x.fill();
    x.fillStyle = "#fff"; rr(90, 196, 900, 640, 56); x.fill();
    x.lineWidth = 10; x.strokeStyle = c.color; x.stroke();
    x.fillStyle = "#4A3B32"; x.textAlign = "center";
    x.font = `bold 52px ${F}`; x.fillText("🎁 しんせつガチャ", 540, 130);
    x.fillStyle = c.color; rr(150, 250, 380, 76, 38); x.fill();
    x.fillStyle = "#fff"; x.font = `bold 38px ${F}`; x.textAlign = "left"; x.fillText(`${c.emoji} ${c.label}`, 180, 302);
    x.fillStyle = "#E8A23E"; x.textAlign = "right"; x.fillText(`${RAR[m.r].label} ${RAR[m.r].stars}`, 930, 302);
    x.fillStyle = "#4A3B32"; x.textAlign = "left"; x.font = `bold 58px ${F}`;
    const lines = wrapText(x, m.t, 760).slice(0, 5);
    const startY = 540 - (lines.length - 1) * 42;
    lines.forEach((l, i) => x.fillText(l, 160, startY + i * 84));
    x.font = `34px ${F}`; x.fillStyle = "#8C7A6B";
    x.fillText(`${entry.date.replace(/-/g, ".")}  やさしさ ${S.done.length} 個目`, 160, 790);
    // stamp
    x.save(); x.translate(860, 740); x.rotate(-0.2);
    x.strokeStyle = "#E85F3E"; x.lineWidth = 8; x.beginPath(); x.arc(0, 0, 90, 0, 7); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 76, 0, 7); x.stroke();
    x.fillStyle = "#E85F3E"; x.textAlign = "center"; x.font = `bold 40px ${F}`; x.fillText("やさしい", 0, 14); x.restore();
    x.fillStyle = "#4A3B32"; x.textAlign = "center"; x.font = `bold 40px ${F}`;
    x.fillText("つぎは、あなたの番。", 540, 950);
    return new Promise((res) => cv.toBlob((b) => res({ blob: b, url: cv.toDataURL("image/png") }), "image/png"));
  }
  async function openShare(entry) {
    shareEntry = entry;
    $("#copiedMsg").textContent = "";
    const { blob, url } = await drawCard(entry);
    shareBlob = blob; $("#shareImg").src = url;
    open("#shareOv");
  }
  async function doShare() {
    const url = batonURL(shareEntry), m = byId[shareEntry.id];
    const text = `きょうのちいさな親切：「${m.t}」をやってみました。やさしさのバトン、つぎはあなたの番🎁 #しんせつガチャ`;
    if (navigator.share) {
      try {
        const file = shareBlob && new File([shareBlob], "shinsetsu.png", { type: "image/png" });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ text, url, files: [file] });
        else await navigator.share({ text, url, title: "しんせつガチャ" });
        return;
      } catch (e) { if (e && e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); $("#copiedMsg").textContent = "リンクをコピーしました。LINEやSNSに貼りつけてね。"; }
    catch (e) { $("#copiedMsg").textContent = url; }
  }
  function saveImg() {
    const a = document.createElement("a"); a.href = $("#shareImg").src; a.download = `shinsetsu-${shareEntry.date}.png`; a.click();
  }

  // ---------- baton receive ----------
  function checkBaton() {
    const p = new URLSearchParams(location.search);
    const id = Number(p.get("baton")); if (!id || !byId[id]) return;
    const from = (p.get("from") || "").slice(0, 12);
    $("#batonTitle").innerHTML = (from ? `${esc(from)}さんから<br>` : "") + "やさしさのバトンが届きました";
    fillCard($("#batonCard"), byId[id]);
    pending = byId[id];
    open("#batonOv");
    history.replaceState(null, "", location.pathname);
  }

  // ---------- ui utils ----------
  function open(s) { $("#toast").classList.remove("show"); $(s).classList.remove("hidden"); }
  function close(s) { $(s).classList.add("hidden"); }
  let tt; function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2400); }
  function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
  function showView(v) {
    $$(".view").forEach((el) => el.classList.toggle("active", el.id === "view-" + v));
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === v));
    if (v === "zukan") renderZukan(); if (v === "kiroku") renderKiroku();
    window.scrollTo(0, 0);
  }

  // confetti
  const cv = $("#confetti"), cx = cv.getContext("2d"); let parts = [], raf = 0;
  function confetti(n) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    for (let i = 0; i < n; i++) parts.push({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * .4, vx: (Math.random() - .5) * 4, vy: 3 + Math.random() * 5, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, s: (6 + Math.random() * 8) * devicePixelRatio, c: CAP_COLORS[i % CAP_COLORS.length] });
    if (!raf) tick();
  }
  function tick() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach((p) => { p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += .05; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); cx.restore(); });
    parts = parts.filter((p) => p.y < cv.height + 30);
    raf = parts.length ? requestAnimationFrame(tick) : (cx.clearRect(0, 0, cv.width, cv.height), 0);
  }

  // ---------- events ----------
  function bind() {
    $("#spinBtn").addEventListener("click", spin);
    $("#chips").addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      const k = b.dataset.cat;
      if (S.cats.includes(k)) { if (S.cats.length === 1) return toast("ひとつはえらんでね"); S.cats = S.cats.filter((c) => c !== k); }
      else S.cats.push(k);
      save(); renderGacha();
    });
    $("#acceptBtn").addEventListener("click", () => pending && accept(pending));
    $("#resultReroll").addEventListener("click", () => { if (useReroll()) showResult(pickMission(pending && pending.id)); });
    $("#rerollBtn").addEventListener("click", () => { if (useReroll()) { const cur = S.active.id; S.active = null; save(); renderGacha(); showResult(pickMission(cur)); } });
    $("#doneBtn").addEventListener("click", openDone);
    $("#moods").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; mood = b.dataset.m; $$("#moods button").forEach((x) => x.classList.toggle("on", x === b)); });
    $("#saveDoneBtn").addEventListener("click", saveDone);
    $("#shareBtn").addEventListener("click", doShare);
    $("#saveImgBtn").addEventListener("click", saveImg);
    $("#closeShare").addEventListener("click", () => close("#shareOv"));
    $("#batonAccept").addEventListener("click", () => pending && accept(pending));
    $("#batonGacha").addEventListener("click", () => { close("#batonOv"); showView("gacha"); });
    $$(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));
    $("#zukan").addEventListener("click", (e) => {
      const b = e.target.closest(".zk"); if (!b) return;
      const m = byId[b.dataset.id];
      toast(b.classList.contains("got") ? m.t : `${CATS[m.cat].label}の${RAR[m.r].label}ミッション。ガチャで出会えるかも`);
    });
    $("#nameInput").addEventListener("change", (e) => { S.name = e.target.value.trim().slice(0, 12); save(); toast("ニックネームを保存しました"); });
    $("#resetBtn").addEventListener("click", () => { if (confirm("記録をすべて消しますか？（元に戻せません）")) { localStorage.removeItem(KEY); load(); renderAll(); toast("記録を消しました"); } });
    $$(".overlay").forEach((o) => o.addEventListener("click", (e) => { if (e.target === o && o.id !== "doneOv") close("#" + o.id); }));
  }

  load(); renderCapsules(); bind(); renderAll(); checkBaton();
})();
