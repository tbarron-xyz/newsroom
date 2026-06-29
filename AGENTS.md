# Project specifications
The project is "Newsroom", a Next.JS full-stack web app for using AI tools to generate news content from fetched social media messages.

- The data storage spec is at ./specs/data.spec.md
- The frontend spec is at ./specs/frontend.spec.md
- The style spec is at ./specs/style.spec.md

Four cron pipelines drive content generation: events → articles → editions → daily edition. See `crontab.txt` and README.md for the full pipeline details.

After making any code changes to typescript files (.ts/.tsx), run `npm run build` to check the typescript build
<!-- Then run the Prettier formatter: `npm run format` -->
- Run `docker compose run --rm test` or `npm test` to run the test suite (uses `node:test` framework)

# Code Style Guidelines
- When patterns repeat, extract to a shared location.
- Examples: repeated input styles → reusable CSS classes (globals.css) or components (e.g., FormInput.tsx).