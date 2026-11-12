// Contrôles de l'écran « Sortie tablette » (V9).
// Usage : node audit/test_v9_sortie.js prototype/stock-entry-workflows.html
const path = require("path");
const { chromium } = require("playwright");

const file = path.resolve(process.argv[2] || "prototype/stock-entry-workflows.html");
const url = "file:///" + file.replace(/\\/g, "/");
let ok = 0, ko = 0;
function check(name, cond) { if (cond) ok++; else { ko++; console.log("ÉCHEC  " + name); } }

async function pick(pg, who, q, dest) {
  if (who !== null) await pg.click('[data-act="k-who"][data-i="' + who + '"]');
  await pg.fill("#k-q", q);
  await pg.click("#k-res button:not(:disabled)");
  if (dest !== null) await pg.click('[data-act="k-dest"][data-i="' + dest + '"]');
}
async function stockDesk(pg, name) {
  return pg.evaluate(function (n) {
    var it = Array.prototype.filter.call(document.querySelectorAll(".item"), function (i) { return i.querySelector(".nm").innerText === n; })[0];
    return it ? +it.querySelector(".st b").innerText : null;
  }, name);
}

(async function () {
  const browser = await chromium.launch();
  for (const vp of [{ tag: "tablette-768", width: 768, height: 1024 }, { tag: "tablette-1024", width: 1024, height: 768 }, { tag: "mobile-390", width: 390, height: 844 }]) {
    const T = (s) => "[" + vp.tag + "] " + s;
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true });
    const pg = await ctx.newPage();
    const errors = [];
    pg.on("pageerror", (e) => errors.push(String(e)));
    await pg.goto(url + "#sortie");

    // ---------- Mode tablette ----------
    check(T("#sortie ouvre l'écran tablette, sans barre latérale ni bandeau"), await pg.locator(".app.kiosk").count() === 1 && !(await pg.locator(".rail").isVisible()) && !(await pg.locator(".topbar").isVisible()));
    check(T("Quatre questions et un bouton Valider"), await pg.locator(".kform .kb").count() === 4 && await pg.locator(".kgo").count() === 1);

    // ---------- Validation à vide ----------
    await pg.click(".kgo");
    check(T("Vide : trois erreurs (prénom, produit, pour qui)"), await pg.locator(".kb .err-msg").count() === 3);
    check(T("Erreurs reliées aux blocs"), await pg.locator('.kb[aria-describedby="k-who-e"]').count() === 1 && await pg.locator('#k-q[aria-describedby="k-art-e"]').count() === 1);

    // ---------- Recherche ----------
    await pg.fill("#k-q", "p");
    check(T("Une lettre : pas encore de résultat"), await pg.locator("#k-res li").count() === 0);
    await pg.fill("#k-q", "zzzz");
    check(T("Aucun résultat : message clair"), /Aucun produit/.test(await pg.locator("#k-res").innerText()));
    await pg.fill("#k-q", "paracetamol 500");
    check(T("Recherche sans accent"), await pg.locator("#k-res button").count() === 2);
    await pg.fill("#k-q", "para");
    check(T("Pluriel « rouleaux »"), !/rouleaus/.test(await pg.locator("#k-res").innerText()));

    // ---------- Sortie complète ----------
    await pg.fill("#k-q", "");
    await pick(pg, 1, "paracetamol 500 mg", 0);
    check(T("Produit choisi : 36 boîtes en stock"), /36 boîtes en stock/.test(await pg.locator(".kpicked").innerText()));
    await pg.click('[data-act="k-plus"]');
    check(T("+ : quantité 2"), await pg.inputValue("#k-qty") === "2");
    await pg.click('[data-act="k-minus"]'); await pg.click('[data-act="k-minus"]');
    check(T("− : jamais sous 1"), await pg.inputValue("#k-qty") === "1");
    await pg.click("#k-qty"); await pg.keyboard.type("5");
    check(T("Toucher la quantité puis taper 5 donne 5, pas 15"), await pg.inputValue("#k-qty") === "5");
    await pg.fill("#k-qty", "999"); await pg.click(".kgo");
    check(T("Plus que le stock : refusé"), /Il n’y a que 36 boîtes/.test(await pg.locator("#k-qty-e").innerText()));
    await pg.fill("#k-qty", "2"); await pg.click(".kgo");
    const done = await pg.locator(".kdone").innerText();
    check(T("Confirmation : quoi, combien, qui, pour qui"), /2 boîtes/.test(done) && /Paracétamol 500 mg/.test(done) && /Inès → Dr A/.test(done));
    check(T("Formulaire remis à zéro"), await pg.locator(".kchip[aria-pressed=true]").count() === 0 && await pg.locator(".kpicked").count() === 0 && await pg.inputValue("#k-qty") === "1");

    // ---------- Trace dans Mouvements ----------
    await pg.click('.hero [data-act="tab"]');
    check(T("Vue ordinateur : stock passé à 34"), await stockDesk(pg, "Paracétamol 500 mg") === 34);
    await pg.click("#tab-moves");
    const row = await pg.locator("tbody tr").first().innerText();
    check(T("Mouvements : par Inès, pour Dr A, motif Utilisé"), /Inès/.test(row) && /Dr A/.test(row) && /Utilisé/.test(row) && /− 2 boîtes/.test(row));

    // ---------- Annuler depuis la tablette ----------
    await pg.click("#tab-sortie");
    await pick(pg, 0, "amlodipine", 2);
    await pg.click(".kgo");
    await pg.click('.kdone [data-act="undo"]');
    check(T("Annuler : bandeau « Sortie annulée », plus de bouton"), /Sortie annulée/.test(await pg.locator(".kdone").innerText()) && await pg.locator('.kdone [data-act="undo"]').count() === 0);
    check(T("Annuler : pas de petit toast sur la tablette"), !(await pg.locator("#toast.on").count()));
    await pg.click('.hero [data-act="tab"]'); await pg.click("#tab-moves");
    check(T("Annuler : la ligne a disparu de Mouvements"), await pg.locator("tbody tr").count() === 1);

    // ---------- Périmés jamais proposés sur la tablette ----------
    await pg.click("#tab-sortie");
    await pick(pg, 3, "ibuprofene sirop", 0);
    check(T("Lot périmé exclu : 5 flacons utilisables sur 7"), /5 flacons en stock/.test(await pg.locator(".kpicked").innerText()));
    await pg.fill("#k-qty", "6"); await pg.click(".kgo");
    check(T("Impossible de sortir le lot périmé"), /Il n’y a que 5 flacons/.test(await pg.locator("#k-qty-e").innerText()));
    await pg.fill("#k-qty", "1"); await pg.click(".kgo");
    await pg.click('.hero [data-act="tab"]'); await pg.click("#tab-moves");
    check(T("La sortie n'a pas touché au lot périmé"), !/09\/2026/.test(await pg.locator("tbody tr").first().innerText()));

    // ---------- Changer de produit ----------
    await pg.click("#tab-sortie");
    await pick(pg, 0, "gants nitrile taille s", null);
    await pg.fill("#k-qty", "4"); await pg.click('[data-act="k-clear"]');
    check(T("Changer : la quantité repart à 1"), await pg.inputValue("#k-qty") === "1");

    // ---------- Toast de l'ordinateur masqué en changeant d'écran ----------
    await pg.click('.hero [data-act="tab"]');
    await pg.locator('[data-act="open"][data-mode="out"]').first().click();
    await pg.locator(".panel input.big").fill("1");
    await pg.selectOption(".panel select[data-bind=who]", "Marc"); await pg.selectOption(".panel select[data-bind=dest]", "Salle de soins");
    await pg.click(".panel .go-out");
    check(T("Sortie ordinateur : mêmes questions, toast signé"), /Marc → Salle de soins/.test(await pg.locator("#toast").innerText()));
    await pg.click("#tab-sortie");
    check(T("Le toast de l'ordinateur ne suit pas sur la tablette"), !(await pg.locator("#toast.on").count()));

    // ---------- Tailles tactiles, lisibilité, débordement ----------
    await pick(pg, 2, "seringue 5", 1);
    const m = await pg.evaluate(function () {
      function px(e) { return parseFloat(getComputedStyle(e).fontSize); }
      var small = [], low = [];
      document.querySelectorAll("#view *").forEach(function (e) {
        var own = Array.prototype.some.call(e.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); });
        if (own && e.offsetParent && px(e) < 18) small.push(e.className + ":" + px(e));
      });
      document.querySelectorAll("#view button").forEach(function (b) { if (b.offsetParent && b.getBoundingClientRect().height < 48) low.push(b.innerText); });
      return { small: small, low: low, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    check(T("Aucun texte sous 18 px (" + m.small.join(", ") + ")"), m.small.length === 0);
    check(T("Aucun bouton sous 48 px (" + m.low.join(", ") + ")"), m.low.length === 0);
    check(T("Aucun débordement horizontal"), m.overflow <= 0);

    // ---------- Adresse et clavier ----------
    await pg.click('.hero [data-act="tab"]');
    check(T("Vue ordinateur : le #sortie quitte l'adresse"), !/#sortie/.test(pg.url()));
    await pg.evaluate(function () { location.hash = "#sortie"; });
    await pg.waitForSelector(".app.kiosk");
    check(T("Changer l'adresse en #sortie ouvre la tablette"), await pg.locator(".kform").count() === 1);
    check(T("Le focus arrive sur le premier prénom"), await pg.evaluate(function () { return document.activeElement.getAttribute("data-act"); }) === "k-who");

    check(T("Aucune erreur JavaScript"), errors.length === 0);
    await ctx.close();
  }
  await browser.close();
  console.log(ok + " / " + (ok + ko) + " contrôles OK");
  process.exit(ko ? 1 : 0);
})();
