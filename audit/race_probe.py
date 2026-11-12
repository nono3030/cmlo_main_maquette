import sys
from playwright.sync_api import sync_playwright
URL = "file://" + sys.argv[1]
with sync_playwright() as p:
    br = p.chromium.launch(channel="chrome", headless=True)
    pg = br.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(URL)
    pg.evaluate("""(function(){var v=document.getElementById('view');window.__muts=[];
      new MutationObserver(function(){window.__muts.push(Math.round(performance.now()))}).observe(v,{childList:true});})()""")
    pg.click("#tab-D"); pg.click("#room-D-pharma"); pg.click("#d-create"); pg.wait_for_timeout(50)
    t0 = pg.evaluate("Math.round(performance.now())")
    pg.click('button[data-act="sim"][data-flow="D"][data-code="2000000000062"]')
    pg.wait_for_function("!window.__clmoDemo.simBusy()", timeout=10000); pg.wait_for_timeout(60)
    print("fresh page: lines =", pg.evaluate("window.__clmoDemo.state.D.rec.lines.length"), "renders since click:", [m - t0 for m in pg.evaluate("window.__muts") if m >= t0])
    # même chose juste après une validation D (toast + focus sur « Ouvrir et scanner »)
    pg.click('button[data-act="sim"][data-flow="D"][data-code="2000000000062"]'); pg.wait_for_function("!window.__clmoDemo.simBusy()"); pg.wait_for_timeout(60)
    pg.fill("#de-" + pg.evaluate("window.__clmoDemo.state.D.rec.lines[0].id"), "2027-09-01"); pg.wait_for_timeout(50)
    pg.click("#d-validate"); pg.wait_for_timeout(80)
    pg.click("#room-D-pharma"); pg.click("#d-create"); pg.wait_for_timeout(50)
    t0 = pg.evaluate("Math.round(performance.now())")
    pg.click('button[data-act="sim"][data-flow="D"][data-code="2000000000062"]')
    pg.wait_for_function("!window.__clmoDemo.simBusy()", timeout=10000); pg.wait_for_timeout(60)
    print("after validation: lines =", pg.evaluate("window.__clmoDemo.state.D.rec.lines.length"), "renders since click:", [m - t0 for m in pg.evaluate("window.__muts") if m >= t0])
    br.close()
