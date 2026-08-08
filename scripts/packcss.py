import re, sys

src = open(sys.argv[1]).read()


def mini(block):
    block = re.sub(r"/\*.*?\*/", "", block, flags=re.S)
    block = re.sub(r"\s+", " ", block)
    block = re.sub(r"\s*([{};:,>])\s*", r"\1", block)
    return block.replace(";}", "}").strip()


def replace_blocks(text, start_pat, end_token, keep_delims):
    """Minifie chaque bloc CSS délimité, en sautant ceux qui interpolent."""
    out, i = [], 0
    for m in re.finditer(start_pat, text):
        if m.start() < i:
            continue
        s = m.end()
        try:
            e = text.index(end_token, s)
        except ValueError:
            break
        body = text[s:e]
        if "${" in body:
            continue
        out.append(text[i:s])
        out.append(mini(body))
        i = e
    out.append(text[i:])
    return "".join(out)


# 1) Feuilles de styles Lit : css`...`
m = re.search(r"([A-Za-z_$][\w$]*)`\s*:host\s*\{", src)
tag = m.group(1) if m else None
if tag:
    src = replace_blocks(src, re.escape(tag) + "`", "`", True)

# 2) Blocs <style> écrits dans les templates html (modales détachées).
before = len(src)
src = replace_blocks(src, r"<style>", "</style>", True)
inline_saved = before - len(src)

src = src.replace("\t\n", "\\t\\n")
open(sys.argv[2], "w").write(src)
print(
    f"{sys.argv[2]}: css tag {tag} | inline -{inline_saved} | "
    f"{len(src)} chars | {src.count(chr(10))+1} lines"
)
