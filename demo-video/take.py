# Generates the browser action script: each beat is held at least as long as its voiceover.
import json
B = 'https://permaculture-hub-azure.vercel.app'
dur = json.load(open('vo/durations.json'))
PAD = 0.55
steps = []
def beat(name, *js, extra=0.0):
    steps.append({'mark': name})
    for j in js:
        steps.append({'js': j} if isinstance(j, str) else j)
    steps.append({'hold': (dur[name] + PAD + extra) * 1000})
def goto(url, settle=1800, pos=None):
    steps.append({'rec': False})
    steps.append({'goto': url, 'settle': settle})
    if pos: steps.append({'js': f'D.setPos({pos[0]},{pos[1]})'})
    steps.append({'rec': True})

# 1. Explore (~15s)
goto(B + '/learn', 2500, (760, 470))
beat('e1',
     "await D.sleep(500); await D.hover('text=West Oakland Farm Park'); await D.sleep(900); await D.hover('text=West Oakland Library'); await D.sleep(700); await D.moveTo(900, 560);")
beat('e2',
     "await D.click('[aria-label=\"Show whole Bay Area\"]', {after: 1400}); await D.moveTo(780, 640); await D.sleep(500); await D.moveTo(840, 760);")
beat('e3',
     "await D.click('text=Summer heat', {after: 600}); await D.moveTo(830, 560, 1200);")

# 2. Plan (~20s)
goto(B + '/plan/', 2000, (700, 420))
beat('p1',
     "await D.sleep(300); await D.type('#loc', 'Oakland', 9); await D.sleep(900); const s = document.querySelector('#locSuggest li, #locSuggest [role=option], #locSuggest button'); if (s) await D.click(s);")
beat('p2',
     "await D.click('text=Check this site', {after: 1500}); await D.scrollBy(260, 900); await D.moveTo(1000, 520, 900);", extra=1.0)
beat('p3',
     "await D.click('#sampleBed', {after: 1500}); await D.hover('text=Guild health', 800);", extra=1.0)

# 3. Admin dashboard (~30s)
goto(B + '/login', 1800, (720, 600))
beat('a1',
     "await D.sleep(200); await D.click('text=Fill in', {after: 450}); await D.click('button.hub-button-primary', {after: 100});")
beat('a2',
     "await D.sleep(300); await D.moveTo(360, 380, 700); await D.sleep(500); await D.moveTo(740, 380, 800); await D.sleep(450); await D.moveTo(930, 380, 500); await D.sleep(450); await D.moveTo(1120, 380, 500);")
beat('a3',
     "await D.click('a.nav-link[href=\"#/volunteers\"]', {after: 700}); await D.click('text=At risk', {after: 700}); await D.click('thead input[type=checkbox]', {after: 600}); await D.click('[data-act=bulk-msg][data-channel=email]', {after: 900});", extra=1.2)
beat('a4',
     "await D.click('a.nav-link[href=\"#/funnel\"]', {after: 900}); await D.hover('.callout.leak h3', 800); await D.sleep(700); await D.hover('text=First visit@@.funnel', 900);")
beat('a5',
     "await D.click('a.nav-link[href=\"#/partners\"]', {after: 700}); const b = [...document.querySelectorAll('button.btn.sm[data-act=open-partner]')][1]; await D.click(b, {after: 1000}); await D.hover('.drawer .preview', 900);", extra=2.5)
steps.append({'rec': False})
json.dump(steps, open('take.json', 'w'), indent=1)
print(len(steps), 'steps')
