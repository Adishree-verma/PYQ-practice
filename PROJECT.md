PYQSolve
A full-stack PYQ (Previous Year Questions) practice app for competitive exam students (JEE, NEET, UPSC, SSC) — supporting streaks, AI-powered question generation, and end-of-test analytics.

Run & Operate
pnpm --filter @workspace/api-server run dev — API server (port 8080, path /api)
pnpm --filter @workspace/pyq-quiz run dev — React frontend (port 20678, path /)
pnpm run typecheck — full typecheck across all packages
pnpm run build — typecheck + build all packages
pnpm --filter @workspace/api-spec run codegen — regenerate API hooks and Zod schemas from OpenAPI spec
pnpm --filter @workspace/db run push — push DB schema changes (dev only)
Required env: DATABASE_URL — Postgres connection string
Required env: AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY — for AI question generation
Stack
pnpm workspaces, Node.js 24, TypeScript 5.9
Frontend: React 19 + Vite + shadcn/ui + Tailwind CSS 4, wouter routing
API: Express 5, pino logging
DB: PostgreSQL + Drizzle ORM
Validation: Zod (zod/v4), drizzle-zod
API codegen: Orval (from OpenAPI spec at lib/api-spec/openapi.yaml)
AI: OpenAI GPT-4.1 via Replit AI Integration proxy (in lib/integrations-openai-ai-server)
Build: esbuild (CJS bundle for API server)
Where things live
artifacts/pyq-quiz/ — React frontend (pages: home, quiz-setup, quiz, results, answer-key)
artifacts/api-server/src/routes/ — Express routes: subjects, chapters, questions, quiz, stats
lib/api-spec/openapi.yaml — OpenAPI contract (source of truth)
lib/api-client-react/src/generated/api.ts — generated React Query hooks
lib/db/src/schema/ — Drizzle ORM schema (subjects, chapters, questions, quiz_sessions, session_answers, user_stats, daily_activity)
Architecture decisions
Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod schemas
AI question generation uses OpenAI GPT-4.1 on /api/questions/more endpoint (POST)
Quiz state is managed client-side (timer, current index, selected option); only submitted answers go to DB
Results stored in sessionStorage after session completion so Results page is self-sufficient
inArray from drizzle-orm used for counting questions per subject (not raw SQL ANY/ARRAY)
Product
6 subjects: Physics, Chemistry, Biology, Mathematics, History, Geography
25+ chapters with 60+ seeded PYQ questions across Kinematics, Laws of Motion, Electrostatics, Atomic Structure, Quadratic Equations, Ancient India
Quiz flow: select subject → chapter → count (10/20/30) → difficulty → quiz → results → answer key
Streak system: daily login streak + consecutive-correct-answers streak
AI "Generate Similar Question" button on wrong answers (calls GPT-4.1 with concept context)
End-of-test analytics: correct/wrong/skipped, total time, avg time per question, score
Profile page (/profile): set name, pick target exam (JEE/NEET/UPSC/SSC), view streak badges (10 milestones)
Analysis tab: 14-day activity area chart, subject performance bar chart, difficulty breakdown pie chart
Bottom nav: Home, Practice, Profile tabs on main pages
User preferences
Colorful, energetic UI — vibrant purple primary, orange secondary, green accent
No emojis in UI code (subject icons come from API data)
All quiz state managed client-side for responsiveness
Gotchas
Orval config (lib/api-spec/orval.config.ts) has indexFiles: false and no schemas field in zod output — do not change
lib/api-zod/src/index.ts only exports ./generated/api, not schemas separately
Google Fonts @import must be FIRST in index.css before other @imports
Results page reads from sessionStorage key quiz-results-${sessionId}
Pointers
See .local/skills/pnpm-workspace/ for workspace structure, TypeScript setup, and codegen
See .local/skills/react-vite/ for frontend development patterns
