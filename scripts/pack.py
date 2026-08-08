import re

src = open("dist/acd-cards.js").read()
m = re.search(r"const tokens = ([A-Za-z_$][\w$]*)`", src)
tag = m.group(1) if m else "css"

def minify_css(block):
    block = re.sub(r"/\*.*?\*/", "", block, flags=re.S)
    block = re.sub(r"\s+", " ", block)
    block = re.sub(r"\s*([{};:,>])\s*", r"\1", block)
    return block.replace(";}", "}").strip()

out, i = [], 0
for mm in re.finditer(re.escape(tag) + "`", src):
    if mm.start() < i:
        continue
    start = mm.end()
    end = src.index("`", start)
    body = src[start:end]
    if "${" in body:
        continue
    out.append(src[i:start]); out.append(minify_css(body)); i = end
out.append(src[i:])
src = "".join(out)
open("dist/acd-cards.packed.js", "w").write(src)
print("css tag:", tag, "| packed", len(src))
