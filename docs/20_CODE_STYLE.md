# Code Style

## Naming

- Function: `camelCase`
- Variable: `camelCase`
- React Component: `PascalCase`
- Type/Interface: `PascalCase`
- Constant: `UPPER_SNAKE_CASE`
- Folder: `kebab-case`
- File component: `PascalCase.tsx`
- File utility/hook/service: `kebab-case.ts`

## TypeScript

- Do not use `any`.
- Prefer explicit request/response types.
- Use `unknown` for unsafe external data, then validate with Zod.

## Frontend

- Components use `PascalCase`.
- Hooks start with `use`.
- Form validation uses Zod.
- API response types follow `17_API_CONTRACT.md`.

## Backend

- Handler names end with `Handler`.
- Service names end with `Service`.
- Repository names end with `Repository`.
- Business logic stays in service/use case, not handler.