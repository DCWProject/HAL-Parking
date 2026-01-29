# Smart Parking Dashboard - Frontend

Built with React, Vite, Tailwind CSS, shadcn/ui, and Framer Motion.

## Setup

1.  **Install Dependencies**

    ```bash
    npm install
    ```

2.  **Run Development Server**

    ```bash
    npm run dev
    ```

3.  **Build for Production**
    ```bash
    npm run build
    ```

## Project Structure

- `src/components`: Reusable UI components.
- `src/context`: React Contexts (Auth).
- `src/pages`: Main application pages.
- `src/services`: API and WebSocket services.

## Configuration

- API URL is set to `http://localhost:8000/api/v1` in `src/services/api.js`.
- WebSocket URL is set to `ws://localhost:8000/ws/parking` in `src/pages/Dashboard.jsx`.
