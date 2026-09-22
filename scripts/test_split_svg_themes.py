import unittest
from split_svg_themes import fixed_palette

SVG = '''<svg xmlns="http://www.w3.org/2000/svg"><style>
svg { fill: #000000; }
@media(prefers-color-scheme:dark) { svg {fill:#eeeeee;--figure-0057d9:#75aaff;} }
.box {fill:#cfe4ff;}
@media (prefers-color-scheme: dark) {.box {fill:#143d64;}}
</style><path fill="var(--figure-0057d9, #0057d9)"/></svg>'''

class FixedPaletteTests(unittest.TestCase):
    def test_light_ignores_dark_overrides(self):
        result = fixed_palette(SVG, 'light')
        self.assertIn('fill="#0057d9"', result)
        self.assertNotIn('#143d64', result)
        self.assertNotIn('@media', result)
        self.assertNotIn('var(', result)

    def test_dark_keeps_overrides_and_resolves_attributes(self):
        result = fixed_palette(SVG, 'dark')
        self.assertIn('fill="#75aaff"', result)
        self.assertIn('.box {fill:#143d64;}', result)
        self.assertNotIn('@media', result)
        self.assertNotIn('var(', result)

    def test_unsupported_dynamic_styles_fail(self):
        with self.assertRaises(ValueError):
            fixed_palette(SVG.replace('prefers-color-scheme:dark', 'min-width:600px'), 'dark')

if __name__ == '__main__':
    unittest.main()
