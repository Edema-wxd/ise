#!/usr/bin/env python3
"""Regenerates the motif block inside components/motif-field.module.css.

The block is embedded as a URL-encoded SVG data URI and used as a CSS mask, so
the pattern takes its colour from a palette token and tiles to fill any box.
Edit the geometry here and re-run:

    python3 scripts/build-motif-block.py
"""

from urllib.parse import quote
import pathlib
import re

# Stroke-only motif geometry, each drawn in a 24x24 cell.
MOTIFS = {
    "mask": '<path d="M12.1 2.8c4.6 0 7 3.1 6.9 8.2-.1 6.2-3.2 10.2-6.9 10.2s-6.9-4-6.8-10.2C5.4 5.9 7.6 2.8 12.1 2.8Z"/><path d="M8.4 10.3h2.6M13.1 10.2h2.6" stroke-width="1.5"/><path d="M12 13.1v4.2"/>',
    "hand": '<path d="M6.4 21.2c-.4-3.4.3-5.9 2.1-7.6"/><path d="M8.6 13.4 7.2 4.1M11.3 12.4 11.8 2.9M14 12.6l2.2-9.2M16.3 14l3.7-7.6"/><path d="M9.1 13.3c3.4-1.4 6.6-1.2 9.6.5"/>',
    "coil": '<path d="M12 12.1a2.3 2.3 0 1 1 2.4 2.2 4.6 4.6 0 0 1-4.8-4.5 7 7 0 0 1 7.1-6.7"/><path d="M12 12.1a2.3 2.3 0 1 0-2.4-2.2"/><path d="M6.8 20.4h10.5"/>',
    "lattice": '<path d="M3.4 9.6 9.7 3.3M3.2 16.1 16.2 3.2M6.6 20.6 20.5 6.7M13.3 20.8 20.7 13.4"/><path d="M3.5 3.4 20.6 20.5" stroke-width=".85"/>',
    "stone": '<path d="M12.1 3.2 20.4 9.4 17.1 20.5H6.9L3.6 9.3Z"/><path d="M12 8.1 15.6 11 14.2 16.2H9.8L8.4 11Z"/>',
    "grain": '<path d="M3.4 20.6c0-9.6 2.9-17.3 6.4-17.3"/><path d="M8.2 20.5c0-8.2 2.5-14.8 5.5-14.8"/><path d="M13.2 20.7c0-6.6 2-11.9 4.4-11.9"/><path d="M18.4 20.6c0-4.5 1-8 2.2-8"/>',
}

CSS = pathlib.Path(__file__).resolve().parent.parent / "components" / "motif-field.module.css"


def block_uri() -> str:
    order = list(MOTIFS)
    cells = []
    # A 4x4 block, stepped by a coprime so the repeat reads on the diagonal the
    # way strip-woven cloth does.
    for row in range(4):
        for col in range(4):
            name = order[(row * 4 + col * 5) % len(order)]
            cells.append(f"<g transform='translate({col * 24} {row * 24})'>{MOTIFS[name]}</g>")

    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96' fill='none' "
        "stroke='#000' stroke-width='1.1' stroke-linecap='round' stroke-linejoin='round'>"
        + "".join(cells)
        + "</svg>"
    ).replace('"', "'")
    # safe="" percent-encodes every reserved character, including the quotes,
    # '#' and '+' that would otherwise break the CSS url() or the data URI.
    return quote(svg, safe="")


def main() -> None:
    css = CSS.read_text()
    uri = block_uri()
    # Both the standard and the -webkit- prefixed declaration carry the block.
    updated, count = re.subn(
        r'(-webkit-)?mask-image: url\("data:image/svg\+xml,[^"]*"\);',
        lambda m: f'{m.group(1) or ""}mask-image: url("data:image/svg+xml,{uri}");',
        css,
    )
    if count != 2:
        raise SystemExit(f"expected two mask-image declarations, found {count}")
    CSS.write_text(updated)
    print(f"updated {CSS}")


if __name__ == "__main__":
    main()
