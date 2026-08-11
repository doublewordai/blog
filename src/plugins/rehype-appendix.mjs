// Back-matter treatment for appendices: an h2 whose text starts with
// "Appendix" gets the class `appendix-start`; CSS in globals.css draws the
// separator and demotes everything after it via sibling selectors, and the
// table of contents applies the same rule to its entries.
import {visit} from 'unist-util-visit'
import {toString} from 'hast-util-to-string'

export function rehypeAppendix() {
  return function (tree) {
    visit(tree, {tagName: 'h2'}, (node) => {
      if (/^appendix\b/i.test(toString(node).trim())) {
        const props = (node.properties ??= {})
        const cls = props.className
        props.className = Array.isArray(cls) ? [...cls, 'appendix-start'] : ['appendix-start']
      }
    })
  }
}
