# Trip Planner (MERN + AI + Razorpay)

## Setup
### Server
cd server && npm install
cp .env.example .env   # keys bharo
npm run dev            # http://localhost:5000

### Client
cd client && npm install
npm run dev            # http://localhost:5173

## Build order
1. Server + MongoDB  2. Auth  3. Trip CRUD  4. AI itinerary  5. React pages  6. Razorpay  7. Split payment
