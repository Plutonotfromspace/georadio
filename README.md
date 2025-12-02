# GeoRadio

GeoRadio is an interactive web app that lets you listen to live radio stations from around the world and guess their country of origin by clicking on the globe. With five rounds to test your geographic intuition, each round starts with 5000 points that decrease with each incorrect guess. Receive feedback such as "warmer" or "cooler" based on your guess proximity, and enjoy a final recap of your performance.

## How to Play

- Listen to a live radio station.
- Click on the globe to select the country you think the station is broadcasting from.
- Get immediate feedback on your guess.
- Score points based on the number of attempts.
- Complete 5 rounds to achieve your final score.

## Features

- Live radio streaming from a public API.
- Interactive globe visualization.
- Real-time feedback for each guess.
- Detailed round and final game summaries.
- Responsive design for both desktop and mobile.

## Technologies Used

- React
- Vite
- React-Globe.gl
- D3-Geo for geographic calculations
- Three.js for 3D rendering
- HLS.js for handling audio streaming

## Setup Instructions

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/guess-country.git
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Start the development server:
    ```bash
    npm run dev
    ```
4. Open your browser and navigate to http://localhost:3000.

## Deploying to Vercel

GeoRadio includes a built-in CORS proxy to handle radio streams that don't include `Access-Control-Allow-Origin` headers. This proxy is automatically available when deployed to Vercel.

### Quick Deploy

1. Push your repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Deploy - the proxy endpoint will be available at `/api/proxy`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_PROXY_BASE_URL` | Custom proxy base URL (optional) | `{origin}/api/proxy` |

If you're using a custom proxy server or want to use a different endpoint, set `VITE_PROXY_BASE_URL` in your Vercel environment settings:

```
VITE_PROXY_BASE_URL=https://your-proxy.example.com/proxy
```

### How the Proxy Works

The proxy endpoint (`/api/proxy`) accepts a `url` query parameter and:
- Validates that the URL uses `http://` or `https://` schemes
- Fetches the remote audio stream
- Adds CORS headers (`Access-Control-Allow-Origin: *`)
- Streams the response back to the client

Example: `/api/proxy?url=https://example.com/stream.mp3`

### Considerations

- **Bandwidth**: All audio streams pass through Vercel's infrastructure, which may increase bandwidth costs
- **Limits**: Vercel has [request limits](https://vercel.com/docs/functions/limitations) for serverless functions; long-running streams may be affected
- **Security**: The proxy only allows `http://` and `https://` URLs to prevent abuse

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your improvements.

## License

This project is licensed under the MIT License.
