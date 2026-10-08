"""Fill the *.tmpl.html templates with the logo paths from the site code -> *.html (git-ignored).
Run from anywhere: python brand/motion/build.py"""
import glob, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "../../web/src/components/brand/Logo.tsx")).read()
g = lambda n: re.search(n + r' =\s*"([^"]+)"', src).group(1)
gate = g("GATE"); arch, road = gate.split(" M", 1); road = "M" + road
letters = "".join(f'<path class="L" d="{d}"/>' for d in json.load(open(os.path.join(HERE, "tools/letters.json"))))
for t in glob.glob(os.path.join(HERE, "*.tmpl.html")):
    h = open(t).read()
    for k, v in {"__GATE__": gate, "__WORD__": g("WORD"), "__ARCH__": arch, "__ROAD__": road, "__LETTERS__": letters}.items():
        h = h.replace(k, v)
    open(t.replace(".tmpl", ""), "w").write(h)
print("ok")
