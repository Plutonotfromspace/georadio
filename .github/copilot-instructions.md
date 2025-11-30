# Copilot Instructions for GeoRadio

## Project Overview

GeoRadio is an interactive geography game built with React and Vite. Players listen to live radio stations from around the world and guess their country of origin by clicking on an interactive 3D globe. The game features 5 rounds with a scoring system based on the number of attempts.

## Tech Stack

- **Frontend Framework**: React 18 with Vite
- **3D Globe**: react-globe.gl with Three.js
- **Geographic Calculations**: d3-geo
- **Audio Streaming**: HLS.js for handling audio streams
- **Styling**: Plain CSS (index.css, App.css)
- **Analytics**: React-GA4 for Google Analytics
- **Linting**: ESLint with React plugins

## Project Structure

```
├── src/
│   ├── App.jsx          # Main game component with all game logic
│   ├── App.css          # Component-specific styles
│   ├── index.css        # Global styles
│   ├── main.jsx         # Application entry point
│   └── services/
│       └── analytics.js # Google Analytics integration
├── public/
│   ├── stations.json    # Pre-generated radio station data
│   └── audio/           # Sound effects
├── scripts/
│   └── generateStations.js # Script to generate stations.json
└── index.html           # HTML entry point with SEO metadata
```

## Development Commands

- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to GitHub Pages

## Coding Conventions

- Use functional components with React hooks (useState, useEffect, useCallback, useMemo, useRef)
- Follow ESLint configuration for React best practices
- Use CSS classes for styling (no CSS-in-JS)
- Keep all game logic within App.jsx
- Use `import.meta.env.BASE_URL` for asset paths

## Key Implementation Details

### Audio Handling
- Audio streams come from a public radio API
- HLS.js is used for .m3u8 streams
- Handle CORS and playback errors gracefully with automatic station refresh

### Globe Interaction
- Countries are rendered as polygons from world-atlas TopoJSON data
- Color coding indicates guess proximity (red = close, white = far)
- Mobile support includes tap-to-select with confirmation button

### Game State
- 5 rounds per game
- Score starts at 5000 per round, decreasing with each incorrect guess
- Track used countries and languages to avoid repetition

## Testing Considerations

This project currently does not have automated tests. When adding tests:
- Consider using Vitest (Vite's test runner)
- Focus on testing game logic functions
- Mock external dependencies (audio, fetch calls)

## External Dependencies

- Radio station data is fetched from `https://de1.api.radio-browser.info/`
- Country geometry from `https://unpkg.com/world-atlas@2/countries-110m.json`
- Flag images from `https://flagcdn.com/`

## Deployment

The app is deployed to GitHub Pages at `https://georadio.io`. Use `npm run deploy` which runs the build and deploys the `dist` folder.
