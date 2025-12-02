## Marmalade Frontend Instructions

Use this guide whenever you touch the client bundle so we keep the feature-first + atomic structure consistent.

### Page Composition

- Keep `src/features/<feature>/pages/*` as _thin shells_ that only orchestrate layout. Never drop raw markup there—import organisms instead.
- Place reusable UI for a feature under `src/shared/components/{atoms|molecules|organisms}/<feature>/`. Example: the landing page now stitches together `HeroSection`, `AboutSection`, `FeatureSection`, `HowItWorksSection`, `InspirationSection`, `SupportSection`, and `CallToActionSection` from `shared/components/organisms/home/`.
- When you add a new section to a page, create a new organism in the shared tree, then render it inside the page shell. This keeps routing-focused files small and predictable.

### Icons & Visuals

- Prefer the Phosphor React icon set (`@phosphor-icons/react`) everywhere. No inline SVG blobs—import the icon component and tweak `size`/`weight` props.
- If an icon does not exist in Phosphor, wrap any custom SVG inside a shared atom (e.g., `IconCat`) and reuse it from there.

### Layout & Routing

- Public pages automatically render inside `PublicLayout` via the router (`app/router/route.tsx`). Do **not** wrap individual page elements with the layout manually.
- If you need another layout (e.g., for authenticated routes), mirror the same parent-route-with-`Outlet` pattern.

### Styling Conventions

- Always use the `@/` alias for imports; no deep relative paths.
- Stick to Tailwind v4 utilities + CSS variables already defined (e.g., `bg-card`, `text-foreground`). Avoid inline styles unless unavoidable.
- When composing class names dynamically, use the shared `cn` helper.
- Use the existing `Button` variants (`primary`, `secondary`, etc.) instead of hand-rolling palette classes. Reserve per-instance classes for layout tweaks (width, spacing, motion) so color/contrast stays consistent.

### Adding New Sections (Example Workflow)

1. Create `shared/components/organisms/<feature>/<section>.tsx` with its own copy + layout.
2. Use atoms/molecules (e.g., `Button`, `Logo`) instead of redefining primitives.
3. Replace the old markup in the page file with `<SectionComponent />`.
4. Ensure any lists/map data is colocated inside the organism to keep the page lean.

Following the Home page refactor ensures future contributors know exactly where to look and keeps design tokens consistent across the app.
