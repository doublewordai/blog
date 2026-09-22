"""Freeze the blog's theme-aware SVGs into explicit light/dark assets.

Usage: python3 scripts/split_svg_themes.py INPUT_DIRECTORY OUTPUT_DIRECTORY
Supports the root --figure-* palette variables and dark media rules produced by
our figure generator. Fails on unsupported media rules or unresolved variables.
"""
import re
import sys
from pathlib import Path
import xml.etree.ElementTree as ET


def fixed_palette(source: str, theme: str) -> str:
    assert theme in ('light', 'dark')
    while match := re.search(r'@media\s*\(prefers-color-scheme:\s*dark\)\s*\{', source):
        depth, end = 1, match.end()
        while depth and end < len(source):
            depth += (source[end] == '{') - (source[end] == '}')
            end += 1
        if depth:
            raise ValueError('Unbalanced media rule')
        inner = source[match.end():end-1] if theme == 'dark' else ''
        source = source[:match.start()] + inner + source[end:]
    if '@media' in source:
        raise ValueError('Unsupported media rule')
    variables = dict(re.findall(r'(--figure-[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;', source))
    source = re.sub(r'var\((--figure-[\w-]+),\s*(#[0-9a-fA-F]{6})\)',
                    lambda m: variables.get(m[1], m[2]), source)
    source = re.sub(r'--figure-[\w-]+\s*:\s*#[0-9a-fA-F]{6}\s*;', '', source)
    if 'var(' in source or 'prefers-color-scheme' in source:
        raise ValueError('Unresolved theme-dependent styling')
    ET.fromstring(source)
    return source


if __name__ == '__main__':
    source_dir, output_dir = map(Path, sys.argv[1:])
    for path in sorted(source_dir.glob('*.svg')):
        for theme in ('light', 'dark'):
            target = output_dir / theme / path.name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(fixed_palette(path.read_text(), theme))
        print(path.name)
