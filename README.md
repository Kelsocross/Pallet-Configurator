# Pallet Configurator

A browser-based pallet calculator and configurator for project managers in logistics and shipping. Define carton/box measurements, configure pallets with multiple box sizes, and generate optimized pallet configurations that respect footprint and height constraints for LTL shipping.

## Features

- **Multi-Box Support**: Add multiple box types with different dimensions and optional weight
- **3D Visualization**: Interactive 3D view of pallet stacking with proper box placement
- **Smart Vertical Stacking**: Height-map grid algorithm ensures smaller boxes stack vertically in dedicated columns rather than spreading across layers
- **Unit Flexibility**: Switch between inches and millimeters with real-time conversion
- **PDF Export**: Generate professional configuration reports with optional layer detail views
- **Dark/Light Mode**: Toggle between themes for comfortable viewing
- **Responsive Design**: Works on desktop and tablet devices

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS with shadcn/ui components
- React Three Fiber + Three.js (3D visualization)
- TanStack React Query (server state)
- jsPDF (PDF generation)

### Backend
- Node.js with Express
- TypeScript
- Drizzle ORM (PostgreSQL ready)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pallet-configurator.git
cd pallet-configurator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5000`

## Usage

1. **Set Pallet Dimensions**: Configure the pallet footprint (length, width) and maximum stack height
2. **Add Boxes**: Define box external dimensions (L x W x H) and optional weight
3. **Calculate**: Click "Calculate" to generate an optimized pallet configuration
4. **Visualize**: View the 3D representation of how boxes are stacked
5. **Export**: Download a PDF report with optional layer views

## Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and calculator logic
├── server/               # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   └── storage.ts        # Data storage interface
├── shared/               # Shared types and schemas
│   └── schema.ts         # Drizzle schema and Zod types
└── migrations/           # Database migrations
```

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
