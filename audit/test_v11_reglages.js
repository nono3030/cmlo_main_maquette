// Contrôles de la page « Réglages » (V11) : lieux, alertes, personnel, destinations.
// Usage : node audit/test_v11_reglages.js prototype/stock-entry-workflows.html [dossier captures]
const path = require("path");
const { chromium } = require("playwright");

const url = "file:///" + path.resolve(process.argv[2] || "prototype/stock-entry-workflows.html").replace(/\\/g, "/");
const OUT = process.argv[3] || "";
let ok = 0, ko = 0;
function check(name, cond, info) { if (cond) ok++; else { ko++; console.log("ÉCHEC  " + name + (info !== undefined ? "  · " + JSON.stringify(info) : "")); } }
const num = async (pg, sel) => parseInt(await pg.locator(sel).innerText(), 10);
const toast = (pg) => pg.locator("#toast").innerText();

(async function () {
  const browser = await chromium.launch();
  for (const vp of [{ tag: "1440", width: 1440, height: 900 }, { tag: "900", width: 900, height: 800 }, { tag: "390", width: 390, height: 844 }]) {
    const T = (s) => "[" + vp.tag + "] " + s;
    const pg = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const errors = [];
    pg.on("pageerror", (e) => errors.push(String(e)));
    await pg.goto(url);
    const soon0 = await num(pg, '[data-act="d-state"][data-v="soon"] b'), low0 = await num(pg, '[data-act="d-state"][data-v="low"] b');
    await pg.click("#tab-cfg");
    check(T("Cinq blocs : lieux, péremption, épuisement, personnel, destinations"), await pg.locator("#view .card").count() === 5);
    if (OUT) await pg.screenshot({ path: path.join(OUT, "v11-reglages-" + vp.tag + ".png"), fullPage: true });

    // ---------- Alerte de péremption ----------
    check(T("Papeterie : pas de date de péremption, pas de réglage"), await pg.locator("#cfg-m-pap").evaluate((e) => e.tagName) === "SPAN");
    await pg.selectOption("#cfg-m-pharma", "6");
    check(T("Délai changé : confirmation"), /Pharmacie : 6 mois avant/.test(await toast(pg)));
    await pg.click("#tab-dash");
    const soon6 = await num(pg, '[data-act="d-state"][data-v="soon"] b');
    check(T("6 mois : davantage d'articles bientôt périmés"), soon6 > soon0, { soon0, soon6 });
    await pg.click("#tab-cfg");
    check(T("Le réglage est conservé en revenant sur la page"), await pg.inputValue("#cfg-m-pharma") === "6");
    await pg.selectOption("#cfg-m-pharma", "1");
    await pg.click("#tab-dash");
    check(T("1 mois : moins d'articles bientôt périmés"), await num(pg, '[data-act="d-state"][data-v="soon"] b') < soon6);

    // ---------- Alerte d'épuisement ----------
    await pg.click("#tab-cfg");
    await pg.fill("#cfg-low", "abc"); await pg.locator("#cfg-low").blur();
    check(T("Seuil illisible refusé"), /Nombre entier/.test(await pg.locator("#cfg-low-e").innerText()));
    await pg.fill("#cfg-low", "10"); await pg.locator("#cfg-low").blur();
    check(T("Seuil à 10 : confirmation, erreur effacée"), /10 unités ou moins/.test(await toast(pg)) && await pg.locator("#cfg-low-e").count() === 0);
    await pg.click("#tab-dash");
    check(T("Seuil à 10 : davantage d'articles bientôt épuisés"), await num(pg, '[data-act="d-state"][data-v="low"] b') > low0);
    check(T("La légende suit le seuil"), /10 ou moins/.test(await pg.locator(".dleg").innerText()));
    await pg.click("#tab-cfg");
    await pg.fill("#cfg-low", "0"); await pg.locator("#cfg-low").blur();
    await pg.click("#tab-dash");
    check(T("Seuil à 0 : alerte désactivée"), await num(pg, '[data-act="d-state"][data-v="low"] b') === 0 && /désactivée/.test(await pg.locator(".dleg").innerText()));

    // ---------- Personnel et destinations ----------
    await pg.click("#tab-cfg");
    await pg.click('form[data-form="cfg-who"] button');
    check(T("Prénom vide refusé"), /Prénom à saisir/.test(await pg.locator("#cfg-new-who-e").innerText()));
    await pg.fill("#cfg-new-who", "ines"); await pg.keyboard.press("Enter");
    check(T("Doublon refusé, sans tenir compte des accents ni de la casse"), /existe déjà/.test(await pg.locator("#cfg-new-who-e").innerText()));
    await pg.fill("#cfg-new-who", "  Léa <b> "); await pg.keyboard.press("Enter");
    check(T("Prénom ajouté, nettoyé"), await pg.locator(".cfg-tag", { hasText: /^Léa b×$/ }).count() === 1, await pg.locator("#h-cfg-who").locator("xpath=../..").innerText());
    await pg.locator('[aria-label="Retirer Camille"]').click();
    await pg.fill("#cfg-new-dest", "Dr D"); await pg.keyboard.press("Enter");
    await pg.click("#tab-pharma");
    await pg.locator('[data-act="open"][data-mode="out"]').first().click();
    const who = await pg.locator(".panel select[data-bind=who] option").allInnerTexts(), dest = await pg.locator(".panel select[data-bind=dest] option").allInnerTexts();
    check(T("Sortie ordinateur : listes à jour"), who.includes("Léa b") && !who.includes("Camille") && dest.includes("Dr D"), { who, dest });
    await pg.keyboard.press("Escape");
    await pg.click("#tab-sortie");
    const chips = await pg.locator(".kchip").allInnerTexts();
    check(T("Tablette : boutons à jour"), chips.includes("Léa b") && !chips.includes("Camille") && chips.includes("Dr D"), chips);
    await pg.click('.hero [data-act="tab"]');
    await pg.click("#tab-cfg");
    for (let i = 0; i < 6; i++) { const b = pg.locator('[data-act="cfg-del-who"]:not([disabled])').first(); if (await b.count()) await b.click(); }
    check(T("Impossible de retirer le dernier prénom"), await pg.locator("#h-cfg-who").locator("xpath=../..").locator(".cfg-tag").count() === 1 && await pg.locator('[data-act="cfg-del-who"][disabled]').count() === 1);

    // ---------- Lieux de stockage ----------
    check(T("Un lieu qui contient des articles ne se supprime pas"), await pg.locator('[data-act="cfg-del-room"][disabled]').count() === 3);
    await pg.fill('[data-cfg="name"][data-v="pharma"]', "Armoire pharmacie"); await pg.locator('[data-cfg="name"][data-v="pharma"]').blur();
    check(T("Lieu renommé : la navigation suit"), (await pg.locator("#tab-pharma").innerText()).trim() === "Armoire pharmacie");
    await pg.fill('[data-cfg="name"][data-v="cons"]', "armoire pharmacie"); await pg.locator('[data-cfg="name"][data-v="cons"]').blur();
    check(T("Deux lieux ne peuvent pas porter le même nom"), /existe déjà/.test(await pg.locator("#h-cfg-room").locator("xpath=../..").innerText()) && (await pg.locator("#tab-cons").innerText()).trim() === "Consommables");
    await pg.fill("#cfg-new-room", "Armoire salle de soins"); await pg.keyboard.press("Enter");
    check(T("Lieu ajouté : quatre lieux dans la navigation"), await pg.locator("#room-tabs [role=tab]").count() === 4);
    await pg.locator("#room-tabs [role=tab]").nth(3).click();
    check(T("Nouveau lieu : état vide explicite"), /Aucun article dans ce lieu/.test(await pg.locator("#list").innerText()));
    await pg.click("[data-act=add-open]");
    await pg.fill("#add-name", "Compresses test"); await pg.fill("#add-format", "boîte de 10"); await pg.fill("#add-unit", "boîte");
    await pg.click('form[data-form=add] button[type=submit]');
    check(T("Nouveau lieu : on peut y ajouter un article"), await pg.locator("#list .item").count() === 1);
    await pg.click("#tab-dash");
    check(T("Tableau de bord : quatre barres"), await pg.locator(".dres").count() === 4);
    await pg.click("#tab-cfg");
    check(T("Le lieu rempli ne se supprime plus"), await pg.locator('[data-act="cfg-del-room"]:not([disabled])').count() === 0);
    await pg.fill("#cfg-new-room", "Lieu vide"); await pg.keyboard.press("Enter");
    await pg.locator('[data-act="cfg-del-room"]:not([disabled])').click();
    check(T("Un lieu vide se supprime"), await pg.locator("#room-tabs [role=tab]").count() === 4 && /Lieu supprimé/.test(await toast(pg)));

    // ---------- Une saisie en cours ne vole ni le clic suivant ni les autres champs ----------
    const nd = await pg.locator('[data-act="cfg-del-dest"]').count();
    await pg.fill("#cfg-new-who", "Zed");
    await pg.fill('[data-cfg="name"][data-v="pharma"]', "Pharma 2");
    await pg.locator('[data-act="cfg-del-dest"]').first().click();
    check(T("Renommer puis cliquer ailleurs : les deux actions passent"), (await pg.locator("#tab-pharma").innerText()).trim() === "Pharma 2" && await pg.locator('[data-act="cfg-del-dest"]').count() === nd - 1);
    check(T("Le prénom en cours de saisie est conservé"), await pg.inputValue("#cfg-new-who") === "Zed");
    await pg.fill('[data-cfg="name"][data-v="cons"]', ""); await pg.locator('[data-cfg="name"][data-v="cons"]').blur();
    check(T("Nom vidé : erreur sous la ligne, champ marqué"), await pg.locator("#cfg-name-cons-e").count() === 1 && await pg.locator('[data-cfg="name"][data-v="cons"][aria-invalid="true"]').count() === 1);
    await pg.fill('[data-cfg="name"][data-v="cons"]', "Consommables"); await pg.locator('[data-cfg="name"][data-v="cons"]').blur();
    check(T("Nom corrigé : l'erreur disparaît"), await pg.locator("#cfg-name-cons-e").count() === 0);
    await pg.fill("#cfg-new-dest", "Soins & urgences"); await pg.keyboard.press("Enter");
    check(T("« & » conservé dans un nom"), await pg.locator(".cfg-tag", { hasText: "Soins & urgences" }).count() === 1);

    // ---------- Qualité ----------
    const q = await pg.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      unnamed: Array.from(document.querySelectorAll("#view input, #view select, #view button")).filter((el) => !((el.labels && el.labels.length) || el.getAttribute("aria-label") || (el.tagName === "BUTTON" && el.textContent.trim()))).length,
      dups: (() => { const s = {}, d = []; document.querySelectorAll("[id]").forEach((e) => { if (s[e.id]) d.push(e.id); s[e.id] = 1; }); return d; })(),
      stored: localStorage.length + sessionStorage.length,
    }));
    check(T("Aucun débordement horizontal"), q.overflow <= 0, q.overflow);
    check(T("Chaque champ et bouton a un nom"), q.unnamed === 0);
    check(T("Identifiants uniques"), q.dups.length === 0, q.dups);
    check(T("Aucune donnée persistée"), q.stored === 0);
    check(T("Aucune erreur JavaScript"), errors.length === 0, errors);
    await pg.close();
  }
  await browser.close();
  console.log(ok + " / " + (ok + ko) + " contrôles OK");
  process.exit(ko ? 1 : 0);
})();
