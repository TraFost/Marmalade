## Marmalade Frontend Instructions

Use this guide whenever you touch the client bundle to maintain the feature-first + atomic structure. The codebase follows React 19, Vite, Tailwind CSS v4, and shadcn/ui principles for consistency.

### Overview

- **Monorepo Structure**: Client is part of a pnpm workspace with shared types from `shared/`.
- **Feature-Based Organization**: Each feature (e.g., `welcome`, `home`, `auth`) has its own folder under `src/features/` with `pages/`, `hooks/`, `services/`, and `types/`.
- **Shared Components**: Reusable UI lives in `src/shared/components/` divided into `atoms/` (primitives like Button), `molecules/` (composites like Navbar), and `organisms/` (full sections like onboarding steps).
- **Routing**: Uses React Router with layouts (`PublicLayout`, `AuthLayout`, `PrivateLayout`) wrapping feature pages.
- **Styling**: Tailwind v4 with CSS variables for theming; use `@/` alias for imports.

### Page Composition

- Keep `src/features/<feature>/pages/*` as thin shells that orchestrate layout and state. Never add raw markup—import organisms instead.
- Example: `home.page.tsx` stitches together multiple organisms like `HeroSection`, `AboutSection`, etc., from `shared/components/organisms/home/`.
- For complex flows like onboarding, the page manages state and validation, delegating UI to step organisms under `shared/components/organisms/onboarding/steps/`.
- When adding a new page, create it in the feature's `pages/` and ensure it uses shared organisms for reusability.

### Component Hierarchy

- **Atoms**: Basic building blocks (e.g., `Button`, `Input`, `Logo`). Always use these instead of raw HTML elements.
- **Molecules**: Small composites (e.g., `Navbar`, `Footer`). Combine atoms for common patterns.
- **Organisms**: Feature-specific sections (e.g., onboarding steps, home sections). These can contain state and logic but should be reusable.
- Onboarding example: `OnboardingTile` and `OnboardingScaleButton` are primitives in `onboarding-primitives.tsx`, built on top of the `Button` atom for consistent behavior.

### Icons & Visuals

- Prefer `@phosphor-icons/react` for all icons. Import components like `ArrowRightIcon` and adjust `size`/`weight` props.
- No inline SVGs—wrap custom ones in shared atoms if needed.
- Example: Onboarding uses `CaretLeftIcon` and `ArrowRightIcon` for navigation.

### Layout & Routing

- Public pages render inside `PublicLayout` via `app/router/route.tsx`. Do not manually wrap pages with layouts.
- Authenticated routes use `AuthLayout` or `PrivateLayout` with `Outlet` for nested routing.
- Layouts handle global concerns like headers/footers; pages focus on content.

### Styling Conventions

- Always use `@/` alias for imports (e.g., `@/shared/components/atoms/button`); no relative paths like `../../../`.
- Use Tailwind v4 utilities and predefined CSS variables (e.g., `bg-card`, `text-foreground`). Avoid inline styles.
- For dynamic classes, use the `cn` helper from `@/shared/lib/helper/classname`.
- Leverage `Button` variants (`primary`, `secondary`, `ghost`, etc.) for consistency. Customize only layout (spacing, size) via `className`.
- Onboarding primitives override `Button` styles for specific looks while inheriting base behavior.

### Types & Shared Code

- Feature-specific types in `src/features/<feature>/types/`.
- Shared types (e.g., state mapping graph/signals) in `shared/src/types/`, imported as `import type { StateMappingUpsertRequest } from "shared"`.
- Hooks in `src/shared/hooks/` for cross-feature logic (e.g., `use-auth.hook.ts`).
- Local hooks in `src/features/<feature>/hooks/` for feature-specific logic.
- Library code in `src/shared/lib/` (e.g., `api-client/`, `helper/`).
- Internal Services in `src/features/<feature>/services/` for API calls and business logic.
- Configs in `src/shared/config/` (e.g., env).

### Adding New Features/Sections

1. For a new page: Create `src/features/<feature>/pages/new.page.tsx` as a thin shell importing organisms.
2. For a new organism: Add `src/shared/components/organisms/<feature>/new-section.tsx`, using atoms/molecules and colocating data/logic.
3. For new atoms/molecules: Place in `src/shared/components/atoms/` or `molecules/`, ensuring they use `cn` and Tailwind.
4. Update routing in `app/router/` if needed.
5. Example: Adding an onboarding step involves creating a new step component in `shared/components/organisms/onboarding/steps/`, updating `STEP_DEFINITIONS` in the page, and ensuring types align with `shared/components/organisms/onboarding/onboarding.types.ts`.

### Best Practices

- Keep components small and focused; prefer composition over large monolithic components.
- Reuse shared components to maintain consistency.
- Follow naming conventions: `<feature>-<component-type>.tsx` (e.g., `onboarding-tile.tsx`).
- Write clear, concise types and leverage shared types wherever possible.
- Document complex logic in hooks and services for maintainability.
- Don't use magic numbers or hardcoded strings; use constants or enums from shared types.

### React Query Services & Hooks (pattern to follow)

- Services live in `src/features/<feature>/services/` (e.g., `api.onboarding.ts`), and should unwrap backend `ResponseWithData` so hooks return clean data shapes.
- Queries/mutations live in `src/features/<feature>/hooks/` (e.g., `use-query.onboarding.ts`, `use-mutation.onboarding.ts`) and must use the shared `queryKeys` factory (`@/shared/lib/react-query/query-keys.lib.ts`).
- Every mutation must be optimistic: use `onMutate` to snapshot and update cache, `onError` to roll back, and `onSettled` to call the relevant central invalidation helper (see `invalidations.service.ts`). Keep list + detail caches in sync.
- Follow the pattern in `.github/hook-example.md` for structure: service functions + hooks in one module, keepPreviousData, enabled flags for dependent queries, infinite query pagination, and cache updates via `queryClient.setQueryData`.
- For onboarding/state-mapping, use `POST /state-mapping/upsert` and invalidate `queryKeys.stateMapping.graph()`; prefer a single upsert mutation over step-specific backend resources.
