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

### 2. Financial Health Snapshot (NEW - FREE with Premium Enhancements)
**FREE for all users:**
- Savings Rate (with color-coded health indicator)
- Net Cash Flow (last 30 days)
- Budget Status (under/on/over budget)
- Help tooltips on all metrics

**Premium Enhancements:**
- Trend indicators (% change vs previous period)
- Investment Performance summary (ROI, gain/loss)
- Smart Insights with contextual suggestions

### 3. "Explain This" Contextual Help (NEW - FREE)
- Help icons (?) next to financial terms
- Tooltips with plain-language explanations
- Covers: Savings Rate, Net Cash Flow, Budget Status, ROI, Compound Interest, Standing Orders, etc.

### 4. "What Changed?" Comparison (PREMIUM)
- Compare current vs previous period
- Summary: Income change, Expense change, Investment change
- Biggest spending increase/decrease by category
- Investment portfolio value change
- Date filter aware (day/week/month/year)
- Free users see locked button

### 5. Financial Tracking
- Income, expense, and investment transactions
- Multi-currency support with live exchange rates
- Transaction categorization
- Primary currency setting per user

### 7. Budget Envelopes
- Create dedicated budgets for specific goals
- Add/edit/delete transactions within envelopes
- Progress tracking toward goals

### 8. Custom Categories
- Users can create, edit, delete their own income/expense categories
- Categories are user-specific

### 9. Standing Orders (Recurring Transactions)
- Automatic monthly recurring transactions
- Background scheduler processes on app startup

### 10. AI Financial Assistant (Premium)
- Data-driven chat interface
- Answers based on user's actual financial data
- Uses Emergent LLM integration (GPT-4o-mini)

### 11. Voice Input (Premium)
- Voice-to-transaction feature
- First-time user tutorial
- Clarification flow for category selection

### 12. Daily Quote (Premium)
- AI-generated financial/motivational quotes
- Diverse quotes from famous investors
- One refresh per day

### 13. Dark Mode
- Full dark/light theme toggle
- System preference detection
- Appearance toggle on dashboard

### 14. Investment Portfolio (Premium)
- Track investments with real-time portfolio values
- **Enhanced Analytics:**
  - ROI filter dropdown (All, Positive ROI, Negative ROI, >10%, >20%)
  - Chart type selector (Line, Area, Combined)
  - Dual line chart (Invested vs Current Value)
  - **Timeline extends to current date** (not stopping at last transaction)

### 15. Subscription System (Stripe Integration)
- **Free Trial:** 3-day free trial for new users
- **Monthly Plan:** €4/month
- **Yearly Plan:** €36/year (save 25%)
- **Discount Packages:** 50% off for post-trial users

## Tech Stack
- **Frontend:** React, TailwindCSS, ShadCN UI, Recharts
- **Backend:** FastAPI, MongoDB, Pydantic, APScheduler
- **AI:** emergentintegrations library (Emergent LLM Key)
- **Payments:** Stripe
- **Exchange Rates:** ExchangeRate-API.com

## What's Implemented (January 2026)

### Session 4 - Dashboard Hierarchy & Subtle Premium (Updated January 2026)
- [x] **Dashboard Section Order** (Final - User Specified)
  1. Quote of the Day - TOP (blurred for free users, visible for premium/admin)
  2. Add Expense / Add Income - Clear action buttons, always accessible
  3. Totals Summary - Compact (Income, Expenses, Investments, Balance)
  4. Budget Manager & Investment Portfolio - Primary planning section with tabs
  5. Transactions & Analytics - Hidden by default, expand with buttons
  6. Financial Health Snapshot - Glanceable, non-dominant
  7. What Changed? - Near bottom, Premium-only with lock for free users
- [x] **Quote of the Day - Free vs Premium**
  - [x] FREE: Blurred text with small "Premium" label (visible but not readable)
  - [x] PREMIUM: Fully visible with refresh button
  - [x] No popups or banners - subtle blur effect only
- [x] **Subtle Premium Signaling**
  - [x] Small gray lock icons
  - [x] Muted "Premium" labels
  - [x] PRO badge on Investment Portfolio for free users
  - [x] Never blocks core functionality
- [x] **Smart Alerts Feature REMOVED**
  - [x] Completely removed per user request
  - [x] Removed from components, pricing page, and access context
- [x] **Stripe Checkout Fix**
  - [x] Fixed Clock import in PricingPage.jsx
  - [x] Improved redirect logic using window.location.href directly
  - [x] Added data-testid attributes for buttons

### Session 3 - New Features
- [x] **Financial Health Snapshot** (FREE + Premium enhancements)
  - [x] Savings Rate with color-coded indicator
  - [x] Net Cash Flow (30 days)
  - [x] Budget Status (under/on/over)
  - [x] Trend indicators (Premium)
  - [x] Investment Performance summary (Premium)
  - [x] Smart Insights with suggestions (Premium)
- [x] **"Explain This" Help Tooltips** (FREE)
  - [x] HelpTooltip component
  - [x] 15+ financial term definitions
- [x] **"What Changed?" Comparison** (PREMIUM)
  - [x] Period comparison (vs prev 30 days, last month, etc.)
  - [x] Income/Expense/Investment change summary
  - [x] Biggest spending increase/decrease
  - [x] Locked button for free users
- [x] **Investment Growth Timeline Fix**
  - [x] Chart extends to current date
  - [x] Daily value interpolation
- [x] **Data Export Removed from UI**
  - [x] Removed from pricing page
  - [x] Removed from feature lists

### Session 2 - Premium Tier Enhancement
- [x] 3-day free trial system
- [x] Trial status tracking
- [x] Trial badge in header
- [x] 50% retention discount backend
- [x] Enhanced Investment Analytics (ROI filters, chart types)
- [x] Investment Portfolio as premium feature

### Session 1 - Core Features
- [x] User authentication (JWT)
- [x] Guest mode login
- [x] Financial transaction CRUD
- [x] Budget Envelopes
- [x] Custom Categories
- [x] Standing Orders
- [x] AI Financial Assistant
- [x] Voice Input
- [x] Daily Quote
- [x] Dark Mode toggle
- [x] Primary Currency setting
- [x] Multi-currency conversion
- [x] Interactive analytics
- [x] Stripe subscription

## Premium Features Locked for Free Users
- AI Financial Assistant
- Voice Input
- Daily Financial Wisdom (Quote of Day)
- Multi-Currency Conversion
- Investment Portfolio & Analytics
- What Changed? Comparison
- Priority Support

## Upcoming/Future Tasks

### P0 (High Priority)
- None currently pending

### P1 (Medium Priority)
- Refactor App.js component (extract data fetching into custom hooks)
- Refactor server.py into modular route files

### P2 (Lower Priority)
- Export analytics to PDF/CSV
- Budget forecasting feature

### P3 (Backlog)
- PWA conversion for mobile experience

## Test Credentials
- **Admin:** `admin` / `admin`
- **Guest:** Click "Continue as Guest"
- **Trial User:** Register → Start Trial on pricing page
- **Free User:** `freeuser@example.com` / `test123`
- **Trial User:** `trialtest@example.com` / `test123`

## File Structure (Key Components)
```
/app/frontend/src/components/
├── FinancialHealthSnapshot.jsx  # Health metrics
├── HelpTooltip.jsx              # Contextual help
├── WhatChanged.jsx              # Period comparison (Premium)
├── QuoteOfDay.jsx               # Blurred for free, visible for premium
├── FeatureLock.jsx              # Premium feature indicator
└── InvestmentAnalytics.jsx      # Enhanced with ROI filters
```

## Testing Status
- **Backend Tests:** All passed (10/10)
- **Frontend Tests:** 100% (all features working)
- **Test Report:** `/app/test_reports/iteration_4.json`
- **Stripe Checkout:** Verified working (redirects to Stripe)
- **Dashboard Layout:** Verified correct order
