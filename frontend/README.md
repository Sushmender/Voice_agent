# Voice Agent - Frontend

This is the frontend application for the Voice Agent project. It provides a sleek, interactive, and responsive user interface for managing and conversing with the AI Voice Agent.

## Screenshots

### 1. Dashboard
The main dashboard provides an overview of your agent's activity and status.
![Dashboard View](C:\Users\susmi\.gemini\antigravity-ide\brain\fe74c149-4498-486d-9a81-bcbb7dce7721\dashboard_view_1786085565784.png)

### 2. Voice Console
The core interactive interface where you can speak with the Voice Agent in real-time, featuring audio visualizations.
![Voice Console View](C:\Users\susmi\.gemini\antigravity-ide\brain\fe74c149-4498-486d-9a81-bcbb7dce7721\console_view_1786085582744.png)

### 3. History
A detailed view of past conversations and interactions with the AI.
![History View](C:\Users\susmi\.gemini\antigravity-ide\brain\fe74c149-4498-486d-9a81-bcbb7dce7721\history_view_1786085595942.png)

## Features & Core Components

- **Authentication & Onboarding (`/features/auth`)**: Secure login and smooth onboarding flow for new users.
- **Voice Console (`/features/console`)**: Real-time voice interaction interface.
- **Dashboard (`/features/dashboard`)**: Analytics and system overview.
- **History & Logs (`/features/history`)**: Review past interactions.
- **Agent Tools (`/features/tools`)**: Configuration and integrations for the agent's capabilities.
- **Settings (`/features/settings`)**: Personalize and configure application preferences.

## Tech Stack

The application is built on a modern React stack optimized for performance and developer experience:

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite (Lightning-fast HMR and build process)
- **Routing**: React Router v7
- **State Management**: Zustand (Global state) + React Query (Server state and caching)
- **Styling**: Tailwind CSS + Framer Motion (Smooth page transitions & micro-animations)
- **Forms & Validation**: React Hook Form + Zod
- **Real-time Comms**: LiveKit Client for WebRTC audio streaming
- **UI Components & Icons**: Radix/Custom UI, Lucide React, Recharts

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.

### Building for Production
To build the application for production, run:
```bash
npm run build
```
This will generate optimized static assets in the `dist` directory.

### Linting
This project uses Oxlint for incredibly fast linting:
```bash
npm run lint
```
