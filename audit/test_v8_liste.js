// Tests d'interaction de la maquette V8 (une liste par réserve : + Entrée / − Sortie) :
// souris, clavier, 1440 et 390 px, débordements, erreurs JavaScript, noms accessibles, identifiants uniques.
// Usage : node audit/test_v8_liste.js <chemin html> [dossier captures]
const { chromium } = require("playwright");
const path = require("path");

const URL = "file://" + path.resolve(process.argv[2] || "prototype/stock-entry-workflows.html");
const OUT = process.argv[3] || "";
const results = [];
function check(name, cond, info) {
  results.push(!!cond);
  console.log((cond ? "OK   " : "FAIL ") + name + (!cond && info !== undefined ? "  · " + JSON.stringify(info) : ""));
}
function mmYYYY(add) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + add); return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }

async function audit(pg, where) {
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(where + " : pas de débordement horizontal", ov <= 0, ov);
  const unnamed = await pg.evaluate(() => Array.from(document.querySelectorAll("input,button,select")).filter((el) => {
    if (el.offsetParent === null) return false;
    return !((el.labels && el.labels.length) || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || (el.tagName === "BUTTON" && el.textContent.trim()));
  }).map((el) => el.outerHTML.slice(0, 100)));
  check(where + " : chaque champ et bouton a un nom", !unnamed.length, unnamed);
  const dups = await pg.evaluate(() => { const s = {}, d = []; document.querySelectorAll("[id]").forEach((e) => { if (s[e.id]) d.push(e.id); s[e.id] = 1; }); return d; });
  check(where + " : identifiants uniques", !dups.length, dups);
}
async function shot(pg, name, at) { // « at » : capture de l'écran visible autour de cet élément ; sinon page entière
  if (!OUT) return;
  await pg.evaluate((sel) => {
    document.getElementById("toast").classList.remove("on");
    const el = sel && document.querySelector(sel);
    if (el) el.scrollIntoView({ block: "center" }); else window.scrollTo(0, 0);
  }, at || null);
  await pg.screenshot({ path: path.join(OUT, name + ".png"), fullPage: !at });
}
const row = (pg, name) => pg.locator(".item", { has: pg.locator(".nm", { hasText: new RegExp("^" + name.replace(/[()]/g, "\\$&") + "$") }) });
const stock = async (pg, name) => +(await row(pg, name).locator(".st b").innerText());
const activeLabel = (pg) => pg.evaluate(() => document.activeElement && (document.activeElement.getAttribute("aria-label") || document.activeElement.id));

(async () => {
  const br = await chromium.launch();
  const errors = [];
  for (const vp of [{ width: 1440, height: 900, tag: "1440" }, { width: 390, height: 844, tag: "390" }]) {
    const pg = await br.newPage({ viewport: { width: vp.width, height: vp.height } });
    pg.on("pageerror", (e) => errors.push(vp.tag + " " + e.message));
    pg.on("console", (m) => { if (m.type() === "error") errors.push(vp.tag + " " + m.text()); });
    await pg.goto(URL);
    const T = (s) => vp.tag + " · " + s;

    // ---------- La liste de la Pharmacie : 100 articles rangés par étagère ----------
    check(T("Le tableau de bord s'ouvre par défaut"), await pg.locator('#tab-dash[aria-selected="true"]').count() === 1 && await pg.locator("#h-dash").count() === 1);
    await pg.click("#tab-pharma");
    check(T("Pharmacie : 100 articles"), await pg.locator("#list .item").count() === 100);
    check(T("9 étagères, chacune avec son raccourci"), await pg.locator("#list .sec").count() === 9 && await pg.locator("#secnav a").count() === 9);
    await audit(pg, T("Pharmacie"));
    await shot(pg, "v8-pharmacie-" + vp.tag, "#view > .hero");

    // ---------- Le cas « 100 vaccins A arrivent » ----------
    await pg.fill("#flt", "vacc");
    check(T("Filtre « vacc » : seulement les vaccins"), await pg.locator("#list .item").count() === 10 && await pg.locator("#secnav a").count() === 1);
    await pg.keyboard.press("ArrowDown");
    check(T("Flèche bas : focus sur le premier + Entrée"), /^Entrée : Vaccin A/.test(await activeLabel(pg)));
    check(T("Vaccin A : 20 doses au départ"), await stock(pg, "Vaccin A (fictif)") === 20);
    await pg.keyboard.press("Enter");
    const vid = await row(pg, "Vaccin A (fictif)").getAttribute("id");
    const qtyId = "#p-" + vid.slice(4) + "-qty", expId = "#p-" + vid.slice(4) + "-exp";
    check(T("+ Entrée ouvre quantité et péremption, focus sur la quantité"), await activeLabel(pg) === qtyId.slice(1) && await pg.locator(expId).count() === 1);
    check(T("L'unité est rappelée (en doses)"), /en doses/.test(await pg.locator(".panel").innerText()));
    await pg.keyboard.press("Enter");
    check(T("Valider vide : trois erreurs (quantité, péremption, prénom)"), await pg.locator(".panel .err-msg").count() === 3);
    await pg.selectOption(".panel select[data-bind=who]", "Sofia");
    await pg.fill(qtyId, "100"); await pg.fill(expId, "01/2020"); await pg.keyboard.press("Enter");
    check(T("Date dépassée refusée"), /dépassée/.test(await pg.locator(".panel .err-msg").innerText()) && await activeLabel(pg) === expId.slice(1));
    await pg.fill(expId, "13/2027"); await pg.keyboard.press("Enter");
    check(T("Date illisible refusée"), /non reconnue/.test(await pg.locator(".panel .err-msg").innerText()));
    await pg.fill(expId, mmYYYY(8)); await pg.keyboard.press("Enter");
    check(T("Entrée validée : 120 doses"), await stock(pg, "Vaccin A (fictif)") === 120 && await pg.locator(".panel").count() === 0);
    check(T("Confirmation « + 100 doses » avec Annuler"), /\+ 100 doses/.test(await pg.locator("#toast").innerText()) && /Sofia/.test(await pg.locator("#toast").innerText()) && await pg.locator("#toast [data-act=undo]").count() === 1);
    check(T("Focus rendu au bouton + Entrée de la ligne"), /^Entrée : Vaccin A/.test(await activeLabel(pg)));

    // ---------- Sortie : la plus proche péremption part en premier ----------
    await pg.fill("#flt", "paracetamol 500");
    check(T("Filtre sans accent « paracetamol 500 »"), await pg.locator("#list .item").count() === 2);
    check(T("Paracétamol 500 mg : 36 boîtes, péremption proche signalée"), await stock(pg, "Paracétamol 500 mg") === 36 && await row(pg, "Paracétamol 500 mg").locator(".b-soon").count() === 1);
    await row(pg, "Paracétamol 500 mg").locator("[data-mode=out]").click();
    check(T("− Sortie : motif « Utilisé » par défaut"), await pg.locator('.panel input[value=use]').isChecked());
    await pg.locator(".panel input.big").fill("5"); await pg.keyboard.press("Enter");
    check(T("Sortie sans prénom ni destination refusée"), await pg.locator(".panel .err-msg").count() === 2 && await stock(pg, "Paracétamol 500 mg") === 36);
    await pg.selectOption(".panel select[data-bind=who]", "Inès"); await pg.selectOption(".panel select[data-bind=dest]", "Dr A");
    await pg.locator(".panel input.big").fill("50"); await pg.keyboard.press("Enter");
    check(T("Sortie supérieure au stock refusée"), /que 36 boîtes/.test(await pg.locator(".panel .err-msg").innerText()));
    await pg.locator(".panel input.big").fill("10"); await pg.keyboard.press("Enter");
    const t = await pg.locator("#toast").innerText();
    check(T("Sortie de 10 : 6 de la date proche + 4 de la suivante"), await stock(pg, "Paracétamol 500 mg") === 26 && new RegExp("6 × " + mmYYYY(1) + ", 4 × ").test(t) && /Inès → Dr A/.test(t), t);
    check(T("La péremption proche a disparu de la ligne"), await row(pg, "Paracétamol 500 mg").locator(".b-soon").count() === 0);
    await pg.click("#toast [data-act=undo]");
    check(T("Annuler la sortie : 36 boîtes à nouveau"), await stock(pg, "Paracétamol 500 mg") === 36);

    // ---------- À surveiller : le périmé à sortir ----------
    await pg.fill("#flt", "");
    await pg.click("[data-act=watch]");
    const nw = await pg.locator("#list .item").count();
    check(T("À surveiller : seulement les péremptions proches ou dépassées"), nw > 0 && nw < 100 && await pg.locator("#list .item .b-expired").count() === 1);
    await row(pg, "Ibuprofène 20 mg/ml sirop").locator("[data-mode=out]").click();
    await pg.click('.panel label:has(input[value=exp])');
    check(T("Motif « périmé » : pas de destination demandée"), await pg.locator(".panel select[data-bind=dest]").count() === 0);
    await pg.selectOption(".panel select[data-bind=who]", "Camille");
    await pg.locator(".panel input.big").fill("3"); await pg.keyboard.press("Enter");
    check(T("Motif « périmé » : pas plus que le lot périmé"), /Seulement 2 flacons à sortir comme périmé/.test(await pg.locator(".panel .err-msg").innerText()));
    await pg.click('.panel label:has(input[value=use])');
    await pg.selectOption(".panel select[data-bind=dest]", "Dr B");
    await pg.locator(".panel input.big").fill("6"); await pg.keyboard.press("Enter");
    check(T("Motif « utilisé » : jamais le lot périmé"), /que 5 flacons non périmés/.test(await pg.locator(".panel .err-msg").innerText()));
    await pg.locator(".panel input.big").fill("5");
    check(T("Corriger le champ efface son erreur"), await pg.locator(".panel .err-msg").count() === 0);
    await pg.click('.panel label:has(input[value=exp])');
    await pg.locator(".panel input.big").fill("2"); await pg.keyboard.press("Enter");
    check(T("Sortie « périmé » : plus de badge rouge"), await pg.locator("#list .b-expired").count() === 0);
    await pg.keyboard.press("Escape");
    await pg.click("[data-act=watch]");

    // ---------- Panneau : Échap ferme et rend le focus ----------
    await row(pg, "Amoxicilline 1 g").locator("[data-mode=in]").click();
    await pg.keyboard.press("Escape");
    check(T("Échap ferme le panneau et rend le focus"), await pg.locator(".panel").count() === 0 && /^Entrée : Amoxicilline 1 g/.test(await activeLabel(pg)));
    await row(pg, "Amoxicilline 1 g").locator("[data-mode=in]").click();
    await shot(pg, "v8-entree-" + vp.tag, ".panel");
    await audit(pg, T("Panneau d'entrée ouvert"));
    await pg.keyboard.press("Escape");

    // ---------- Article absent : la responsable l'ajoute ----------
    await pg.click("[data-act=add-open]");
    await pg.click('form[data-form=add] button[type=submit]');
    check(T("Ajout : trois champs obligatoires"), await pg.locator('form[data-form=add] .err-msg').count() === 3);
    await pg.fill("#add-name", "Vaccin C (fictif)"); await pg.fill("#add-format", "dose 0,5 ml"); await pg.fill("#add-unit", "dose");
    await pg.selectOption("#add-sec", "FR");
    await pg.click('form[data-form=add] button[type=submit]');
    check(T("Article ajouté dans son étagère, focus sur son + Entrée"), await pg.locator("#sec-pharma-FR .nm", { hasText: "Vaccin C (fictif)" }).count() === 1 && /^Entrée : Vaccin C/.test(await activeLabel(pg)));

    // ---------- Papeterie : pas de péremption ----------
    await pg.click("#tab-pap");
    await row(pg, "Ramette papier A4 80 g").locator("[data-mode=in]").click();
    check(T("Papeterie : seule la quantité est demandée"), await pg.locator(".panel input[type=text]").count() === 1);
    await pg.keyboard.type("10"); await pg.keyboard.press("Enter");
    check(T("Papeterie : entrée sans prénom refusée"), await pg.locator(".panel .err-msg").count() === 1);
    await pg.selectOption(".panel select[data-bind=who]", "Marc"); await pg.click(".panel button[type=submit]");
    check(T("Papeterie : entrée faite"), /\+ 10 ramettes/.test(await pg.locator("#toast").innerText()));
    check(T("Papeterie : pas de bouton « À surveiller »"), await pg.locator("[data-act=watch]").count() === 0);
    await audit(pg, T("Papeterie"));

    // ---------- Mouvements ----------
    await pg.click("#tab-moves");
    const nm = await pg.locator("tbody tr").count();
    check(T("Mouvements : 3 lignes (entrée vaccins, sortie périmé, entrée ramettes)"), nm === 3, nm);
    check(T("Mouvements : la sortie « périmé » est signée, sans destination"), /Périmé\s+Camille\s+—/.test(await pg.locator("tbody tr").nth(1).innerText()));
    check(T("Mouvements : l'entrée est signée"), /Entrée\s+Marc\s+—/.test(await pg.locator("tbody tr").first().innerText()));
    check(T("Mouvements : seul le dernier peut être annulé"), await pg.locator("tbody [data-act=undo]").count() === 1);
    await shot(pg, "v8-mouvements-" + vp.tag);
    await audit(pg, T("Mouvements"));
    await pg.click("tbody [data-act=undo]");
    check(T("Mouvements : annuler retire la ligne"), await pg.locator("tbody tr").count() === 2);

    // ---------- Le process ----------
    await pg.click("#tab-process");
    check(T("Le process : entrée, sortie, règles, questions"), (await pg.locator("#view").innerText()).includes("100 vaccins A") && await pg.locator("ol.q li").count() === 10);
    await shot(pg, "v8-process-" + vp.tag);
    await audit(pg, T("Le process"));

    // ---------- Onglets au clavier ----------
    await pg.focus("#tab-process");
    await pg.keyboard.press("Home");
    check(T("Onglets : Début revient au tableau de bord"), await activeLabel(pg) === "tab-dash" && await pg.locator("#h-dash").count() === 1);
    await pg.keyboard.press("ArrowDown");
    check(T("Onglets : flèche bas passe à la Pharmacie"), await activeLabel(pg) === "tab-pharma" && await pg.locator("#list .item").count() === 101);
    await pg.keyboard.press("ArrowDown");
    check(T("Onglets : flèche bas passe aux Consommables"), await activeLabel(pg) === "tab-cons");
    check(T("Aucune donnée persistée"), await pg.evaluate(() => localStorage.length + sessionStorage.length) === 0);
    await pg.close();
  }
  check("Aucune erreur JavaScript", !errors.length, errors);
  await br.close();
  const failed = results.filter((r) => !r).length;
  console.log("\n" + (results.length - failed) + " / " + results.length + " contrôles OK");
  process.exit(failed ? 1 : 0);
})();
