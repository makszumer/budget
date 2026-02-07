"""
Backend API Tests for Refactored FinanceHub Application
Tests all modular routes after refactoring from monolithic server.py
Modules tested: transactions, analytics, portfolio, recurring, budget_envelopes, currency, categories, ai
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vaulton-preview.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@financehub.com"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for admin user"""
    response = api_client.post(f"{BASE_URL}/api/users/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ========== HEALTH CHECK TESTS ==========
class TestHealthCheck:
    """Basic API health check tests - verifies server is running after refactoring"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint returns success"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Financial Tracker API"
        assert data.get("status") == "healthy"
        print("✅ API root endpoint working - server healthy after refactoring")


# ========== AUTHENTICATION TESTS ==========
class TestAuthentication:
    """Authentication endpoint tests - users.py route module"""
    
    def test_login_with_admin_email(self, api_client):
        """Test successful login with admin email"""
        response = api_client.post(f"{BASE_URL}/api/users/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user_id" in data
        assert "is_premium" in data
        assert data["is_premium"] == True  # Admin should be premium
        print(f"✅ Admin login with email successful, is_premium: {data['is_premium']}")
    
    def test_login_with_admin_username(self, api_client):
        """Test successful login with admin username"""
        response = api_client.post(f"{BASE_URL}/api/users/login", json={
            "email": ADMIN_USERNAME,  # Using username instead of email
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print("✅ Admin login with username successful")
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials returns 401"""
        response = api_client.post(f"{BASE_URL}/api/users/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")
    
    def test_get_current_user(self, authenticated_client):
        """Test getting current user info"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/me")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "subscription_level" in data
        print(f"✅ Current user info retrieved: {data['email']}")


# ========== TRANSACTIONS TESTS ==========
class TestTransactions:
    """Transaction CRUD tests - transactions.py route module"""
    
    created_transaction_id = None
    
    def test_01_get_transactions(self, authenticated_client):
        """Test listing transactions"""
        response = authenticated_client.get(f"{BASE_URL}/api/transactions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Listed {len(data)} transactions")
    
    def test_02_get_summary(self, authenticated_client):
        """Test transaction summary endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/transactions/summary")
        assert response.status_code == 200
        data = response.json()
        assert "totalIncome" in data
        assert "totalExpenses" in data
        assert "totalInvestments" in data
        assert "balance" in data
        print(f"✅ Summary: Income=${data['totalIncome']:.2f}, Expenses=${data['totalExpenses']:.2f}, Balance=${data['balance']:.2f}")
    
    def test_03_create_expense_transaction(self, authenticated_client):
        """Test creating an expense transaction"""
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "type": "expense",
            "amount": 99.99,
            "description": f"TEST_Expense_{uuid.uuid4().hex[:8]}",
            "category": "Groceries",
            "date": today,
            "currency": "USD"
        }
        response = authenticated_client.post(f"{BASE_URL}/api/transactions", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["type"] == "expense"
        assert data["amount"] == 99.99
        TestTransactions.created_transaction_id = data["id"]
        print(f"✅ Created expense transaction: {data['id']}")
    
    def test_04_verify_transaction_created(self, authenticated_client):
        """Verify transaction was persisted"""
        response = authenticated_client.get(f"{BASE_URL}/api/transactions")
        assert response.status_code == 200
        data = response.json()
        transaction_ids = [t["id"] for t in data]
        assert TestTransactions.created_transaction_id in transaction_ids
        print("✅ Transaction verified in list")
    
    def test_05_update_transaction(self, authenticated_client):
        """Test updating a transaction"""
        trans_id = TestTransactions.created_transaction_id
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "type": "expense",
            "amount": 149.99,
            "description": "TEST_Updated_Expense",
            "category": "Restaurants / Cafes",
            "date": today,
            "currency": "USD"
        }
        response = authenticated_client.put(f"{BASE_URL}/api/transactions/{trans_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 149.99
        assert data["category"] == "Restaurants / Cafes"
        print("✅ Transaction updated successfully")
    
    def test_06_delete_transaction(self, authenticated_client):
        """Test deleting a transaction"""
        trans_id = TestTransactions.created_transaction_id
        response = authenticated_client.delete(f"{BASE_URL}/api/transactions/{trans_id}")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✅ Transaction deleted")
    
    def test_07_verify_transaction_deleted(self, authenticated_client):
        """Verify transaction was removed"""
        response = authenticated_client.get(f"{BASE_URL}/api/transactions")
        assert response.status_code == 200
        data = response.json()
        transaction_ids = [t["id"] for t in data]
        assert TestTransactions.created_transaction_id not in transaction_ids
        print("✅ Transaction deletion verified")


# ========== ANALYTICS TESTS ==========
class TestAnalytics:
    """Analytics endpoint tests - analytics.py route module"""
    
    def test_get_analytics(self, authenticated_client):
        """Test main analytics endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics")
        assert response.status_code == 200
        data = response.json()
        assert "expense_breakdown" in data
        assert "income_breakdown" in data
        assert "investment_breakdown" in data
        assert isinstance(data["expense_breakdown"], list)
        print(f"✅ Analytics retrieved: {len(data['expense_breakdown'])} expense categories")
    
    def test_get_budget_growth(self, authenticated_client):
        """Test budget growth analytics endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/budget-growth")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total_income" in data
        assert "total_expenses" in data
        assert "net_savings" in data
        print(f"✅ Budget growth: Net savings=${data['net_savings']:.2f}")
    
    def test_get_investment_growth(self, authenticated_client):
        """Test investment growth analytics endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/investment-growth")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total_invested" in data
        assert "current_value" in data
        assert "total_gain" in data
        print(f"✅ Investment growth: Total invested=${data['total_invested']:.2f}")


# ========== PORTFOLIO TESTS ==========
class TestPortfolio:
    """Portfolio endpoint tests - portfolio.py route module"""
    
    def test_get_portfolio(self, authenticated_client):
        """Test portfolio summary endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/portfolio")
        assert response.status_code == 200
        data = response.json()
        assert "holdings" in data
        assert "total_invested" in data
        assert "current_value" in data
        assert "total_gain_loss" in data
        assert "total_roi_percentage" in data
        assert isinstance(data["holdings"], list)
        print(f"✅ Portfolio: {len(data['holdings'])} holdings, Total invested=${data['total_invested']:.2f}")


# ========== RECURRING TRANSACTIONS TESTS ==========
class TestRecurringTransactions:
    """Recurring transactions tests - recurring.py route module"""
    
    created_recurring_id = None
    
    def test_01_get_recurring_transactions(self, authenticated_client):
        """Test listing recurring transactions"""
        response = authenticated_client.get(f"{BASE_URL}/api/recurring-transactions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Listed {len(data)} recurring transactions")
    
    def test_02_create_recurring_transaction(self, authenticated_client):
        """Test creating a recurring transaction"""
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "type": "expense",
            "amount": 50.00,
            "description": f"TEST_Recurring_{uuid.uuid4().hex[:8]}",
            "category": "Subscriptions",
            "frequency": "monthly",
            "start_date": today,
            "day_of_month": 15,
            "currency": "USD"
        }
        response = authenticated_client.post(f"{BASE_URL}/api/recurring-transactions", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        TestRecurringTransactions.created_recurring_id = data["id"]
        print(f"✅ Created recurring transaction: {data['id']}")
    
    def test_03_verify_recurring_created(self, authenticated_client):
        """Verify recurring transaction was persisted"""
        response = authenticated_client.get(f"{BASE_URL}/api/recurring-transactions")
        assert response.status_code == 200
        data = response.json()
        recurring_ids = [r["id"] for r in data]
        assert TestRecurringTransactions.created_recurring_id in recurring_ids
        print("✅ Recurring transaction verified in list")
    
    def test_04_toggle_recurring_transaction(self, authenticated_client):
        """Test toggling recurring transaction active status"""
        rec_id = TestRecurringTransactions.created_recurring_id
        response = authenticated_client.put(f"{BASE_URL}/api/recurring-transactions/{rec_id}/toggle")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✅ Recurring transaction toggled")
    
    def test_05_update_recurring_transaction(self, authenticated_client):
        """Test updating a recurring transaction"""
        rec_id = TestRecurringTransactions.created_recurring_id
        payload = {
            "amount": 75.00,
            "description": "TEST_Updated_Recurring"
        }
        response = authenticated_client.put(f"{BASE_URL}/api/recurring-transactions/{rec_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 75.00
        print("✅ Recurring transaction updated")
    
    def test_06_process_recurring_transactions(self, authenticated_client):
        """Test processing recurring transactions"""
        response = authenticated_client.post(f"{BASE_URL}/api/recurring-transactions/process")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "created_count" in data
        print(f"✅ Processed recurring transactions: {data['created_count']} created")
    
    def test_07_delete_recurring_transaction(self, authenticated_client):
        """Test deleting a recurring transaction"""
        rec_id = TestRecurringTransactions.created_recurring_id
        response = authenticated_client.delete(f"{BASE_URL}/api/recurring-transactions/{rec_id}")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✅ Recurring transaction deleted")


# ========== BUDGET ENVELOPES TESTS ==========
class TestBudgetEnvelopes:
    """Budget envelope tests - budget_envelopes.py route module"""
    
    created_envelope_id = None
    created_transaction_id = None
    
    def test_01_get_envelopes(self, authenticated_client):
        """Test listing budget envelopes"""
        response = authenticated_client.get(f"{BASE_URL}/api/budget-envelopes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Listed {len(data)} budget envelopes")
    
    def test_02_create_envelope(self, authenticated_client):
        """Test creating a budget envelope"""
        payload = {
            "name": f"TEST_Envelope_{uuid.uuid4().hex[:8]}",
            "target_amount": 2000,
            "currency": "USD",
            "description": "Test envelope for refactoring verification"
        }
        response = authenticated_client.post(f"{BASE_URL}/api/budget-envelopes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        TestBudgetEnvelopes.created_envelope_id = data["id"]
        print(f"✅ Created envelope: {data['id']}")
    
    def test_03_allocate_to_envelope(self, authenticated_client):
        """Test allocating money to an envelope"""
        env_id = TestBudgetEnvelopes.created_envelope_id
        payload = {"amount": 500}
        response = authenticated_client.post(f"{BASE_URL}/api/budget-envelopes/{env_id}/allocate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "new_amount" in data
        assert data["new_amount"] == 500
        print(f"✅ Allocated $500 to envelope, new amount: ${data['new_amount']}")
    
    def test_04_add_envelope_transaction(self, authenticated_client):
        """Test adding a transaction to an envelope"""
        env_id = TestBudgetEnvelopes.created_envelope_id
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "type": "income",
            "amount": 200,
            "description": "Test deposit",
            "category": "Savings",
            "date": today
        }
        response = authenticated_client.post(f"{BASE_URL}/api/budget-envelopes/{env_id}/transactions", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        TestBudgetEnvelopes.created_transaction_id = data["id"]
        print(f"✅ Created envelope transaction: {data['id']}")
    
    def test_05_get_envelope_transactions(self, authenticated_client):
        """Test getting envelope transactions"""
        env_id = TestBudgetEnvelopes.created_envelope_id
        response = authenticated_client.get(f"{BASE_URL}/api/budget-envelopes/{env_id}/transactions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✅ Retrieved {len(data)} envelope transactions")
    
    def test_06_delete_envelope_transaction(self, authenticated_client):
        """Test deleting an envelope transaction"""
        env_id = TestBudgetEnvelopes.created_envelope_id
        trans_id = TestBudgetEnvelopes.created_transaction_id
        response = authenticated_client.delete(f"{BASE_URL}/api/budget-envelopes/{env_id}/transactions/{trans_id}")
        assert response.status_code == 200
        print("✅ Envelope transaction deleted")
    
    def test_07_delete_envelope(self, authenticated_client):
        """Test deleting a budget envelope"""
        env_id = TestBudgetEnvelopes.created_envelope_id
        response = authenticated_client.delete(f"{BASE_URL}/api/budget-envelopes/{env_id}")
        assert response.status_code == 200
        print("✅ Budget envelope deleted")


# ========== CURRENCY TESTS ==========
class TestCurrency:
    """Currency endpoint tests - currency.py route module"""
    
    def test_get_currencies(self, api_client):
        """Test getting supported currencies"""
        response = api_client.get(f"{BASE_URL}/api/currencies")
        assert response.status_code == 200
        data = response.json()
        assert "currencies" in data
        assert isinstance(data["currencies"], list)
        assert "USD" in data["currencies"]
        assert "EUR" in data["currencies"]
        print(f"✅ Retrieved {len(data['currencies'])} currencies")
    
    def test_get_exchange_rates(self, api_client):
        """Test getting exchange rates for USD"""
        response = api_client.get(f"{BASE_URL}/api/exchange-rates/USD")
        assert response.status_code == 200
        data = response.json()
        assert "base" in data
        assert "rates" in data
        assert data["base"] == "USD"
        print(f"✅ Exchange rates retrieved for USD")


# ========== QUOTE OF DAY TESTS ==========
class TestQuoteOfDay:
    """Quote of Day tests - ai.py route module"""
    
    def test_get_quote(self, api_client):
        """Test quote of day endpoint"""
        response = api_client.get(f"{BASE_URL}/api/quote-of-day")
        assert response.status_code == 200
        data = response.json()
        assert "quote" in data
        assert "author" in data
        assert "date" in data
        assert isinstance(data["quote"], str)
        assert len(data["quote"]) > 0
        print(f"✅ Quote retrieved: '{data['quote'][:50]}...' - {data['author']}")


# ========== AI ASSISTANT TESTS ==========
class TestAIAssistant:
    """AI Assistant tests - ai.py route module"""
    
    def test_ai_assistant(self, authenticated_client):
        """Test AI assistant endpoint"""
        payload = {"question": "What is my total income?"}
        response = authenticated_client.post(f"{BASE_URL}/api/ai-assistant", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        print(f"✅ AI Assistant responded: '{data['answer'][:100]}...'")
    
    def test_ai_assistant_empty_question(self, authenticated_client):
        """Test AI assistant with empty question"""
        payload = {"question": ""}
        response = authenticated_client.post(f"{BASE_URL}/api/ai-assistant", json=payload)
        assert response.status_code == 400
        print("✅ AI Assistant correctly rejects empty question")


# ========== VOICE PARSING TESTS ==========
class TestVoiceParsing:
    """Voice parsing tests - ai.py route module"""
    
    def test_parse_expense(self, authenticated_client):
        """Test parsing expense voice input"""
        payload = {"text": "I spent 50 dollars on groceries"}
        response = authenticated_client.post(f"{BASE_URL}/api/parse-voice-transaction", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "parsed_amount" in data
        assert data["parsed_amount"] == 50.0
        print(f"✅ Voice parsing: Detected amount ${data['parsed_amount']}")
    
    def test_parse_income(self, authenticated_client):
        """Test parsing income voice input"""
        payload = {"text": "I earned 1000 dollars from salary"}
        response = authenticated_client.post(f"{BASE_URL}/api/parse-voice-transaction", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "parsed_amount" in data
        assert data["parsed_amount"] == 1000.0
        print(f"✅ Voice parsing: Detected income ${data['parsed_amount']}")


# ========== CUSTOM CATEGORIES TESTS ==========
class TestCustomCategories:
    """Custom categories tests - categories.py route module"""
    
    created_category_id = None
    
    def test_01_get_custom_categories(self, authenticated_client):
        """Test listing custom categories"""
        response = authenticated_client.get(f"{BASE_URL}/api/categories/custom")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Listed {len(data)} custom categories")
    
    def test_02_create_custom_category(self, authenticated_client):
        """Test creating a custom category"""
        payload = {
            "name": f"TEST_Category_{uuid.uuid4().hex[:8]}",
            "type": "expense"
        }
        response = authenticated_client.post(f"{BASE_URL}/api/categories/custom", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        TestCustomCategories.created_category_id = data["id"]
        print(f"✅ Created custom category: {data['id']}")
    
    def test_03_verify_category_created(self, authenticated_client):
        """Verify custom category was persisted"""
        response = authenticated_client.get(f"{BASE_URL}/api/categories/custom")
        assert response.status_code == 200
        data = response.json()
        category_ids = [c["id"] for c in data]
        assert TestCustomCategories.created_category_id in category_ids
        print("✅ Custom category verified in list")
    
    def test_04_update_custom_category(self, authenticated_client):
        """Test updating a custom category"""
        cat_id = TestCustomCategories.created_category_id
        payload = {"name": "TEST_Updated_Category"}
        response = authenticated_client.put(f"{BASE_URL}/api/categories/custom/{cat_id}", json=payload)
        assert response.status_code == 200
        print("✅ Custom category updated")
    
    def test_05_delete_custom_category(self, authenticated_client):
        """Test deleting a custom category"""
        cat_id = TestCustomCategories.created_category_id
        response = authenticated_client.delete(f"{BASE_URL}/api/categories/custom/{cat_id}")
        assert response.status_code == 200
        print("✅ Custom category deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
