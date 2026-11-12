import sys
from playwright.sync_api import sync_playwright
URL = "file://" + sys.argv[1]
with sync_playwright() as p:
    br = p.chromium.launch(channel="chrome", headless=True)
    pg = br.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e.stack)[:500]))
    pg.on("console", lambda m: errs.append("console " + m.type + ": " + m.text))
    pg.goto(URL)
    pg.click("#tab-D"); pg.click("#room-D-pharma"); pg.click("#d-create"); pg.wait_for_timeout(50)
    print("scan-D exists:", pg.evaluate("!!document.getElementById('scan-D')"), "chip count:", pg.locator('button[data-act="sim"][data-flow="D"]').count())
    pg.evaluate("document.querySelector('button[data-act=\"sim\"][data-flow=\"D\"][data-code=\"2000000000062\"]').click()")
    print("busy right after click:", pg.evaluate("window.__clmoDemo.simBusy()"))
    pg.wait_for_timeout(1500)
    print("lines:", pg.evaluate("window.__clmoDemo.state.D.rec.lines.length"), "scan value:", pg.evaluate("document.getElementById('scan-D').value"))
    print("errors:", errs)
    br.close()
