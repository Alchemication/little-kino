"""A game's guide for parents: what a day there can hold, in English and Polish.

Stored at ``worlds/<id>/games/<game>/guide.yaml`` and rendered by ``main.py
site`` into a collapsed section under the world's entry on the grown-ups'
page. It is a representative picture, not a catalogue: what is always there,
what comes some days, the weather and seasons, and every moment that might
worry a small child, with how it ends. Each line names the game's parts it
speaks for (``covers``), so the build can refuse a guide that has fallen
behind the game (``config.SITE_GUIDE_PARTS``).

Example:
    guide = Guide.model_validate(yaml.safe_load(path.read_text()))
"""

from __future__ import annotations

from pydantic import Field

from schema.common import Model


class Words(Model):
    """The same words in both of the site's languages."""

    en: str = Field(min_length=1)
    pl: str = Field(min_length=1)


class Line(Words):
    """One line a parent reads, and the game's parts it speaks for."""

    covers: list[str] = Field(
        default_factory=list,
        description="Names of the game's parts this line describes, as its "
        "scripts name them (a prop, an encounter, a creature).",
    )


class Section(Model):
    """A heading and its lines."""

    heading: Words
    lines: list[Line] = Field(min_length=1)


class Guide(Model):
    """What a day in one game can hold, as the grown-ups' page shows it."""

    sections: list[Section] = Field(min_length=1)

    def covered(self) -> set[str]:
        """Every part some line speaks for."""
        return {name for s in self.sections for line in s.lines for name in line.covers}
