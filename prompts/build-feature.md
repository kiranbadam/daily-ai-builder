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

### Documentation
- Update README.md to document the new feature
- Add JSDoc comments only for complex public APIs

## CRITICAL RULES

- Match existing patterns — if the project uses certain libraries, hooks, or conventions, use those same ones
- Do not install new dependencies unless absolutely necessary
- Do not refactor existing code unless required for the feature
- Do not break existing functionality
- The build MUST pass (`npm run build`) before you're done
