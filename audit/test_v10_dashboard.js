// Contrôles du tableau de bord (V10).
// Usage : node audit/test_v10_dashboard.js prototype/stock-entry-workflows.html
const path = require("path");
const { chromium } = require("playwright");

const url = "file:///" + path.resolve(process.argv[2] || "prototype/stock-entry-workflows.html").replace(/\\/g, "/");
let ok = 0, ko = 0;
function check(name, cond, info) { if (cond) ok++; else { ko++; console.log("ÉCHEC  " + name + (info !== undefined ? "  · " + JSON.stringify(info) : "")); } }
const num = async (pg, sel) => parseInt(await pg.locator(sel).innerText(), 10);

(async function () {
  const browser = await chromium.launch();
  for (const vp of [{ tag: "1440", width: 1440, height: 900 }, { tag: "1024", width: 1024, height: 768 }, { tag: "390", width: 390, height: 844 }]) {
    const T = (s) => "[" + vp.tag + "] " + s;
    const pg = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const errors = [];
    pg.on("pageerror", (e) => errors.push(String(e)));
    await pg.goto(url);

    // ---------- Vue globale ----------
    check(T("Le tableau de bord est la page d'accueil"), await pg.locator("#h-dash").count() === 1);
    const total = await num(pg, ".kpis .kpi:nth-child(1) b");
    const soon = await num(pg, '[data-act="d-state"][data-v="soon"] b');
    const low = await num(pg, '[data-act="d-state"][data-v="low"] b');
    const crit = await num(pg, '[data-act="d-state"][data-v="crit"] b');
    check(T("Quatre chiffres : articles, bientôt périmés, bientôt épuisés, rupture ou périmés"), total > 100 && soon > 0 && low > 0 && crit > 0, { total, soon, low, crit });
    check(T("Chaque alerte affiche sa proportion"), /%/.test(await pg.locator('[data-act="d-state"][data-v="soon"]').innerText()));
    check(T("Une barre par réserve"), await pg.locator(".dres").count() === 3 && await pg.locator(".dres .dbar").count() === 3);
    const sums = await pg.evaluate(() => Array.from(document.querySelectorAll(".dres")).map((b) => {
      const segs = Array.from(b.querySelectorAll(".dbar i")).reduce((s, i) => s + parseFloat(i.style.flexGrow || i.style.flex), 0);
      return segs === parseInt(b.querySelector(".n").innerText, 10);
    }));
    check(T("Chaque barre additionne tous les articles de sa réserve"), sums.every(Boolean), sums);
    check(T("Légende : seuil de 3 rappelé"), /3 ou moins/.test(await pg.locator(".dleg").innerText()));
    const all = await num(pg, ".dgrid .hint");
    check(T("À traiter : 8 lignes puis « Tout voir »"), await pg.locator("#dlist li").count() === 8 && all > 8 && await pg.locator('[data-act="d-all"]').count() === 1);
    check(T("Les plus graves en premier"), await pg.locator("#dlist li").first().locator(".b-expired").count() === 1);

    // ---------- Affiner ----------
    await pg.click('[data-act="d-state"][data-v="soon"]');
    check(T("Filtre « bientôt périmés » : autant de lignes que le chiffre"), await num(pg, ".dgrid .hint") === soon && await pg.locator('[data-act="d-state"][data-v="soon"][aria-pressed="true"]').count() === 1);
    await pg.click('[data-act="d-room"][data-v="pap"]');
    check(T("Papeterie sans péremption : état vide explicite"), /Aucun article dans ce cas/.test(await pg.locator(".dgrid").innerText()));
    await pg.click('[data-act="d-clear"]');
    check(T("« Tout afficher » retire les filtres"), await num(pg, ".dgrid .hint") === all && await pg.locator('[aria-pressed="true"]').count() === 0);
    await pg.click('[data-act="d-state"][data-v="low"]');
    const restes = await pg.evaluate(() => Array.from(document.querySelectorAll("#dlist .b-out")).map((b) => parseInt(b.innerText.replace(/\D/g, ""), 10)));
    check(T("Bientôt épuisé : il reste 1 à 3"), restes.length > 0 && restes.every((n) => n >= 1 && n <= 3), restes);
    await pg.click('[data-act="d-state"][data-v="low"]');
    await pg.click('[data-act="d-all"]');
    check(T("« Tout voir » déplie toute la liste"), await pg.locator("#dlist li").count() === all);

    // ---------- De l'alerte à l'article ----------
    const first = await pg.locator("#dlist li").first().locator(".nm").innerText();
    await pg.locator("#dlist li button").first().click();
    check(T("Cliquer une ligne ouvre sa réserve, filtrée sur l'article"), await pg.inputValue("#flt") === first && await pg.locator("#list .item .nm", { hasText: first }).count() >= 1);

    // ---------- Les chiffres suivent le stock ----------
    await pg.click("#tab-dash");
    const before = await num(pg, '[data-act="d-state"][data-v="crit"] b');
    await pg.click("#tab-pharma"); await pg.fill("#flt", "sirop ibu");
    await pg.locator('[data-act="open"][data-mode="out"]').first().click();
    await pg.click('.panel label:has(input[value=exp])');
    await pg.locator(".panel input.big").fill("2"); await pg.selectOption(".panel select[data-bind=who]", "Camille");
    await pg.click(".panel button[type=submit]");
    await pg.click("#tab-dash");
    check(T("Sortir le lot périmé fait baisser « rupture ou périmés »"), await num(pg, '[data-act="d-state"][data-v="crit"] b') === before - 1);

    // ---------- Qualité ----------
    check(T("Aucun débordement horizontal"), await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0);
    check(T("Aucune erreur JavaScript"), errors.length === 0, errors);
    await pg.close();
  }
  await browser.close();
  console.log(ok + " / " + (ok + ko) + " contrôles OK");
  process.exit(ko ? 1 : 0);
})();
