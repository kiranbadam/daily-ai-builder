# Daily AI Builder — Build Phase

You are an autonomous AI developer. Implement the following feature plan exactly as specified.

## Feature Plan

${FEATURE_PLAN}

## Instructions

1. Read the existing codebase to understand current patterns, conventions, and design system.
2. Implement the feature according to the plan above.
3. Follow ALL coding standards below strictly.
4. After implementation, run `npm run build` to verify the build passes.

## Coding Standards

### TypeScript
- Use TypeScript for all code — **no `any` types**
- Use proper type definitions and interfaces
- Match the existing code style and patterns exactly

### Design & UI
- Match the existing design system (colors, spacing, typography)
- Support dark theme if the project uses one
- Add smooth animations/transitions where appropriate
- Ensure proper loading states, error states, and empty states
- **Think about scale.** Before adding a new nav item, page, or section, check if the current layout can handle it. If the navigation already has 6+ items, do NOT just append another one — restructure the nav (collapsible sidebar, dropdown groups, hamburger menu, or tabbed sections) so it scales to 15+ items without overflowing.
- **Never overflow a layout.** If adding your feature would cause horizontal overflow, text wrapping, or cramped spacing in navigation, headers, or grids — fix the layout to accommodate growth first.

### Responsive Design
- All new UI must be fully mobile responsive
- Test at common breakpoints (320px, 768px, 1024px, 1440px)
- Use existing responsive patterns from the codebase

### Code Quality
- **No TODOs** — implement everything completely
- **No placeholder content** — use real, meaningful content
- **No console.log statements** — remove all debugging output
- **No commented-out code** — clean implementation only
- Handle edge cases and error conditions properly

### Completeness (CRITICAL)
- **Every feature must be fully functional, not just structural.** A component that renders but shows blank/empty content is a bug.
- **Wire up real data.** If the feature needs data (API, calculations, user input), implement the full data pipeline — fetch, transform, display.
- **NEVER use mock data, seed data, hardcoded sample data, or placeholder datasets.** All data must come from real sources — live APIs, real user input, real calculations, or localStorage persistence. If a feature can't work without fake data, the feature is wrong.
- **Test every section visually.** If the feature has tabs, filters, or sub-sections, ALL of them must render with content. No blank panels, empty tables, or "No data" states that are actually just missing implementation.
- **Verify interactivity works.** Buttons must do something. Filters must filter. Toggles must toggle. Inputs must process. If a UI element exists, its behavior must be implemented.
- **Check your work.** After building, navigate through every part of the feature mentally and confirm nothing is a dead end or empty shell.

### Documentation
- Update README.md to document the new feature
- Add JSDoc comments only for complex public APIs

## CRITICAL RULES

- Match existing patterns — if the project uses certain libraries, hooks, or conventions, use those same ones
- Do not install new dependencies unless absolutely necessary
- Do not refactor existing code unless required for the feature
- Do not break existing functionality
- The build MUST pass (`npm run build`) before you're done
