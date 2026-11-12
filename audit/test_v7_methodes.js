// Tests d'interaction de la maquette V7 (4 méthodes d'entrée) : souris, clavier, 1440 et 390 px,
// débordements, erreurs JavaScript, noms accessibles, identifiants uniques.
// Usage : node audit/test_v7_methodes.js <chemin html> [dossier captures]
const { chromium } = require("playwright");
const path = require("path");

const URL = "file://" + path.resolve(process.argv[2] || "prototype/stock-entry-workflows.html");
const OUT = process.argv[3] || "";
const results = [];
function check(name, cond, info) {
  results.push(!!cond);
  console.log((cond ? "OK   " : "FAIL ") + name + (!cond && info !== undefined ? "  · " + JSON.stringify(info) : ""));
}
function mmYYYY(addMonths) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + addMonths);
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

async function audit(pg, where) {
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(where + " : pas de débordement horizontal", ov <= 0, ov);
  const unnamed = await pg.evaluate(() => Array.from(document.querySelectorAll("input,button")).filter((el) => {
    if (el.offsetParent === null) return false;
    return !((el.labels && el.labels.length) || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || (el.tagName === "BUTTON" && el.textContent.trim()));
  }).map((el) => el.outerHTML.slice(0, 100)));
  check(where + " : chaque champ et bouton a un nom", !unnamed.length, unnamed);
  const dups = await pg.evaluate(() => { const s = {}, d = []; document.querySelectorAll("[id]").forEach((e) => { if (s[e.id]) d.push(e.id); s[e.id] = 1; }); return d; });
  check(where + " : identifiants uniques", !dups.length, dups);
}
async function shot(pg, name) {
  if (!OUT) return;
  await pg.evaluate(() => { window.scrollTo(0, 0); document.getElementById("toast").classList.remove("on"); });
  await pg.screenshot({ path: path.join(OUT, name + ".png"), fullPage: true });
}
const lastRows = (pg) => pg.locator("table.flat tbody tr").count();
const activeId = (pg) => pg.evaluate(() => document.activeElement && document.activeElement.id);

(async () => {
  const br = await chromium.launch();
  const errors = [];
  for (const vp of [{ width: 1440, height: 900, tag: "1440" }, { width: 390, height: 844, tag: "390" }]) {
    const pg = await br.newPage({ viewport: { width: vp.width, height: vp.height } });
    pg.on("pageerror", (e) => errors.push(vp.tag + " " + e.message));
    pg.on("console", (m) => { if (m.type() === "error") errors.push(vp.tag + " " + m.text()); });
    await pg.goto(URL);
    const T = (s) => vp.tag + " · " + s;

    // ---------- Méthode 1 : au poste, au clavier ----------
    check(T("m1 affiché par défaut avec son matériel"), await pg.locator("#h-m1").count() === 1 && /0 €/.test(await pg.locator(".gear").innerText()));
    await audit(pg, T("m1 accueil"));
    await pg.click('[data-act=room][data-k=m1][data-room=pharma]');
    check(T("m1 : focus sur la recherche après le choix de la pièce"), await activeId(pg) === "m1-q");
    check(T("m1 : liste des articles de la pièce sans rien taper"), await pg.locator("#m1-list button").count() === 3);
    await pg.keyboard.type("exem");
    check(T("m1 : recherche « exem » sans accent ni majuscule"), await pg.locator("#m1-list button").count() === 1);
    await pg.keyboard.press("Enter");
    check(T("m1 : Entrée choisit le premier résultat"), await activeId(pg) === "m1-qty");
    await pg.keyboard.press("Enter");
    check(T("m1 : valider vide affiche les deux erreurs"), await pg.locator(".err-msg").count() === 2);
    await pg.fill("#m1-qty", "2000000000017");
    await pg.fill("#m1-exp", mmYYYY(5));
    await pg.keyboard.press("Enter");
    check(T("m1 : code-barres dans Quantité refusé"), /code-barres/.test(await pg.locator("#m1-qty-e").innerText()));
    await pg.fill("#m1-qty", "12");
    await pg.fill("#m1-exp", "01/2020");
    await pg.keyboard.press("Enter");
    check(T("m1 : date dépassée refusée"), /dépassée/.test(await pg.locator("#m1-exp-e").innerText()) && await activeId(pg) === "m1-exp");
    await pg.fill("#m1-exp", mmYYYY(5).replace(/^0/, "").replace(/\/20/, "/"));
    await pg.keyboard.press("Enter");
    check(T("m1 : date courte « M/AA » acceptée, entrée en stock"), await lastRows(pg) === 1 && await activeId(pg) === "m1-q");
    check(T("m1 : péremption affichée au mois"), (await pg.locator("table.flat").innerText()).includes(mmYYYY(5)));
    await pg.fill("#m1-q", "trombones");
    await pg.click('[data-act=new][data-k=m1]');
    check(T("m1 : fiche préremplie avec le texte cherché"), await pg.inputValue("#m1-nn") === "trombones");
    await pg.click('form[data-form=newart] button[type=submit]');
    check(T("m1 : format obligatoire"), await pg.locator("#m1-nfo-e").count() === 1);
    await pg.fill("#m1-nfo", "boîte de 100");
    await pg.click('form[data-form=newart] button[type=submit]');
    check(T("m1 : fiche créée puis quantité demandée"), await activeId(pg) === "m1-qty");
    await shot(pg, "v7-m1-" + vp.tag);
    await pg.keyboard.press("Escape");
    await pg.click('[data-act=undo][data-k=m1]');
    check(T("m1 : annuler retire l'entrée"), await lastRows(pg) === 0);
    await audit(pg, T("m1 après saisie"));

    // ---------- Méthode 2 : fiche papier ----------
    await pg.click("#tab-m2");
    await pg.click('[data-act=room][data-k=m2][data-room=cons]');
    check(T("m2 : fiche vierge avec les articles de la pièce + 3 lignes libres"), await pg.locator("#sheet tbody tr").count() === 7 && await pg.locator("#sheet .hand").count() === 0);
    await pg.click("#m2-ex");
    check(T("m2 : exemple rempli au stylo"), await pg.locator("#sheet .hand").count() > 4);
    await shot(pg, "v7-m2-fiche-" + vp.tag);
    await audit(pg, T("m2 fiche"));
    await pg.click('[data-act=m2-step][data-v=copy] >> nth=0');
    await pg.click("[data-act=m2-submit]");
    check(T("m2 : fiche vide refusée"), /Aucune ligne/.test(await pg.locator(".notice.err").innerText()));
    await pg.fill("#m2-a1-qty", "100");
    await pg.click("[data-act=m2-submit]");
    check(T("m2 : ligne sans péremption en rouge, focus dessus"), await pg.locator("tr.bad").count() === 1 && await activeId(pg) === "m2-a1-exp");
    await pg.click("[data-act=m2-fill]");
    await shot(pg, "v7-m2-recopie-" + vp.tag);
    await audit(pg, T("m2 recopie"));
    await pg.click("[data-act=m2-submit]");
    check(T("m2 : fiche recopiée, 3 lignes en stock"), /3 ligne\(s\), 115 unité\(s\)/.test(await pg.locator(".notice.ok").innerText()) && await lastRows(pg) === 3);
    await pg.click("[data-act=m2-new]");
    await pg.click('[data-act=room][data-k=m2][data-room=pap]');
    await pg.click('[data-act=m2-step][data-v=copy] >> nth=0');
    await pg.click("[data-act=m2-fill]");
    await pg.click("[data-act=m2-submit]");
    check(T("m2 : article nouveau écrit sur la fiche créé à la recopie"), (await pg.locator("table.flat").innerText()).includes("Surligneurs"));

    // ---------- Méthode 3 : tablette ----------
    await pg.click("#tab-m3");
    check(T("m3 : la tablette demande d'abord la pièce"), /Où rangez-vous/.test(await pg.locator(".t-screen").innerText()));
    await pg.click('[data-act=room][data-k=m3][data-room=pharma]');
    check(T("m3 : tuiles d'articles (dont la fiche créée en m1) + « Autre article »"), await pg.locator(".tile:not(.add)").count() === 4 && await pg.locator(".tile.add").count() === 1);
    await pg.click('.tile[data-id=a6]');
    await pg.click('[data-act=t-qty][data-d="10"]');
    await pg.click('[data-act=t-qty][data-d="1"]');
    check(T("m3 : + et +10 règlent la quantité"), (await pg.locator("#m3-qty").innerText()) === "12");
    await pg.click("[data-act=t-save]");
    check(T("m3 : mois et année obligatoires"), /mois et l’année/.test(await pg.locator(".t-screen .notice.err").innerText()));
    const y = new Date().getFullYear();
    await pg.click('[data-act=t-year][data-v="' + y + '"]');
    await pg.click('[data-act=t-month][data-v="1"]');
    if (new Date().getMonth() > 0) {
      await pg.click("[data-act=t-save]");
      check(T("m3 : mois dépassé refusé"), /dépassée/.test(await pg.locator(".t-screen .notice.err").innerText()));
    }
    await pg.click('[data-act=t-year][data-v="' + (y + 1) + '"]');
    await pg.click('[data-act=t-month][data-v="6"]');
    await shot(pg, "v7-m3-" + vp.tag);
    await audit(pg, T("m3 quantité"));
    await pg.click("[data-act=t-save]");
    check(T("m3 : rangé, confirmation et retour aux articles"), /Rangé : 12 ×/.test(await pg.locator(".t-flash").innerText()) && await lastRows(pg) === 1);
    await pg.click(".t-flash [data-act=undo]");
    check(T("m3 : annuler depuis la confirmation"), await pg.locator(".t-flash").count() === 0 && await lastRows(pg) === 0);
    await pg.click("[data-act=m3-rooms]");
    await pg.click('[data-act=room][data-k=m3][data-room=pap]');
    await pg.click('.tile[data-id=a8]');
    check(T("m3 : pas de mois/année pour la papeterie"), await pg.locator("[data-act=t-month]").count() === 0);
    await pg.click("[data-act=t-save]");
    check(T("m3 : ramette rangée sans date"), await lastRows(pg) === 1);

    // ---------- Méthode 4 : douchette ----------
    await pg.click("#tab-m4");
    await pg.click('[data-act=room][data-k=m4][data-room=cons]');
    check(T("m4 : focus sur le champ du bip"), await activeId(pg) === "m4-code");
    await pg.keyboard.type("2000000000017");
    await pg.keyboard.press("Enter");
    check(T("m4 : code connu → article affiché, focus quantité"), await activeId(pg) === "m4-qty" && /Seringue/.test(await pg.locator(".article").innerText()));
    await pg.keyboard.type("5");
    await pg.fill("#m4-exp", mmYYYY(20));
    await pg.keyboard.press("Enter");
    check(T("m4 : entrée faite, retour au bip"), await lastRows(pg) === 1 && await activeId(pg) === "m4-code");
    await pg.click(".chip.unknown");
    check(T("m4 : code inconnu → fiche à créer"), await activeId(pg) === "m4-nn");
    await pg.fill("#m4-nn", "Pansements DÉMO");
    await pg.fill("#m4-nfo", "boîte de 20");
    await pg.keyboard.press("Enter");
    check(T("m4 : fiche créée avec le code, quantité demandée"), await activeId(pg) === "m4-qty" && /code/.test(await pg.locator(".article").innerText()));
    await pg.click("[data-act=unpick]");
    const pharmaChip = pg.locator('.chip', { hasText: "habitude" });
    await pharmaChip.click();
    check(T("m4 : article d'une autre pièce signalé, non bloqué"), await pg.locator(".notice.warn").count() === 1 && await pg.locator('form[data-form=entry] button[type=submit]').count() === 1);
    await pg.click("[data-act=unpick]");
    await pg.click("[data-act=m4-manual]");
    await pg.keyboard.type("gants");
    check(T("m4 : recherche par nom sans code-barres"), await pg.locator("#m4-list button").count() === 1);
    await shot(pg, "v7-m4-" + vp.tag);
    await audit(pg, T("m4 recherche"));

    // ---------- Comparer ----------
    await pg.click("#tab-cmp");
    check(T("Comparer : 4 colonnes et la ligne Matériel"), await pg.locator(".cmp thead th").count() === 5 && (await pg.locator(".cmp").innerText()).includes("Matériel"));
    check(T("Comparer : colonne latérale masquée"), await pg.locator("#side").isHidden());
    await shot(pg, "v7-comparer-" + vp.tag);
    await audit(pg, T("Comparer"));

    // ---------- Clavier sur les onglets ----------
    await pg.focus("#tab-cmp");
    await pg.keyboard.press("Home");
    check(T("Onglets : Début revient à la méthode 1"), await activeId(pg) === "tab-m1" && await pg.locator("#h-m1").count() === 1);
    await pg.keyboard.press("ArrowDown");
    check(T("Onglets : flèche bas passe à la méthode 2"), await activeId(pg) === "tab-m2");
    check(T("Aucune donnée persistée"), await pg.evaluate(() => localStorage.length + sessionStorage.length) === 0);
    await pg.close();
  }
  check("Aucune erreur JavaScript", !errors.length, errors);
  await br.close();
  const failed = results.filter((r) => !r).length;
  console.log("\n" + (results.length - failed) + " / " + results.length + " contrôles OK");
  process.exit(failed ? 1 : 0);
})();
