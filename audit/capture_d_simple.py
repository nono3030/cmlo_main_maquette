"""Captures de la piste D simplifiée : 1440 (page) et 390 (colonne principale)."""
import sys, datetime as dt
from playwright.sync_api import sync_playwright
URL, OUT = "file://" + sys.argv[1], sys.argv[2]
d = lambda n: (dt.date.today() + dt.timedelta(days=n)).isoformat()
def sim(pg, code):
    if pg.locator("#d-sim:not([open])").count(): pg.click("#d-sim > summary")
    pg.click('button[data-act="sim"][data-flow="D"][data-code="%s"]' % code)
    pg.wait_for_function("!window.__clmoDemo.simBusy()"); pg.wait_for_timeout(60)
def fill_list(pg):
    pg.click("#tab-D"); pg.click("#room-D-cons"); pg.wait_for_timeout(50)
    sim(pg, "2000000000017"); pg.fill("#d-qty", "5"); pg.fill("#d-exp", d(610)); pg.press("#d-qty", "Enter"); pg.wait_for_timeout(60)
    sim(pg, "2000000000048"); pg.fill("#d-qty", "4"); pg.press("#d-qty", "Enter"); pg.wait_for_timeout(60)
    sim(pg, "2000000000055"); pg.fill("#d-qty", "1"); pg.fill("#d-exp", d(200)); pg.press("#d-qty", "Enter"); pg.wait_for_timeout(60)
    sim(pg, "2000000000031"); pg.fill("#d-qty", "2")
    pg.evaluate("window.__clmoDemo.state.D.simOpen = false")
    pg.mouse.move(5, 5); pg.wait_for_timeout(400)
with sync_playwright() as p:
    br = p.chromium.launch(channel="chrome", headless=True); errs = []
    pg = br.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); fill_list(pg); pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(60); pg.screenshot(path=OUT + "/screenshot-D-desktop-1440.png", full_page=True)
    m = br.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2); m.on("pageerror", lambda e: errs.append(str(e)))
    m.goto(URL); fill_list(m); m.locator("main").screenshot(path=OUT + "/screenshot-D-mobile-390.png")
    print("overflow 390:", m.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth"), "errors:", errs or "aucune")
    br.close()
