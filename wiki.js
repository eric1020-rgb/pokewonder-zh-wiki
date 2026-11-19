// 寶可夢 Wonderful 繁體中文百科：搜尋、篩選、表格排序。
(() => {
  const B = document.body.dataset.b || "zh";
  const AKAR = document.body.dataset.root || "./";
  const JENIS = {
    pokemon: "寶可夢",
    item: "道具",
    jurus: "招式",
    peta: "地圖",
    event: "活動",
    gym: "道館",
    sistem: "系統",
  };
  const norm = (s) =>
    String(s || "")
      .normalize("NFKC")
      .normalize("NFD")
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^0-9a-z\u3400-\u9fff\uf900-\ufaff]/g, "");
  let data = null;
  const muat = () =>
    (data ??= fetch(AKAR + "cari.json")
      .then((r) => r.json())
      .then((d) =>
        d.map((x) => {
          const aliases = String(x[5] || "")
            .split("|")
            .map(norm)
            .filter(Boolean);
          const label = x[4] || "";
          const dexM = /^#0*(\d+)$/.exec(label);
          return {
            n: x[0],
            u: x[1],
            j: x[2],
            i: x[3],
            l: label,
            dex: dexM ? String(parseInt(dexM[1], 10)) : "",
            keys: [norm(x[0]), norm(label), ...aliases].filter(Boolean),
          };
        })
      )
      .catch(() => []));

  function cocok(d, q) {
    const k = norm(q);
    if (!k) return [];
    const no = /^\d+$/.test(k);
    const n = no ? String(parseInt(k, 10)) : "";
    const exact = [];
    const awal = [];
    const isi = [];
    for (const x of d) {
      if (no && x.dex === n) {
        exact.push(x);
        continue;
      }
      if (x.keys.some((s) => s.startsWith(k))) awal.push(x);
      else if (x.keys.some((s) => s.includes(k))) isi.push(x);
    }
    return [...exact, ...awal, ...isi];
  }

  const baris = (x, kelas) =>
    `<a class="${kelas}" href="${AKAR}${encodeURI(x.u)}/">${
      x.i ? `<img src="${AKAR}gambar/${x.i}.png" alt="" loading="lazy">` : '<span style="width:32px"></span>'
    }<span>${x.n.replace(/</g, "&lt;")}${
      x.l ? ` <small>${x.l.replace(/</g, "&lt;")}</small>` : ""
    }</span><span class="j">${JENIS[x.j] || x.j}</span></a>`;

  const form = document.querySelector("form.cari");
  const input = form?.querySelector("input");
  const saran = form?.querySelector(".saran");
  let pilih = -1;
  let hasil = [];
  async function tampil() {
    const d = await muat();
    hasil = cocok(d, input.value).slice(0, 8);
    pilih = -1;
    saran.innerHTML = hasil.map((x) => baris(x, "")).join("");
    saran.hidden = !hasil.length;
  }
  if (input) {
    input.addEventListener("focus", muat, { once: true });
    input.addEventListener("input", tampil);
    input.addEventListener("keydown", (e) => {
      const el = [...saran.querySelectorAll("a")];
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        pilih = Math.max(-1, Math.min(el.length - 1, pilih + (e.key === "ArrowDown" ? 1 : -1)));
        el.forEach((a, i) => a.classList.toggle("pilih", i === pilih));
      } else if (e.key === "Escape") saran.hidden = true;
    });
    form.addEventListener("submit", (e) => {
      const x = hasil[pilih >= 0 ? pilih : 0];
      if (x && (pilih >= 0 || hasil.length === 1 || norm(x.n) === norm(input.value) || x.keys.includes(norm(input.value)))) {
        e.preventDefault();
        location.href = AKAR + encodeURI(x.u) + "/";
      }
    });
    document.addEventListener("click", (e) => {
      if (!form.contains(e.target)) saran.hidden = true;
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && input && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) {
      e.preventDefault();
      input.focus();
    }
  });

  const kotakHasil = document.getElementById("hasil");
  if (kotakHasil) {
    const q = new URLSearchParams(location.search).get("q") || "";
    if (input) input.value = q;
    if (q)
      muat().then((d) => {
        const h = cocok(d, q);
        kotakHasil.innerHTML = h.length
          ? `<p class="kecil">${h.length} 筆結果</p>` + h.map((x) => baris(x, "h")).join("")
          : `<p>找不到「${q.replace(/</g, "&lt;")}」。</p>`;
      });
    else kotakHasil.innerHTML = `<p class="kecil">在上方搜尋框輸入寶可夢、道具、招式、地圖、英文名或圖鑑編號。</p>`;
  }

  for (const s of document.querySelectorAll(".saring")) {
    const el = [...document.querySelectorAll(s.dataset.target)].filter((x) => x.dataset.cari !== undefined);
    const teks = s.querySelector("input");
    const chip = [...s.querySelectorAll(".chip-tipe button")];
    const awal = new URLSearchParams(location.search).get("tipe");
    const tipe = new Set(awal ? [awal] : []);
    const terap = () => {
      const raw = teks.value || "";
      const k = norm(raw);
      const no = /^\d+$/.test(k);
      const n = no ? String(parseInt(k, 10)) : "";
      for (const x of el) {
        const okT = !k || (no && x.dataset.dex === n) || (!no && norm(x.dataset.cari).includes(k));
        const okP = !tipe.size || (x.dataset.tipe || "").split(" ").some((t) => tipe.has(t));
        x.classList.toggle("tersembunyi", !(okT && okP));
      }
      chip.forEach((c) => c.classList.toggle("on", tipe.has(c.dataset.tipe)));
    };
    teks?.addEventListener("input", terap);
    chip.forEach((c) =>
      c.addEventListener("click", () => {
        tipe.has(c.dataset.tipe) ? tipe.delete(c.dataset.tipe) : tipe.add(c.dataset.tipe);
        terap();
      })
    );
    if (tipe.size) terap();
  }

  for (const t of document.querySelectorAll("table.urut")) {
    const tb = t.tBodies[0];
    [...t.tHead.rows[0].cells].forEach((th, i) =>
      th.addEventListener("click", () => {
        const naik = th.dataset.arah !== "naik";
        th.dataset.arah = naik ? "naik" : "turun";
        const nilai = (r) => {
          const s = r.cells[i].textContent.trim();
          const n = parseFloat(s.replace(",", "."));
          return Number.isFinite(n) && /^[\d.,\-]+%?$/.test(s) ? n : s.toLowerCase();
        };
        const rows = [...tb.rows].sort((a, b) => {
          const x = nilai(a);
          const y = nilai(b);
          const c = typeof x === typeof y ? (x < y ? -1 : x > y ? 1 : 0) : typeof x === "number" ? -1 : 1;
          return naik ? c : -c;
        });
        tb.append(...rows);
      })
    );
  }
})();
