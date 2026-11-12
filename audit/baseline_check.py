"""Constats sur la version d'origine du prototype CLMO (avant corrections)."""
import sys, json
from playwright.sync_api import sync_playwright
URL = "file://" + sys.argv[1]
OUT = sys.argv[2]
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    STEP = ["init"]
    pg.on("pageerror", lambda e: errs.append(STEP[0] + " :: " + str(e.stack)[:600]))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(URL)
    # 1. Recherche manuelle : l'exemple du placeholder
    STEP[0] = "step1"
    pg.click('button.room[data-flow="A"][data-room="cons"]')
    pg.click('button[data-act="mode"][data-flow="A"][data-manual="1"]')
    pg.fill("#search-A", "seringue 5")
    res["search_seringue_5_results"] = pg.locator("#results-A button").count()
    pg.fill("#search-A", "demo")
    res["search_demo_results"] = pg.locator("#results-A button").count()
    # Entrée dans la recherche : rien ?
    pg.fill("#search-A", "gants")
    pg.press("#search-A", "Enter")
    res["search_enter_opens_form"] = pg.locator("#a-qty").count() > 0
    # 2. Code-barres lu dans Quantité (article sans péremption)
    STEP[0] = "step2"
    pg.click('button[data-act="mode"][data-flow="A"][data-manual="0"]')
    pg.fill("#scan-A", "2000000000048"); pg.press("#scan-A", "Enter")
    pg.fill("#a-qty", "2000000000017"); pg.press("#a-qty", "Enter")
    st = pg.evaluate("window.__clmoDemo.stock().map(function(l){return l.qty})")
    res["barcode_in_qty_max_stock_qty"] = max(st)
    # 3. Quantité décimale acceptée
    STEP[0] = "step3"
    pg.fill("#scan-A", "2000000000048"); pg.press("#scan-A", "Enter")
    pg.fill("#a-qty", "1.5"); pg.press("#a-qty", "Enter")
    st = pg.evaluate("window.__clmoDemo.stock().map(function(l){return l.qty})")
    res["decimal_qty_stored"] = 1.5 in st
    res["A_decimal_blocked_by_native_validation"] = pg.locator("#a-qty").count() > 0
    pg.click('button[data-act="a-back"]')
    # 4. Entrée sans quantité : aucun message
    STEP[0] = "step4"
    pg.fill("#scan-A", "2000000000017"); pg.press("#scan-A", "Enter")
    pg.press("#a-qty", "Enter")
    res["A_enter_with_empty_form_still_on_form"] = pg.locator("#a-qty").count() > 0
    res["A_inline_error_visible"] = pg.locator(".notice.err").count()
    # 5. C : pointer sans quantité -> message ?
    STEP[0] = "step5"
    pg.click('button[role=tab][data-flow="C"]')
    pg.click('button[data-act="sim"][data-flow="C"][data-code="2000000000055"]')
    pg.wait_for_selector("#c-qty")
    pg.click("#c-submit")
    res["C_empty_submit_error_messages"] = pg.locator(".notice.err").count()
    res["C_has_line_delete_button"] = pg.locator('[data-act="c-del"]').count()
    res["C_still_on_form_after_empty_submit"] = pg.locator("#c-qty").count() > 0
    # 6. C : clôture avec articles non comptés -> confirmation ?
    STEP[0] = "step6"
    pg.fill("#c-qty", "3"); pg.fill("#c-exp", "2027-05-31"); pg.click("#c-submit")
    pg.click('button.room[data-flow="C"][data-room="cons"]')
    pg.click('button[data-act="sim"][data-flow="C"][data-code="2000000000031"]')
    pg.wait_for_selector("#c-qty"); pg.fill("#c-qty", "4"); pg.fill("#c-exp", "2028-01-31"); pg.click("#c-submit")
    before = pg.evaluate("window.__clmoDemo.stock().filter(function(l){return l.room==='cons'}).map(function(l){return [l.articleId,l.qty]})")
    pg.click('button[data-act="c-close"]')
    after = pg.evaluate("window.__clmoDemo.stock().filter(function(l){return l.room==='cons'}).map(function(l){return [l.articleId,l.qty]})")
    res["C_close_cons_before"] = before; res["C_close_cons_after_no_confirm"] = after
    # 7. B : abandon du brouillon sans confirmation
    STEP[0] = "step7"
    pg.click('button[role=tab][data-flow="B"]')
    pg.click('button.room[data-flow="B"][data-room="pap"]'); pg.click('button[data-act="b-create"]')
    pg.click('button[data-act="sim"][data-flow="B"][data-code="2000000000086"]'); pg.wait_for_timeout(400)
    pg.click('button[data-act="b-cancel"]')
    res["B_draft_after_single_click_abandon"] = pg.evaluate("window.__clmoDemo.state.B.rec")
    # 8. Focus perdu après une action
    STEP[0] = "step8"
    pg.click('button.room[data-flow="B"][data-room="pap"]'); pg.click('button[data-act="b-create"]')
    pg.click('button[data-act="sim"][data-flow="B"][data-code="2000000000086"]'); pg.wait_for_timeout(400)
    pg.click('button[data-act="b-del"]')
    res["focus_after_line_delete"] = pg.evaluate("document.activeElement.tagName + '#' + document.activeElement.id")
    # 9. 390 px : panneau article inconnu
    STEP[0] = "step9"
    pg.set_viewport_size({"width": 390, "height": 800})
    pg.click('button[role=tab][data-flow="A"]')
    if pg.locator('button[data-act="a-back"]').count(): pg.click('button[data-act="a-back"]')
    pg.click('button[data-act="sim"][data-flow="A"][data-code="2000000000994"]'); pg.wait_for_timeout(500)
    res["mobile_unknown_panel_overflow_px"] = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    pg.screenshot(path=OUT + "/before-mobile-390-unknown.png", full_page=False)
    res["tabs_visible_390"] = pg.evaluate("Array.prototype.map.call(document.querySelectorAll('.flows [role=tab]'), function(t){var r=t.getBoundingClientRect(); return r.right <= window.innerWidth})")
    res["js_errors"] = errs
    b.close()
print(json.dumps(res, ensure_ascii=False, indent=1))
