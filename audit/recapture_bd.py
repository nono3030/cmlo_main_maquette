"""Recapture ciblée : B (validation bloquée) et D (livraison type) en 1440 px, après les dernières retouches."""
import sys, datetime as dt
from playwright.sync_api import sync_playwright
URL, OUT = "file://" + sys.argv[1], sys.argv[2]
d = lambda n: (dt.date.today() + dt.timedelta(days=n)).isoformat()
def sim(pg, flow, code):
    pg.click('button[data-act="sim"][data-flow="%s"][data-code="%s"]' % (flow, code))
    pg.wait_for_function("!window.__clmoDemo.simBusy()"); pg.wait_for_timeout(60)
with sync_playwright() as p:
    br = p.chromium.launch(channel="chrome", headless=True)
    pg = br.new_page(viewport={"width": 1440, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.click("#tab-B"); pg.click("#room-B-pap"); pg.click("#b-create"); pg.wait_for_timeout(50)
    sim(pg, "B", "2000000000086"); pg.keyboard.type("10"); pg.keyboard.press("Enter")
    sim(pg, "B", "2000000000055"); l2 = pg.evaluate("window.__clmoDemo.state.B.rec.lines[1].id")
    pg.fill("#b-qty-" + l2, "3"); pg.fill("#b-exp-" + l2, d(-5)); pg.wait_for_timeout(50)
    pg.mouse.move(5, 5); pg.wait_for_timeout(3800)  # pas de survol, toast disparu
    pg.screenshot(path=OUT + "/screenshot-B-desktop-1440.png", full_page=True)
    pg.click("#tab-D"); pg.click("#d-demo")
    pg.wait_for_function("window.__clmoDemo.state.D.replaying === false && window.__clmoDemo.state.D.rec && window.__clmoDemo.state.D.rec.lines.length === 7", timeout=30000)
    pg.mouse.move(5, 5); pg.wait_for_timeout(3800)
    pg.screenshot(path=OUT + "/screenshot-D-desktop-1440.png", full_page=True)
    print("errors:", errs or "aucune")
    br.close()
