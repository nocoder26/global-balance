# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Global Balance Engine is a static site built with Astro that showcases alternative digital services to major tech incumbents. It helps users discover privacy-focused, regional alternatives organized by service category.

## Commands

```bash
npm run dev      # Start dev server at localhost:4321
npm run build    # Build static site to ./dist/
npm run preview  # Preview production build locally
```

## Architecture

**Stack:** Astro 5 (static output) + React + Tailwind CSS 4 + Framer Motion

**Key Dependencies:**
- `fuse.js` - Client-side fuzzy search for filtering services
- `lucide-react` - Icon library
- `date-fns` - Date formatting utilities
- `clsx` + `tailwind-merge` - Conditional class name handling

**Data Structure:**

Services are defined in `src/data/services.json` with this schema:
```json
{
  "category": "string",
  "incumbent": { "name": "string", "hq": "string" },
  "innovators": [{
    "id": "string",
    "name": "string",
    "region": "string",
    "country": "string",
    "url": "string",
    "description": "string",
    "status": {
      "is_active": "boolean",
      "last_checked": "ISO 8601 date",
      "http_code": "number"
    }
  }]
}
```

The `status` object is critical for verification - it tracks whether services are active and their last health check.

**File Conventions:**
- `.astro` files for pages and layouts (in `src/pages/`)
- `.tsx` files for interactive React components (in `src/components/`)
- Global styles in `src/styles/global.css` (import Tailwind here)
