(() => {
  const state = {
    actions: [],
    takeaways: [],
    meta: null,
    quotes: {},
    sortKey: "ticker",
    sortDir: 1,
  };

  const $ = (id) => document.getElementById(id);

  async function load() {
    const [actionsRes, metaRes] = await Promise.all([
      fetch("data/actions.json"),
      fetch("data/meta.json"),
    ]);
    const actionsData = await actionsRes.json();
    state.actions = actionsData.actions || [];
    state.takeaways = actionsData.takeaways || [];
    state.meta = await metaRes.json();

    $("asOf").textContent = `As of ${state.meta.asOfLabel || state.meta.asOf}`;
    renderTakeaways();
    bindControls();
    render();
    fetchQuotes().catch(() => {
      $("quoteStatus").textContent = "Quotes: unavailable (showing embedded recs)";
    });
  }

  function renderTakeaways() {
    const el = $("takeaways");
    el.innerHTML = state.takeaways
      .map(
        (t) => `
      <article class="card">
        <h3>${escapeHtml(t.book)}${t.book === "NEW" ? ' <span class="badge-live">Live</span>' : ""}</h3>
        <div class="tagline">${escapeHtml(t.tagline || "")}</div>
        <p>${escapeHtml(t.summary || "")}</p>
      </article>`
      )
      .join("");
  }

  function bindControls() {
    ["bookFilter", "actionFilter", "horizonFilter", "search"].forEach((id) => {
      $(id).addEventListener("input", render);
      $(id).addEventListener("change", render);
    });
    $("refreshQuotes").addEventListener("click", () => {
      $("quoteStatus").textContent = "Quotes: refreshing…";
      fetchQuotes().catch(() => {
        $("quoteStatus").textContent = "Quotes: unavailable";
      });
    });
    $("downloadCsv").addEventListener("click", (e) => {
      e.preventDefault();
      downloadCsv();
    });
    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.getAttribute("data-sort");
        if (state.sortKey === key) state.sortDir *= -1;
        else {
          state.sortKey = key;
          state.sortDir = 1;
        }
        render();
      });
    });
  }

  function focusAction(row) {
    const h = $("horizonFilter").value;
    if (h === "primary") return row.primary;
    return row[h] || row.primary;
  }

  function filtered() {
    const book = $("bookFilter").value;
    const action = $("actionFilter").value;
    const q = ($("search").value || "").trim().toLowerCase();

    return state.actions.filter((row) => {
      if (book !== "all" && !(row.books || []).includes(book)) return false;
      const focus = focusAction(row);
      if (action === "Overlap") {
        if (!row.overlap && !(row.notes || "").toLowerCase().includes("overlap")) return false;
      } else if (action !== "all") {
        if (focus !== action && row.primary !== action) {
          // also match if any priority horizon equals action when blend selected
          if ($("horizonFilter").value === "primary") {
            const hit = ["h6m", "h12m", "h24m", "h36m"].some((k) => row[k] === action);
            if (!hit) return false;
          } else if (focus !== action) return false;
        }
      }
      if (q) {
        const hay = [row.ticker, ...(row.books || []), row.notes, row.conviction, row.weight]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function sortRows(rows) {
    const key = state.sortKey;
    const dir = state.sortDir;
    const convRank = { High: 5, "Med-High": 4, Med: 3, "Med-Low": 2, "Low-Med": 2, Low: 1 };
    const actRank = { Buy: 6, Accumulate: 5, Hold: 4, Reduce: 3, Watch: 2, Avoid: 1 };

    return [...rows].sort((a, b) => {
      let av, bv;
      if (key === "books") {
        av = (a.books || []).join(",");
        bv = (b.books || []).join(",");
      } else if (key === "focus") {
        av = actRank[focusAction(a)] || 0;
        bv = actRank[focusAction(b)] || 0;
      } else if (key === "conviction") {
        av = convRank[a.conviction] || 0;
        bv = convRank[b.conviction] || 0;
      } else if (key === "price") {
        av = state.quotes[a.ticker]?.price ?? -1;
        bv = state.quotes[b.ticker]?.price ?? -1;
      } else if (["h6m", "h12m", "h24m", "h36m"].includes(key)) {
        av = actRank[a[key]] || 0;
        bv = actRank[b[key]] || 0;
      } else {
        av = (a[key] ?? "").toString().toLowerCase();
        bv = (b[key] ?? "").toString().toLowerCase();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return a.ticker.localeCompare(b.ticker);
    });
  }

  function render() {
    const rows = sortRows(filtered());
    const tbody = $("tbody");
    $("empty").hidden = rows.length > 0;

    const counts = { Buy: 0, Accumulate: 0, Hold: 0, Reduce: 0, Watch: 0, Avoid: 0 };
    rows.forEach((r) => {
      const f = focusAction(r);
      if (counts[f] != null) counts[f]++;
    });
    $("stats").innerHTML = `
      <div class="stat"><strong>${rows.length}</strong> rows</div>
      <div class="stat">Buy <strong>${counts.Buy}</strong></div>
      <div class="stat">Acc <strong>${counts.Accumulate}</strong></div>
      <div class="stat">Hold <strong>${counts.Hold}</strong></div>
      <div class="stat">Reduce <strong>${counts.Reduce}</strong></div>
      <div class="stat">Watch <strong>${counts.Watch}</strong></div>
      <div class="stat">Avoid <strong>${counts.Avoid}</strong></div>
    `;

    tbody.innerHTML = rows
      .map((row) => {
        const focus = focusAction(row);
        const q = state.quotes[row.ticker];
        const priceCell = q
          ? `<span class="price">${fmtPrice(q.price)}<span class="chg ${q.changePct >= 0 ? "up" : "down"}">${fmtPct(q.changePct)}</span></span>`
          : `<span class="price muted">—</span>`;
        const books = (row.books || [])
          .map((b) => `<span class="chip${b === "NEW" ? " new" : ""}">${escapeHtml(b)}</span>`)
          .join("");
        return `<tr>
          <td class="ticker">${escapeHtml(row.ticker)}</td>
          <td><div class="books">${books}</div></td>
          <td><span class="pill ${cssAction(focus)}">${escapeHtml(focus)}</span></td>
          <td><span class="pill ${cssAction(row.h6m)}">${short(row.h6m)}</span></td>
          <td><span class="pill ${cssAction(row.h12m)}">${short(row.h12m)}</span></td>
          <td><span class="pill ${cssAction(row.h24m)}">${short(row.h24m)}</span></td>
          <td><span class="pill ${cssAction(row.h36m)}">${short(row.h36m)}</span></td>
          <td>${escapeHtml(row.conviction || "")}</td>
          <td>${escapeHtml(row.weight || "")}</td>
          <td>${priceCell}</td>
          <td class="notes">${escapeHtml(row.notes || "")}</td>
        </tr>`;
      })
      .join("");
  }

  function cssAction(a) {
    if (!a) return "Hold";
    if (a === "Accumulate") return "Accumulate";
    return a;
  }
  function short(a) {
    if (a === "Accumulate") return "Acc";
    return a || "—";
  }
  function fmtPrice(p) {
    if (p == null || Number.isNaN(p)) return "—";
    return p >= 100 ? `$${p.toFixed(2)}` : `$${p.toFixed(2)}`;
  }
  function fmtPct(p) {
    if (p == null || Number.isNaN(p)) return "";
    const sign = p >= 0 ? "+" : "";
    return `${sign}${p.toFixed(2)}%`;
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function fetchQuotes() {
    const tickers = [...new Set(state.actions.map((a) => a.ticker))];
    // Yahoo unofficial chart API — batch in chunks of 10 via Promise.allSettled
    const chunks = [];
    for (let i = 0; i < tickers.length; i += 8) chunks.push(tickers.slice(i, i + 8));

    let ok = 0;
    await Promise.all(
      chunks.map(async (chunk) => {
        await Promise.all(
          chunk.map(async (sym) => {
            try {
              const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`;
              const res = await fetch(url);
              if (!res.ok) throw new Error(String(res.status));
              const data = await res.json();
              const meta = data?.chart?.result?.[0]?.meta;
              if (!meta || meta.regularMarketPrice == null) throw new Error("no meta");
              const price = meta.regularMarketPrice;
              const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
              const changePct = prev ? ((price - prev) / prev) * 100 : 0;
              state.quotes[sym] = { price, changePct, currency: meta.currency || "USD" };
              ok++;
            } catch (_) {
              /* fail soft */
            }
          })
        );
      })
    );

    if (ok > 0) {
      $("quoteStatus").textContent = `Quotes: ${ok}/${tickers.length} live (Yahoo)`;
    } else {
      $("quoteStatus").textContent = "Quotes: blocked or unavailable — recs still shown";
    }
    render();
  }

  function downloadCsv() {
    const rows = sortRows(filtered());
    const headers = [
      "Ticker",
      "Books",
      "Focus",
      "6m",
      "12m",
      "24m",
      "36m",
      "Conviction",
      "Suggested Weight",
      "Notes",
    ];
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      const cols = [
        r.ticker,
        (r.books || []).join("; "),
        focusAction(r),
        r.h6m,
        r.h12m,
        r.h24m,
        r.h36m,
        r.conviction,
        r.weight,
        r.notes,
      ].map(csvEscape);
      lines.push(cols.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "danelfin-actions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvEscape(v) {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  load().catch((err) => {
    console.error(err);
    $("asOf").textContent = "Failed to load data";
    $("quoteStatus").textContent = String(err);
  });
})();
