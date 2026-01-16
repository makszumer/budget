# FinanceHub - Product Requirements Document

## Overview
FinanceHub is a comprehensive full-stack financial management application built with React (frontend), FastAPI (backend), and MongoDB (database).

## Core Features

### 1. User Authentication
- JWT-based login/registration
- Admin and premium user roles
- Subscription management (free/premium tiers)

### 2. Financial Tracking
- Income, expense, and investment transactions
- Multi-currency support
- Transaction categorization

### 3. Budget Envelopes
- Create dedicated budgets for specific goals (vacations, savings, etc.)
- Add/edit/delete transactions within envelopes
- Progress tracking toward goals

### 4. Custom Categories
- Users can create, edit, delete their own income/expense categories
- Categories are user-specific

### 5. Standing Orders (Recurring Transactions)
- Automatic monthly recurring transactions
- Background scheduler processes on app startup

### 6. AI Financial Assistant
- Data-driven chat interface
- Answers based on user's actual financial data
- Uses Emergent LLM integration (GPT-4o-mini)

### 7. Voice Input
- Voice-to-transaction feature
- First-time user tutorial
- Clarification flow for category selection

### 8. Daily Quote
- AI-generated financial/motivational quotes
- Diverse quotes from famous investors
- One refresh per day

### 9. Dark Mode
- Full dark/light theme toggle
- **System preference detection (new)**
- **Appearance toggle on dashboard (new)**
- Persists user preference
- All components support dark mode styling

### 11. Primary Currency Setting
- User can select primary currency from 20+ options
- Applied automatically to all new transactions
- Currency selector on dashboard header
- Voice input uses primary currency
- AI assistant uses primary currency in responses
- Existing transactions retain their original currency

### 12. Multi-Currency Conversion
- Optional secondary currency per transaction
- Live exchange rate API (exchangerate-api.com)
- Real-time conversion preview while entering amount
- Stores: original amount, original currency, converted amount, exchange rate, conversion date
- Fallback to cached/estimated rates if API unavailable
- Transaction list shows original currency info
- Analytics use only converted values (primary currency)

### 11. Subscription (Stripe Integration)
- Premium subscriptions via Stripe
- Ad-free experience for premium users
- Uses Stripe test key

## Tech Stack
- **Frontend**: React, TailwindCSS, ShadCN UI, Recharts
- **Backend**: FastAPI, MongoDB, Pydantic, APScheduler
- **AI**: emergentintegrations library (Emergent LLM Key)
- **Payments**: Stripe

## What's Implemented (January 2026)

### Completed
- [x] User authentication (JWT)
- [x] Financial transaction CRUD
- [x] Budget Envelopes with transaction management
- [x] Custom Categories
- [x] Standing Orders (recurring transactions)
- [x] AI Financial Assistant
- [x] Voice Input with clarification flow
- [x] Daily Quote feature
- [x] Dark Mode toggle with system preference
- [x] Dashboard Appearance toggle
- [x] Primary Currency setting
- [x] Multi-currency conversion with live rates
- [x] Analytics with date filtering
- [x] Interactive analytics (pie chart linking)
- [x] Stripe subscription integration
- [x] Premium status display (fixed)
- [x] Budget envelope transaction deletion bug (fixed)
- [x] Ad banner removed for cleaner UI

### Known Mocked/Placeholder Features
- None - all features are now fully functional with live data

## Upcoming/Future Tasks

### P0 (High Priority)
- None currently pending

### P1 (Medium Priority)
- Integrate live currency exchange rate API
- Manual user verification of Stripe checkout flow

### P2 (Lower Priority)
- PWA conversion for mobile experience
- Refactor server.py into separate route modules

### P3 (Backlog)
- Add more chart types to analytics
- Export financial data to CSV/PDF
- Budget forecasting feature

## API Endpoints

### Authentication
- POST `/api/users/login` - Login
- POST `/api/users/register` - Register
- GET `/api/users/me` - Get current user profile

### Transactions
- GET/POST `/api/transactions`
- PUT/DELETE `/api/transactions/{id}`
- GET `/api/transactions/summary`

### Budget Envelopes
- GET/POST `/api/budget-envelopes`
- DELETE `/api/budget-envelopes/{id}`
- GET/POST `/api/budget-envelopes/{id}/transactions`
- PUT/DELETE `/api/budget-envelopes/{id}/transactions/{tx_id}`

### Custom Categories
- GET/POST/PUT/DELETE `/api/custom-categories`

### Standing Orders
- GET/POST/PUT/DELETE `/api/recurring-transactions`
- POST `/api/recurring-transactions/process`

### AI & Quotes
- POST `/api/ai-assistant`
- GET `/api/quote-of-day`

### Other
- GET `/api/portfolio`
- GET `/api/analytics`
- POST `/api/parse-voice-transaction`

## Test Credentials
- Admin: `admin@financehub.com` / `admin`
- Regular users can register via the app

## File Structure
```
/app/
├── backend/
│   ├── server.py         # Main FastAPI app
│   ├── auth.py           # Auth utilities
│   ├── models.py         # Pydantic models
│   └── routes/           # Route modules
└── frontend/
    └── src/
        ├── components/   # React components
        ├── context/      # AuthContext, ThemeContext
        └── App.js        # Main app component
```
