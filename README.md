# Doubleword Blog

A Tufte-inspired blog built with Next.js and Sanity CMS, featuring sidenotes, math rendering, and elegant typography.

---

## For Content Authors

### Editing Content in Sanity Studio

Access the studio at `https://doubleword.sanity.studio/` (or your studio URL).

**Document Types:**
- **post** - Blog posts
- **author** - Author profiles

**Post Fields:**
| Field | Purpose |
|-------|---------|
| title | Post title |
| slug | URL path (e.g., `my-post` → `blog.doubleword.ai/my-post`) |
| publishedAt | Publication date (shown on post and used for ordering) |
| body | Markdown content |
| description | Summary for homepage and SEO meta description |
| authors | Link to author profiles |
| image | Featured image (shown at top of post) |
| images | Upload images, reference by filename in body |
| videoUrl | Embed URL for video (shown above content) |
| externalSource | URL to fetch markdown content from (see below) |
| canonicalUrl | Original source URL for syndicated content |

**Author Fields:**
| Field | Purpose |
|-------|---------|
| name | Display name |
| title | Role/position |
| image | Profile photo |

### Markdown Features

#### Basic Markdown

Standard GitHub-flavored markdown is supported:
- **Bold**, *italic*, ~~strikethrough~~
- [Links](url), `inline code`
- Lists, tables, blockquotes
- Headings (h2 and h3 appear with anchor links)

#### Images

1. Upload image in the "Images" field with a filename (e.g., `diagram.png`)
2. Reference in body: `![Alt text](diagram.png)`

The filename is automatically replaced with the Sanity CDN URL. Alt text and captions from Sanity are used when available.

#### Code Blocks

````markdown
```python
print("Hello, world!")
```
````

Supported languages: javascript, typescript, python, bash, json, jsx, tsx, yaml, shell, go, rust, sql, html, css, markdown, text, plaintext

Code blocks include a copy button on hover and use dual-theme syntax highlighting (light/dark).

#### Sidenotes (Tufte-style)

Sidenotes appear in the margin on large screens and as toggleable popups on mobile.

**Numbered sidenotes:**
```markdown
This is a statement that needs elaboration.[>1]

[>1]: This is the sidenote content. It can include **bold**, *italic*, [links](url), and `code`.
```

**Unnumbered sidenotes (margin notes):**
```markdown
This paragraph has a margin note.[>_note]

[>_note]: Margin notes don't have numbers—they're for tangential information.
```

The syntax is similar to footnotes but uses `>` instead of `^`:
- `[>id]` - numbered sidenote reference
- `[>id]: content` - numbered sidenote definition
- `[>_id]` - unnumbered sidenote reference (note the underscore)
- `[>_id]: content` - unnumbered sidenote definition

Sidenote content supports markdown formatting including bold, italic, links, inline code, and math.

#### Math (KaTeX)

Inline math with single dollar signs:
```markdown
The equation $E = mc^2$ is famous.
```

Display math with double dollar signs:
```markdown
$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

Math also works inside sidenotes.

#### Tables

Standard GitHub-flavored markdown tables:
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
```

### External Content

For posts where the markdown lives elsewhere (e.g., a GitHub repo), use the `externalSource` field:

1. Set `externalSource` to the raw markdown URL (e.g., `https://raw.githubusercontent.com/...`)
2. The blog fetches content from this URL at render time
3. You can still set `body` as a fallback if the external source fails

This is useful for:
- Keeping content in sync with a repository
- Cross-posting content that lives elsewhere
- Syndicated content from other platforms

### Canonical URLs

For syndicated content (content that originally appeared elsewhere), set the `canonicalUrl` field to the original source URL. This ensures search engines know the original source and prevents duplicate content issues.

### Video Embeds

To embed a video at the top of a post:
1. Set the `videoUrl` field to the embed URL (e.g., YouTube embed URL)
2. The video appears above the post content in a responsive 16:9 container

### Publishing Workflow

1. **Edit** content in Sanity Studio
2. **Save** creates a draft
3. **Publish** makes content live and triggers webhook
4. **Site rebuilds** affected pages automatically (usually within seconds)

### Tips

- Use h2 (`##`) and h3 (`###`) for main sections—they get anchor links
- Keep slugs URL-friendly (lowercase, hyphens, no special characters)
- Use the `description` field for better homepage summaries and SEO
- Sidenotes work best for short asides; use regular paragraphs for longer content
- Test math rendering locally before publishing

### Troubleshooting

**Content not updating after publish:**
- Check that the webhook is configured in Sanity
- Verify the revalidation secret matches
- Wait 10-30 seconds for cache to clear

**Images not showing:**
- Make sure filename in body matches exactly (case-sensitive)
- Verify image was uploaded in the Images field

**Sidenotes not appearing:**
- Check that the definition exists: `[>id]: content`
- Make sure the reference uses the same id: `[>id]`
- For unnumbered, both must have underscore: `[>_id]` and `[>_id]:`

**Math not rendering:**
- Check for balanced dollar signs
- Escape special characters if needed
- Display math needs blank lines before and after

---

## For Developers

### Architecture Overview

This is a Next.js 16 application using the App Router with:
- **Static Site Generation (SSG)** - All pages prerendered at build time
- **Sanity CMS** - Headless CMS for content management
- **Webhook-based revalidation** - Content updates trigger automatic page rebuilds
- **Tufte-inspired design** - Sidenotes, elegant typography, warm color palette

### Project Structure

```
blog/
├── src/
│   ├── app/
│   │   ├── [slug]/
│   │   │   └── page.tsx          # Individual post pages
│   │   ├── api/
│   │   │   ├── revalidate/route.ts   # Sanity webhook handler
│   │   │   └── draft-mode/enable/route.ts
│   │   ├── layout.tsx            # Root layout with fonts
│   │   ├── page.tsx              # Homepage with post list
│   │   ├── globals.css           # Tufte-inspired styles
│   │   ├── robots.ts             # Robots.txt generation
│   │   └── sitemap.ts            # Sitemap generation
│   ├── components/
│   │   ├── MarkdownRenderer.tsx  # Markdown processing pipeline
│   │   ├── CopyButton.tsx        # Code block copy button
│   │   ├── ThemeToggle.tsx       # Dark/light mode toggle
│   │   ├── PostLink.tsx          # Post card link with analytics
│   │   ├── PaginationLink.tsx    # Pagination navigation
│   │   └── BackLink.tsx          # Back to home link
│   ├── plugins/
│   │   └── remark-sidenotes.mjs  # Custom sidenote syntax
│   ├── lib/
│   │   └── posthog-server.ts     # Server-side analytics
│   └── sanity/
│       ├── lib/
│       │   ├── client.ts         # Sanity client configuration
│       │   └── queries.ts        # GROQ queries
│       ├── env.ts                # Environment config
│       └── types.ts              # TypeScript types
├── public/
│   └── doubleword-icon.png       # Site icon
├── .env.local                    # Environment variables
├── next.config.ts                # Next.js configuration
└── package.json
```

### Key Systems

#### 1. Content Flow

```
Sanity CMS (edit)
    → Webhook fires on publish
    → /api/revalidate called
    → revalidateTag() purges cache
    → Next request rebuilds page
```

#### 2. Markdown Processing Pipeline

```
Raw Markdown
    → remarkGfm (tables, strikethrough, etc.)
    → remarkMath (math syntax)
    → remarkUnwrapImages (clean image markup)
    → remarkSidenotes (custom sidenote syntax)
    → rehypeSlug (heading IDs)
    → rehypeAutolinkHeadings (clickable headings)
    → rehypeRaw (pass through HTML from sidenotes)
    → rehypeKatex (math rendering)
    → rehypeShiki (syntax highlighting, dual themes)
    → React components (custom img, pre)
```

#### 3. Sidenote System

The custom `remark-sidenotes` plugin:
1. Collects sidenote definitions (`[>id]: content`)
2. Replaces references (`[>id]`) with HTML structure
3. Supports markdown inside sidenotes (links, bold, italic, code, math)

On large screens (xl+), sidenotes float in the right margin. On smaller screens, numbered sidenotes become toggleable popups, and unnumbered ones appear as callout boxes.

#### 4. Theme System

The blog uses CSS custom properties for theming:
- `data-theme="light"` / `data-theme="dark"` on `<html>`
- Theme preference saved to localStorage
- System preference detection as fallback
- Shiki dual-theme syntax highlighting

### Design System

The blog uses a Tufte-inspired design with:
- **Crimson Pro** - Serif body text
- **IBM Plex Sans** - Display headings
- **Source Sans 3** - UI elements
- **JetBrains Mono** - Code

Color palette uses warm tones with a deep red accent (`#a00000` light, `#ff6868` dark).

### Environment Variables

```bash
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_REVALIDATE_SECRET=your-webhook-secret

# Optional: Sanity API token for draft mode
SANITY_API_READ_TOKEN=your-read-token

# Optional: PostHog analytics
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
POSTHOG_API_KEY=your-posthog-api-key
```

### Setting Up Sanity Webhook

1. Go to [Sanity Manage](https://www.sanity.io/manage) → Your Project → API → Webhooks
2. Create webhook:
   - **URL**: `https://blog.doubleword.ai/api/revalidate`
   - **Secret**: Same as `SANITY_REVALIDATE_SECRET`
   - **Trigger on**: Create, Update, Delete
   - **Projection**: `{_type}`

### Development Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding Features

**New remark plugin:**
1. Create plugin in `src/plugins/remark-*.mjs`
2. Add to `remarkPlugins` array in `MarkdownRenderer.tsx`

**New rehype plugin:**
1. Install package or create in `src/plugins/`
2. Add to `rehypePlugins` array in `MarkdownRenderer.tsx`
3. Note: Order matters—`rehypeRaw` must come before plugins that process HTML

**Extending sidenote syntax:**
The sidenote plugin in `src/plugins/remark-sidenotes.mjs` can be extended to support additional inline formatting by adding cases to the content processing loop.

### Analytics

The blog uses PostHog for analytics:
- **Client-side**: Page views, link clicks (via PostLink component)
- **Server-side**: Post view events captured in `[slug]/page.tsx`

Events tracked:
- `post_viewed` - When a post is rendered (server-side)
- Navigation tracking via PostLink and PaginationLink components
