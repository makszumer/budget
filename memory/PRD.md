# FinanceHub - Product Requirements Document

## Overview
FinanceHub is a comprehensive full-stack financial management application built with React (frontend), FastAPI (backend), and MongoDB (database).

## Core Features

### 1. User Authentication & Access Control
- JWT-based login/registration
- **Guest mode** - Explore with limited features
- **Free tier** - Basic budgeting features
- **Premium tier** - Full access to all features
- **Admin role** - Full access + admin panel
- **3-day free trial** for new users (no credit card required)
- **50% retention discount** for post-trial users

### 2. Financial Tracking
- Income, expense, and investment transactions
- Multi-currency support with live exchange rates
- Transaction categorization
- Primary currency setting per user

### 3. Budget Envelopes
- Create dedicated budgets for specific goals
- Add/edit/delete transactions within envelopes
- Progress tracking toward goals

### 4. Custom Categories
- Users can create, edit, delete their own income/expense categories
- Categories are user-specific

### 5. Standing Orders (Recurring Transactions)
- Automatic monthly recurring transactions
- Background scheduler processes on app startup

### 6. AI Financial Assistant (Premium)
- Data-driven chat interface
- Answers based on user's actual financial data
- Uses Emergent LLM integration (GPT-4o-mini)

### 7. Voice Input (Premium)
- Voice-to-transaction feature
- First-time user tutorial
- Clarification flow for category selection

### 8. Daily Quote (Premium)
- AI-generated financial/motivational quotes
- Diverse quotes from famous investors
- One refresh per day

### 9. Dark Mode
- Full dark/light theme toggle
- System preference detection
- Appearance toggle on dashboard
- Persists user preference

### 10. Primary Currency Setting
- User can select primary currency from 20+ options
- Applied automatically to all new transactions
- Currency selector on dashboard header

### 11. Multi-Currency Conversion (Premium)
- Optional secondary currency per transaction
- Live exchange rate API (exchangerate-api.com)
- Real-time conversion preview
- Stores original amount and converted amount

### 12. Investment Portfolio (Premium)
- Track investments with real-time portfolio values
- **Enhanced Analytics:**
  - ROI filter dropdown (All, Positive ROI, Negative ROI, >10%, >20%)
  - Chart type selector (Line, Area, Combined)
  - Dual line chart (Invested vs Current Value)
  - Line toggles to show/hide data series
- Investment distribution pie chart
- ROI by category breakdown

### 13. Subscription System (Stripe Integration)
- **Free Trial:** 3-day free trial for new users
- **Monthly Plan:** €4/month
- **Yearly Plan:** €36/year (save 25%)
- **Discount Packages:** 50% off for post-trial users
  - Monthly discount: €2/month for 6 months
  - Yearly discount: €18/year

## Tech Stack
- **Frontend:** React, TailwindCSS, ShadCN UI, Recharts
- **Backend:** FastAPI, MongoDB, Pydantic, APScheduler
- **AI:** emergentintegrations library (Emergent LLM Key)
- **Payments:** Stripe
- **Exchange Rates:** ExchangeRate-API.com

## What's Implemented (January 2026)

### Completed Features
- [x] User authentication (JWT)
- [x] Guest mode login
- [x] Financial transaction CRUD
- [x] Budget Envelopes with transaction management
- [x] Custom Categories
- [x] Standing Orders (recurring transactions)
- [x] AI Financial Assistant (Premium)
- [x] Voice Input with clarification flow (Premium)
- [x] Daily Quote feature (Premium)
- [x] Dark Mode toggle with system preference
- [x] Dashboard Appearance toggle
- [x] Primary Currency setting
- [x] Multi-currency conversion with live rates (Premium)
- [x] Analytics with date filtering
- [x] Interactive analytics (pie chart linking)
- [x] Stripe subscription integration
- [x] **Premium tier access control**
- [x] **3-day free trial system**
- [x] **Trial status display on pricing page**
- [x] **Trial badge in header**
- [x] **Investment Portfolio as premium feature**
- [x] **Enhanced Investment Analytics with ROI filters**
- [x] **Chart type selector (Line/Area/Combined)**
- [x] **Dual line chart with toggles**

### Premium Features Locked for Free Users
- AI Financial Assistant
- Voice Input
- Daily Financial Wisdom
- Multi-Currency Conversion
- Investment Portfolio & Analytics
- Export Data (CSV/PDF)
- Priority Support

## Upcoming/Future Tasks

### P0 (High Priority)
- None currently pending

### P1 (Medium Priority)
- Manual user verification of Stripe checkout flow (automated tests can't follow redirect)
- Implement 50% discount checkout packages (backend ready, needs Stripe price IDs)

### P2 (Lower Priority)
- Export analytics to PDF/CSV
- Refactor server.py into separate route modules
- Simplify App.js by delegating logic to child components

### P3 (Backlog)
- Budget forecasting feature
- PWA conversion for mobile experience
- Add more chart types to analytics

## API Endpoints

### Authentication
- POST `/api/users/login` - Login
- POST `/api/users/register` - Register
- GET `/api/users/me` - Get current user profile (includes trial fields)
- PUT `/api/users/preferences` - Update user preferences

### Subscription
- POST `/api/subscription/create-checkout` - Create Stripe checkout session
- POST `/api/subscription/start-trial` - Start 3-day free trial
- GET `/api/subscription/trial-status` - Get trial status
- POST `/api/subscription/check-payment-status` - Check payment status

### Transactions
- GET/POST `/api/transactions`
- PUT/DELETE `/api/transactions/{id}`
- GET `/api/transactions/summary`

### Budget Envelopes
- GET/POST `/api/budget-envelopes`
- DELETE `/api/budget-envelopes/{id}`
- GET/POST `/api/budget-envelopes/{id}/transactions`

### Exchange Rates
- GET `/api/exchange-rates`
- POST `/api/convert-currency`

## Database Schema (Key Fields)

### Users Collection
```json
{
  "id": "uuid",
  "email": "string",
  "username": "string",
  "hashed_password": "string",
  "subscription_level": "free|premium",
  "subscription_expires_at": "datetime|null",
  "primary_currency": "USD",
  "trial_started_at": "datetime|null",
  "trial_expires_at": "datetime|null",
  "trial_used": false,
  "discount_offered": false,
  "discount_used": false,
  "created_at": "datetime"
}
```

### UserResponse Model
```json
{
  "user_id": "string",
  "email": "string",
  "username": "string",
  "subscription_level": "free|premium",
  "is_premium": true,
  "is_trial": false,
  "trial_started_at": "datetime|null",
  "trial_expires_at": "datetime|null",
  "trial_used": false,
  "discount_eligible": false,
  "discount_used": false,
  "primary_currency": "USD"
}
```

## Test Credentials
- **Admin:** `admin@financehub.com` / `admin` (or `admin` / `admin`)
- **Guest:** Click "Continue as Guest" on login page
- **Trial User:** Register new account, then click "Start 3-Day Free Trial" on pricing page

## File Structure
```
/app/
├── backend/
│   ├── server.py           # Main FastAPI app
│   ├── auth.py             # Auth utilities
│   ├── models.py           # Pydantic models with trial fields
│   ├── routes/
│   │   ├── users.py        # User routes with trial support
│   │   └── subscription.py # Subscription + trial endpoints
│   └── services/
│       └── exchange_rate.py # Exchange rate service
└── frontend/
    └── src/
        ├── components/
        │   ├── FeatureLock.jsx          # Premium feature wrapper
        │   ├── InvestmentAnalytics.jsx  # Enhanced analytics
        │   └── subscription/
        │       └── PricingPage.jsx      # Pricing with trial
        ├── context/
        │   ├── AuthContext.jsx          # Auth with trial states
        │   ├── AccessContext.jsx        # Feature access control
        │   └── ThemeContext.jsx         # Theme management
        └── App.js                       # Main app component
```

## Testing Status
- **Backend Tests:** 10/10 passed (pytest)
- **Frontend Tests:** All premium tier features verified
- **Test Report:** `/app/test_reports/iteration_2.json`

## Known Issues
- Stripe checkout redirect cannot be tested in headless browser (requires manual verification)
