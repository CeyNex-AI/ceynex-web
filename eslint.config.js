import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import security from 'eslint-plugin-security'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      // Lightweight TypeScript SAST. The genuinely useful rules here catch
      // eval-family calls, non-literal require/child_process/fs arguments and
      // the like; the lint job runs with --max-warnings 0, so any of them
      // firing fails a PR the way a type error does.
      security.configs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Off, after auditing every hit on 2026-09-19. These three fired only
      // false positives on this browser app and would otherwise be permanent
      // noise that trains reviewers to ignore the whole plugin:
      //  - object-injection: flags ordinary `obj[key]` access; the app has no
      //    server-side object sink, SQL lives in ceynex-core and the DOM is
      //    React-managed.
      //  - unsafe-regex: the only hit, scenario.ts's `(\d+(?:\.\d+)?)\s*%`, is
      //    linear (the `.` separator removes the quantifier ambiguity ReDoS
      //    needs).
      //  - possible-timing-attacks: the only hit is Signup.tsx comparing the
      //    two password fields the user just typed, client-side.
      'security/detect-object-injection': 'off',
      'security/detect-unsafe-regex': 'off',
      'security/detect-possible-timing-attacks': 'off',
    },
  },
])
