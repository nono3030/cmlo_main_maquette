import sys, time
from playwright.sync_api import sync_playwright
URL = "file://" + sys.argv[1]
with sync_playwright() as p:
    br = p.chromium.launch(channel="chrome", headless=True)
    pg = br.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.click("#room-A-cons")
    for i in range(3):
        t0 = time.time()
        pg.click('button[data-act="sim"][data-flow="A"][data-code="2000000000017"]')
        t1 = time.time()
        pg.wait_for_selector("#a-qty", timeout=10000)
        t2 = time.time()
        print("click %.0f ms, form after %.0f ms, active=%s" % ((t1-t0)*1000, (t2-t0)*1000, pg.evaluate("document.activeElement.id")))
        pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    # mesure interne des ticks
    print(pg.evaluate("""new Promise(function(res){var n=0,t=performance.now();var h=setInterval(function(){n++; if(n===13){clearInterval(h);res(performance.now()-t)}},12)})"""))
    print("errors", errs)
    br.close()
