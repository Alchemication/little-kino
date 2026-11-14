"""Build the public site: the games, the site's own pages, and the facts they quote.

``build`` copies each game folder and ``site/`` into one folder to publish,
fills the ``{{TOKEN}}`` places in the site's pages from what owns each fact (a
game's code, a world's dossier, ``config``), and renders the research page from
``docs/DESIGN_PRINCIPLES.md`` and each shown game's guide for parents from its
``guide.yaml``. It refuses to publish a page with a token left
unfilled, a fact resting on an unsourced claim, a guide that leaves out
part of its game, a page that asks another site
for anything, a page whose Polish doesn't match the words it marks, or a front
page with more worlds than fit on one screen.
``render_art`` photographs the link preview and the icon from their sources.

Example:
    from website import build
    build(Path("_site"))
"""

from __future__ import annotations

import html
import json
import logging
import re
import shutil
from pathlib import Path

from config import (
    GAMES_DIR,
    GUIDE_NAME,
    REPO_URL,
    SITE_ART_DIR,
    SITE_COUNTRIES,
    SITE_DIR,
    SITE_FACTS,
    SITE_GUIDE_PARTS,
    SITE_ICON_SIZES,
    SITE_MAX_WORLDS,
    SITE_NAME,
    SITE_PREVIEW_SIZE,
    SITE_PRINCIPLES_DOC,
    SITE_URL,
    SITE_WORLDS,
    WORLD_FILE,
    WORLDS_DIR,
)
from schema.common import Status
from schema.guide import Guide
from schema.world import WorldDossier
from worlds import load_model, world_dir

logger = logging.getLogger(__name__)

_TOKEN = re.compile(r"\{\{([A-Za-z_.]+)\}\}")
_OUTSIDE = re.compile(
    r"""<(?:script|img|iframe|link|source|audio|video)\b[^>]*?\b(?:src|href)=["'](?:https?:)?//""",
    re.IGNORECASE,
)
_CARD = re.compile(r'<div class="card">')
_POLISH = re.compile(
    r'<script type="application/json" id="pl">(.*?)</script>', re.DOTALL
)
_TRANSLATED = re.compile(r'\sdata-t(?:-label)?="([\w.-]+)"')
_ASKED = re.compile(r"""\bLang\.t\(['"]([\w.-]+)['"]""")
_MARKER = ".nojekyll"
_CITABLE = {Status.VERIFIED, Status.SOURCED}


class SiteError(Exception):
    """The site can't be built as it stands; the message says what to fix."""


def code_facts(worlds_root: Path = WORLDS_DIR) -> dict[str, str]:
    """Read the figures the pages quote from the game scripts that own them.

    Args:
        worlds_root: Folder holding the worlds.

    Returns:
        Each ``SITE_FACTS`` token with its number in the page's unit, written
        as a person would ("5", not "5.0").

    Raises:
        SiteError: A script is missing or its pattern no longer matches.
    """
    facts: dict[str, str] = {}
    for token, (script, pattern, per) in SITE_FACTS.items():
        path = worlds_root / script
        found = re.search(pattern, path.read_text()) if path.is_file() else None
        if not found:
            raise SiteError(
                f"{token}: no match for {pattern!r} in {path}. The constant "
                "moved or was renamed: update SITE_FACTS in src/config.py."
            )
        facts[token] = f"{int(found.group(1)) / per:g}"
    return facts


def world_facts(world_id: str, worlds_root: Path = WORLDS_DIR) -> dict[str, str]:
    """Read what the pages say about a cartoon from its dossier.

    Only typed fields and the first credit are used, and the credit only when
    its claim is ``verified`` or ``sourced``: the site states nothing about an
    original work that the research doesn't stand behind.

    Args:
        world_id: The world's id.
        worlds_root: Folder holding the worlds.

    Returns:
        Tokens ``<world>.title``, ``.title_en``, ``.country`` (and
        ``.country_pl``), ``.years`` and ``.creator`` with their values.

    Raises:
        SiteError: A field the pages need is missing or not citable.
    """
    dossier = load_model(world_dir(world_id, worlds_root) / WORLD_FILE, WorldDossier)
    made = dossier.production
    if made.first_year is None or made.last_year is None:
        raise SiteError(
            f"{world_id}: the site quotes its years; set production.first_year "
            "and last_year in its world.yaml."
        )
    if dossier.country not in SITE_COUNTRIES:
        raise SiteError(
            f"{world_id}: no wording for country {dossier.country!r}; add it "
            "to SITE_COUNTRIES in src/config.py."
        )
    if not made.credits or made.credits[0].claim.status not in _CITABLE:
        raise SiteError(
            f"{world_id}: the site names its creator, the first production "
            "credit in world.yaml, which must be verified or sourced."
        )
    return {
        f"{world_id}.title": dossier.title,
        f"{world_id}.title_en": dossier.title_en or dossier.title,
        f"{world_id}.country": SITE_COUNTRIES[dossier.country][0],
        f"{world_id}.country_pl": SITE_COUNTRIES[dossier.country][1],
        f"{world_id}.years": f"{made.first_year}–{made.last_year}",
        f"{world_id}.creator": made.credits[0].name,
    }


def research_body(doc: Path = SITE_PRINCIPLES_DOC) -> str:
    """Render the design principles and their research as the research page's body.

    Links to other files in the repository point at the public repository, so
    none leads to a page the site doesn't have.

    Args:
        doc: The Markdown file to render.

    Returns:
        The document as HTML, without a page around it.
    """
    from markdown_it import MarkdownIt

    html = MarkdownIt("commonmark").render(doc.read_text())
    return re.sub(
        r'href="(?!https?://|#|mailto:)([^"]+)"',
        lambda m: f'href="{REPO_URL}/blob/main/docs/{m.group(1)}"',
        html,
    )


def game_parts(world_id: str, worlds_root: Path = WORLDS_DIR) -> set[str]:
    """Find what a shown world's game brings only some days or in one season.

    Args:
        world_id: A world in ``SITE_WORLDS`` and ``SITE_GUIDE_PARTS``.
        worlds_root: Folder holding the worlds.

    Returns:
        The names of its parts, as its scripts name them.

    Raises:
        SiteError: The world has no entry, or a pattern finds nothing.
    """
    if world_id not in SITE_GUIDE_PARTS:
        raise SiteError(
            f"{world_id}: SITE_GUIDE_PARTS in src/config.py doesn't say where its "
            "game lists what comes some days. Add it, so its guide can be checked."
        )
    game = world_dir(world_id, worlds_root) / GAMES_DIR / SITE_WORLDS[world_id] / "game"
    names: set[str] = set()
    for glob, pattern in SITE_GUIDE_PARTS[world_id]:
        found = [
            m
            for f in sorted(game.glob(glob))
            for m in re.findall(pattern, f.read_text())
        ]
        if not found:
            raise SiteError(
                f"{world_id}: nothing in {glob} matches {pattern!r}; it moved or was "
                "renamed: update SITE_GUIDE_PARTS in src/config.py."
            )
        for text in found:
            if text.startswith("{"):
                names.update(re.findall(r"(\w+)\s*:", text))
            elif text.startswith("["):
                names.update(re.findall(r"'(\w+)'", text))
            else:
                names.add(text)
    return names


def guide(world_id: str, worlds_root: Path = WORLDS_DIR) -> tuple[str, str]:
    """Render a shown world's guide for parents, once in each language.

    Args:
        world_id: A world in ``SITE_WORLDS``.
        worlds_root: Folder holding the worlds.

    Returns:
        The guide as HTML in English, and in Polish.

    Raises:
        SiteError: The game has no guide, the guide leaves out one of the
            parts its game brings some days, or names one its game doesn't have.
    """
    folder = world_dir(world_id, worlds_root) / GAMES_DIR / SITE_WORLDS[world_id]
    path = folder / GUIDE_NAME
    if not path.is_file():
        raise SiteError(
            f"{world_id}: no guide for parents at {path}. Write one "
            "(schema.guide.Guide); the grown-ups' page shows it under the world."
        )
    model = load_model(path, Guide)
    left_out = sorted(game_parts(world_id, worlds_root) - model.covered())
    if left_out:
        raise SiteError(
            f"{path}: nothing covers {', '.join(left_out)}. Add a line a parent "
            "would read (or add the name to a line's covers), so the guide keeps up."
        )
    scripts = " ".join(f.read_text() for f in (folder / "game").glob("*.js"))
    unknown = sorted(n for n in model.covered() if not re.search(rf"\b{n}\b", scripts))
    if unknown:
        raise SiteError(
            f"{path}: covers {', '.join(unknown)}, which its game's scripts never "
            "name. Fix the name, or take the line out if the part is gone."
        )

    def render(lang: str) -> str:
        parts = []
        for section in model.sections:
            items = "".join(
                f"<li>{html.escape(getattr(line, lang), quote=False)}</li>"
                for line in section.lines
            )
            heading = html.escape(getattr(section.heading, lang), quote=False)
            parts.append(f"<h4>{heading}</h4><ul>{items}</ul>")
        return "".join(parts)

    return render("en"), render("pl")


def tokens(worlds_root: Path = WORLDS_DIR) -> dict[str, str]:
    """Gather every value a page may ask for.

    Args:
        worlds_root: Folder holding the worlds.

    Returns:
        Token names with their values: the site's addresses, the code's
        figures, each shown world's facts and guide (``<world>.guide``, and
        ``<world>.guide_pl`` escaped to sit in the Polish block's JSON), and
        the research page's body.
    """
    values = {
        "SITE_URL": SITE_URL,
        "REPO_URL": REPO_URL,
        "RESEARCH_BODY": research_body(),
    }
    values.update(code_facts(worlds_root))
    for world_id in SITE_WORLDS:
        values.update(world_facts(world_id, worlds_root))
        english, polish = guide(world_id, worlds_root)
        values[f"{world_id}.guide"] = english
        values[f"{world_id}.guide_pl"] = json.dumps(polish, ensure_ascii=False)[1:-1]
    return values


def fill(page: str, values: dict[str, str], name: str) -> str:
    """Fill a page's ``{{TOKEN}}`` places.

    Args:
        page: The page as written.
        values: Token names with their values.
        name: The page's file name, for the error.

    Returns:
        The page with every token replaced.

    Raises:
        SiteError: The page asks for a token nothing provides.
    """
    unknown = sorted({t for t in _TOKEN.findall(page) if t not in values})
    if unknown:
        raise SiteError(
            f"{name}: nothing fills {', '.join('{{' + t + '}}' for t in unknown)}. "
            "Fix the name, or provide it in src/website.py tokens()."
        )
    return _TOKEN.sub(lambda m: values[m.group(1)], page)


def check_front_page(site_dir: Path = SITE_DIR) -> None:
    """Check the front page shows the worlds it should, and no more than fit.

    Args:
        site_dir: The site's source folder.

    Raises:
        SiteError: A world has no card, or there are too many.
    """
    front = (site_dir / "index.html").read_text()
    if (
        len(SITE_WORLDS) > SITE_MAX_WORLDS
        or len(_CARD.findall(front)) > SITE_MAX_WORLDS
    ):
        raise SiteError(
            f"The front page holds at most {SITE_MAX_WORLDS} worlds, on one "
            "screen with nothing to scroll. Take one out before adding another."
        )
    for world_id, game in SITE_WORLDS.items():
        if not (site_dir / f"{world_id}.html").is_file():
            raise SiteError(f"{world_id}: no card page site/{world_id}.html.")
        if f'src="{world_id}.html"' not in front or f"{world_id}/{game}/" not in front:
            raise SiteError(
                f"{world_id}: site/index.html has no card opening {world_id}/{game}/."
            )


def check_page(page: str, name: str) -> None:
    """Check a built page is fit to publish.

    Args:
        page: The built page.
        name: Its file name, for the error.

    Raises:
        SiteError: It doesn't carry the site's name, or loads something from
            another site (the pages promise parents they ask for nothing).
    """
    title = re.search(r"<title[^>]*>(.*?)</title>", page, re.DOTALL)
    if not title or SITE_NAME not in title.group(1):
        raise SiteError(f"{name}: its <title> must carry the name, {SITE_NAME!r}.")
    if _OUTSIDE.search(page):
        raise SiteError(
            f"{name}: loads something from another site. Keep a copy under "
            "site/assets/ instead; the pages ask no one else for anything."
        )


def check_polish(page: str, name: str) -> None:
    """Check a built page has Polish for every word it marks, and no more.

    A page marks what is translated with ``data-t`` (content) or
    ``data-t-label`` (aria-label and title), or asks for it in its script with
    ``Lang.t('key', …)``; its Polish is the JSON block ``id="pl"``
    (``site/assets/lang.js``).

    Args:
        page: The built page, its tokens filled.
        name: Its file name, for the error.

    Raises:
        SiteError: A key has no Polish, the Polish has a key nothing uses, a
            string is empty, the block isn't JSON, or the page has no switch.
    """
    wanted = set(_TRANSLATED.findall(page)) | set(_ASKED.findall(page))
    block = _POLISH.search(page)
    if not wanted and not block:
        return
    if not block:
        raise SiteError(
            f"{name}: marks words to translate but has no Polish. Add a "
            '<script type="application/json" id="pl"> block with a string for each.'
        )
    try:
        polish = json.loads(block.group(1))
    except json.JSONDecodeError as exc:
        raise SiteError(
            f"{name}: its Polish isn't valid JSON once filled in ({exc}). A "
            "string may hold a bare double quote: use single ones in its HTML."
        ) from exc
    missing = sorted(wanted - polish.keys())
    unused = sorted(polish.keys() - wanted)
    empty = sorted(k for k, v in polish.items() if not str(v).strip())
    if missing:
        raise SiteError(f"{name}: no Polish for {', '.join(missing)}. Add it.")
    if unused:
        raise SiteError(
            f"{name}: Polish for {', '.join(unused)}, which nothing on the page "
            "uses. Remove it, or mark the element with data-t."
        )
    if empty:
        raise SiteError(f"{name}: empty Polish for {', '.join(empty)}.")
    if 'class="langs' not in page:
        raise SiteError(f"{name}: has Polish but no language switch to reach it.")


def build(
    out: Path, site_dir: Path = SITE_DIR, worlds_root: Path = WORLDS_DIR
) -> list[Path]:
    """Build the site into a folder, replacing what an earlier build left there.

    Each ``worlds/<world>/games/<game>/game/`` goes to ``<world>/<game>/`` as it
    is (``main.py replay`` maps a report saved on the site back to that folder),
    and ``site/`` to the top, its pages filled in and checked. Nothing else is
    published: no research files, no media.

    Args:
        out: Folder to build into. Created if missing; emptied first if it
            holds an earlier build.
        site_dir: The site's source folder.
        worlds_root: Folder holding the worlds.

    Returns:
        The site's own pages as built, in name order.

    Raises:
        SiteError: The site isn't fit to publish, or ``out`` holds something
            that isn't an earlier build.
    """
    if out.exists() and any(out.iterdir()) and not (out / _MARKER).exists():
        raise SiteError(
            f"{out} has files that aren't an earlier build of the site. "
            "Build into an empty folder, or remove them yourself."
        )
    check_front_page(site_dir)
    values = tokens(worlds_root)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    (out / _MARKER).touch()

    for game in sorted(worlds_root.glob(f"*/{GAMES_DIR}/*/game")):
        world_id, name = game.parts[-4], game.parts[-2]
        shutil.copytree(game, out / world_id / name)

    shutil.copytree(
        site_dir, out, dirs_exist_ok=True, ignore=shutil.ignore_patterns(SITE_ART_DIR)
    )
    pages = sorted(out.glob("*.html"))
    for path in pages:
        page = fill(path.read_text(), values, path.name)
        if path.stem not in SITE_WORLDS:  # a card is a picture, drawn by its game
            check_page(page, path.name)
            check_polish(page, path.name)
        path.write_text(page)
    logger.info("built %d pages and the games into %s", len(pages), out)
    return pages


def render_art(site_dir: Path = SITE_DIR) -> list[Path]:
    """Photograph the link preview and the icon from their sources.

    ``site/art/preview.html`` becomes ``assets/og-image.png`` and
    ``site/art/icon.html`` the icons, in the installed Chrome. Run it after
    changing either source, the name or the palette, and commit the pictures.

    Args:
        site_dir: The site's source folder.

    Returns:
        The pictures written.
    """
    from playwright.sync_api import sync_playwright

    art, assets = site_dir / SITE_ART_DIR, site_dir / "assets"
    written: list[Path] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        shots = [("preview.html", SITE_PREVIEW_SIZE, "og-image.png")]
        shots += [("icon.html", (n, n), f"icon-{n}.png") for n in SITE_ICON_SIZES]
        for source, (width, height), name in shots:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.goto((art / source).as_uri())
            page.evaluate("document.fonts.ready")
            page.screenshot(path=str(assets / name))
            page.close()
            written.append(assets / name)
        browser.close()
    return written
