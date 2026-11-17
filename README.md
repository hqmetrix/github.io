# hqMetrix website

Open `index.html` in a browser. Internet access is needed only for the heading font (Google Fonts); without it the site falls back to a system monospace font.

## Folders (they match the menu)

| Menu group | Folder |
|---|---|
| Quality Solutions | `quality-solutions/` |
| Performance Tools | `performance-tools/` |
| AI & Automation | `ai-automation/` |
| Resources | `resources/` |
| Support & Services | `support-services/` |
| About hqMetrix | `about/` |
| (footer only) Privacy Policy | `legal/` |

Each menu item is one HTML file in its folder, for example `quality-solutions/mvp-reporting.html`.

## Where to change things

- **Menu, footer address, phone, email, footer note:** `assets/js/menu.js`. Edit once and every page updates. To add a page, create the HTML file in the right folder and add `["file-name", "Menu label"]` to that group's `items`.
- **Page text:** edit that page's HTML file. Each page's content sits between `<main>` and `</main>`.
- **Colors, fonts, spacing, dashboard styling:** `assets/css/styles.css` (colors are variables at the top).
- **Logo and favicon:** `assets/img/`.
- **Dashboards:** plain HTML and inline SVG inside each page, under the "Sample" heading. All numbers are illustrative sample data; replace them with real figures or remove the section. Remove the "Sample data" tags when you do.

## Before publishing

- Replace placeholder pages (success stories, leadership, newsroom, careers, blog, webinars, events) with real content.
- Have counsel review `legal/privacy.html`.
- The contact form opens the visitor's email app. Connect a real form handler when hosting.
- Verify MIPS, MVP, APP and Star Ratings descriptions against current CMS and eCQI sources.
