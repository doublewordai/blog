# Explicit light and dark figures

For figures with different palettes, store the fixed light SVG in the existing
`images[].asset` Sanity reference and the fixed dark SVG in an optional
`images[].darkAsset` reference (both reference `sanity.imageAsset` documents).
Keep filename, alt text, caption and array key unchanged. The post query resolves
both references. The renderer emits the pair; CSS selects one using the existing
`html[data-theme]`, including manual theme changes. The hidden image is excluded
from layout and the accessibility tree. Images without darkAsset are unchanged.

Generate both versions from the theme-aware source assets:

```
python3 scripts/split_svg_themes.py /path/to/themed-images /path/to/fixed-images
python3 -m unittest discover -s scripts -p 'test_*.py'
```

The generator freezes dark media overrides and resolves palette variables, leaving
neither variant dependent on the embedding browser's SVG media-query behaviour.
Upload both variants, then update the two references in a revision-guarded content
mutation. Deploy the optional renderer support before changing existing assets.
