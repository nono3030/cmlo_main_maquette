import sys
from playwright.sync_api import sync_playwright
URL = "file://" + sys.argv[1]
JS = """(function(){var W=document.documentElement.clientWidth,out=[];
document.querySelectorAll('body *').forEach(function(el){var r=el.getBoundingClientRect(); if(r.right>W+1 && r.width>0){
 var inScroll=false,p=el.parentElement; while(p){var cs=getComputedStyle(p); if((cs.overflowX==='auto'||cs.overflowX==='scroll'||cs.overflowX==='hidden')&&p.getBoundingClientRect().right<=W+1){inScroll=true;break} p=p.parentElement}
 if(!inScroll) out.push(el.tagName+'.'+el.className+'#'+el.id+' right='+Math.round(r.right)+' w='+Math.round(r.width))}});
return out.slice(0,12)})()"""
with sync_playwright() as p:
    br = p.chromium.launch(channel="chrome", headless=True)
    m = br.new_page(viewport={"width": 390, "height": 844})
    m.goto(URL)
    m.click("#tab-B"); m.click("#room-B-cons"); m.click("#b-create")
    m.click('button[data-act="sim"][data-flow="B"][data-code="2000000000031"]'); m.wait_for_function("!window.__clmoDemo.simBusy()"); m.wait_for_timeout(50)
    print("B:", m.evaluate("document.documentElement.scrollWidth"), m.evaluate(JS))
    m.click("#tab-C"); m.click('button[data-act="pick"][data-flow="C"][data-id="a6"]'); m.wait_for_timeout(50)
    print("C:", m.evaluate("document.documentElement.scrollWidth"), m.evaluate(JS))
    br.close()
