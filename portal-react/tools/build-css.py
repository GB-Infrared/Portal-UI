"""Generate this app's stylesheets from the HTML design prototypes.

    npm run build:css

Writes into src/styles/:
  tokens.css          - the :root light + dark blocks (identical in both files)
  base.css            - reset / scrollbar / element defaults
  page-home.css       - every home rule, scoped under .page-home
  page-monitoring.css - every monitoring rule, scoped under .page-monitoring

Page rules are scoped because several classes (.kpi, .field, .pill, .rail)
mean different things on the two pages and would otherwise collide.

home.html and monitoring.html are the design source of truth: the design is
changed there, then this carries the CSS across. They are looked for beside the
app and in any folder next to it, so they can be filed wherever suits - set
ENEROPS_DESIGN_DIR to point somewhere else entirely.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))          # portal/tools
APP = os.path.dirname(HERE)                                # portal
ROOT = os.path.dirname(APP)
OUT = os.path.join(APP, 'src', 'styles')
os.makedirs(OUT, exist_ok=True)

WANTED = ('home.html', 'monitoring.html')


def find_design_dir():
    """The prototypes are the designer's files, so they move around. Look beside
    the app first, then in each folder next to it, rather than pinning a path."""
    override = os.environ.get('ENEROPS_DESIGN_DIR')
    if override:
        return override
    candidates = [ROOT]
    try:
        for name in sorted(os.listdir(ROOT)):
            full = os.path.join(ROOT, name)
            if os.path.isdir(full) and full != APP and not name.startswith('.'):
                candidates.append(full)
    except OSError:
        pass
    for c in candidates:
        if all(os.path.exists(os.path.join(c, f)) for f in WANTED):
            return c
    return ROOT


SRC = find_design_dir()

MISSING = """Cannot find the design files.

  searched: %s and each folder beside it
  wanted:   home.html, monitoring.html

Those two HTML prototypes are the source this stylesheet is generated from.
If you only received the React app, you do not need this script at all -
src/styles/ is already generated and committed. Otherwise point
ENEROPS_DESIGN_DIR at the folder holding the prototypes."""

GLOBAL_PREFIXES = ('html', 'body', '*', ':root', '::-webkit', '@')
LEADING_COMMENTS = re.compile(r'^((?:\s*/\*.*?\*/)*)\s*(.*)$', re.S)

# The prototype addresses chart parts by element id. React renders the same
# parts from data, so the ids are renamed to the classes the components use.
RENAME = {
    '#nowl': '.nowline',   '#pw-now': '.nowline',
    '#xh': '.xhair',       '#pw-xh': '.xhair',
    '#nowtag': '.nowtag',  '#nowtxt': '.nowtag text',
    '#dropm': '.annot',
    '#garc': '.garc',      '#gpct': '.gpct',
}

# These bind a colour to one specific device (INV06 green, INV07 blue). The
# React charts take the colour from the series instead, so the rule has nothing
# generic left to say — the components set the same var() tokens inline, which
# keeps them following the theme.
DROP = ('#g6 ', '#g7 ', '#gpw ', '#gpwb ', '#l06', '#l07',
        '#d06', '#d07', '#pw-line', '#pw-ir', '#pw-dot')


def css_of(path):
    full = os.path.join(SRC, path)
    if not os.path.exists(full):
        sys.exit(MISSING % SRC)
    s = io.open(full, encoding='utf-8').read()
    return s[s.index('<style>') + 7:s.index('</style>')]


def split_head(head):
    """Separate any leading comments from the actual selector / at-rule."""
    m = LEADING_COMMENTS.match(head)
    return m.group(1).strip(), m.group(2).strip()


def split_blocks(css):
    out, depth, buf, i = [], 0, '', 0
    while i < len(css):
        ch = css[i]
        if ch == '{' and depth == 0:
            head = buf
            buf = ''
            d, j = 1, i + 1
            while j < len(css) and d:
                if css[j] == '{':
                    d += 1
                elif css[j] == '}':
                    d -= 1
                j += 1
            out.append((head, css[i + 1:j - 1]))
            i = j
            continue
        buf += ch
        i += 1
    return out


def retarget(one):
    """Apply the id -> class renames. Returns None if the rule should be dropped."""
    if any(one.startswith(d) for d in DROP):
        return None
    for old, new in RENAME.items():
        if one == old or one.startswith(old + ' ') or one.startswith(old + ':'):
            return new + one[len(old):]
    return one


def prefix_selectors(sel, scope):
    parts = []
    for one in sel.split(','):
        one = one.strip()
        if not one:
            continue
        one = retarget(one)
        if one is None:
            continue
        parts.append(one if one.startswith(GLOBAL_PREFIXES) else scope + ' ' + one)
    return ', '.join(parts)


def scope_css(css, scope):
    out = []
    for raw_head, body in split_blocks(css):
        comments, head = split_head(raw_head)
        pre = (comments + '\n') if comments else ''
        if head.startswith('@keyframes'):
            out.append(pre + head + '{' + body + '}')
        elif head.startswith('@media') or head.startswith('@supports'):
            inner = []
            for rh, rb in split_blocks(body):
                c2, h2 = split_head(rh)
                sel2 = prefix_selectors(h2, scope)
                if not sel2:
                    continue
                inner.append(((c2 + '\n') if c2 else '') + sel2 + '{' + rb.strip() + '}')
            if inner:
                out.append(pre + head + '{\n' + '\n'.join(inner) + '\n}')
        elif head.startswith(':root'):
            continue                       # tokens live in their own file
        else:
            sel = prefix_selectors(head, scope)
            if not sel:
                continue                   # every part of this rule was dropped
            out.append(pre + sel + '{' + body.strip() + '}')
    return '\n'.join(out)


def extract_tokens(css):
    blocks = []
    for raw_head, body in split_blocks(css):
        comments, head = split_head(raw_head)
        if head.startswith(':root'):
            blocks.append(((comments + '\n') if comments else '') + head + '{' + body.rstrip() + '\n}')
    return '\n'.join(blocks)


mon = css_of('monitoring.html')
home = css_of('home.html')

io.open(os.path.join(OUT, 'tokens.css'), 'w', encoding='utf-8').write(
    '/* Design tokens - the single source of colour for both pages.\n'
    '   Ported verbatim from monitoring.html. */\n' + extract_tokens(mon) + '\n')

BASE = """/* element defaults, shared by both pages */
*{margin:0;padding:0;box-sizing:border-box}
html{scrollbar-color:var(--line-hi) transparent}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px;line-height:1.45;
     -webkit-font-smoothing:antialiased}
::-webkit-scrollbar{height:8px;width:8px}
::-webkit-scrollbar-thumb{background:var(--line-hi);border-radius:8px}
::-webkit-scrollbar-track{background:transparent}
button{font-family:inherit;cursor:pointer}
a{color:inherit;text-decoration:none}
"""
io.open(os.path.join(OUT, 'base.css'), 'w', encoding='utf-8').write(BASE)

io.open(os.path.join(OUT, 'page-monitoring.css'), 'w', encoding='utf-8').write(
    '/* Ported from monitoring.html - scoped so .kpi/.field/.pill/.rail do not\n'
    '   collide with the home page, where they mean different things. */\n'
    + scope_css(mon, '.page-monitoring') + '\n')

io.open(os.path.join(OUT, 'page-home.css'), 'w', encoding='utf-8').write(
    '/* Ported from home.html - see note in page-monitoring.css about scoping. */\n'
    + scope_css(home, '.page-home') + '\n')

for f in ['tokens.css', 'base.css', 'page-home.css', 'page-monitoring.css']:
    t = io.open(os.path.join(OUT, f), encoding='utf-8').read()
    ok = 'OK' if t.count('{') == t.count('}') else 'BRACE MISMATCH'
    print('%-22s %6d bytes  %s' % (f, len(t), ok))
