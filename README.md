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

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your improvements.

## License

This project is licensed under the MIT License.
