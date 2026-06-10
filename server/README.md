# GAkinz — server files (placed by hand, NOT auto-deployed)

The GitHub Actions deploy uploads **only `dist/`**. These PHP/config files live in
the document root on cPanel and are uploaded once by hand, then left alone by deploys.

## One-time server setup

1. Upload everything in this folder to the document root (`/home/<cpanel_user>/gakinz.com/`),
   **except** `config.php.example` and this README.
2. Copy `config.php.example` → `config.php` on the server and fill in the real DB
   credentials and OpenRouter key. **Never commit `config.php`.**
3. In cPanel → phpMyAdmin, run `schema.sql` against the project database.
4. Hit `https://gakinz.com/api.php` — it should return `[]`.
5. Visit `https://gakinz.com/smoke` — add an item, confirm it persists.

## Files

| File | Purpose |
|---|---|
| `config.php.example` | Template for `config.php` (DB + OpenRouter). Copy, don't commit the filled copy. |
| `_bootstrap.php` | Shared CORS + JSON helpers; provides `$conn`. |
| `api.php` | Smoke test: GET list / POST insert `items`. |
| `contact.php` | Public enquiry form → `enquiries`. |
| `ai.php` | OpenRouter proxy for all AI features. Key stays server-side. |
| `verify.php` | Public certificate verification. |
| `schema.sql` | Foundation tables: `items`, `enquiries`, `certificates`. |
| `.htaccess` | SPA routing + blocks direct access to config/bootstrap. |

## Adding endpoints

One PHP file per resource. Each starts with `require __DIR__ . '/_bootstrap.php';`,
uses prepared statements, returns JSON via `ok()` / `fail()`, and handles `OPTIONS`.
