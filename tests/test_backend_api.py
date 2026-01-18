"""
Backend API Tests for FinanceHub Application
Tests: Authentication, Budget Envelopes, Transactions, Quote of Day
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://financepal-148.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@financehub.com"
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


class TestHealthCheck:
    """Basic API health check tests"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint returns success"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Financial Tracker API"
        print("✅ API root endpoint working")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self, api_client):
        """Test successful login with admin credentials"""
        response = api_client.post(f"{BASE_URL}/api/users/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user_id" in data
        assert "is_premium" in data
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0
        print(f"✅ Login successful, is_premium: {data['is_premium']}")
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials returns 401"""
        response = api_client.post(f"{BASE_URL}/api/users/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")


class TestQuoteOfDay:
    """Quote of Day feature tests"""
    
    def test_get_quote(self, api_client):
        """Test quote of day endpoint returns valid quote"""
        response = api_client.get(f"{BASE_URL}/api/quote-of-day")
        assert response.status_code == 200
        data = response.json()
        assert "quote" in data
        assert "author" in data
        assert "date" in data
        assert isinstance(data["quote"], str)
        assert len(data["quote"]) > 0
        print(f"✅ Quote retrieved: '{data['quote'][:50]}...'")


class TestBudgetEnvelopes:
    """Budget Envelopes CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client):
        """Store client for use in tests"""
        self.client = authenticated_client
        self.created_envelope_id = None
        self.created_transaction_id = None
    
    def test_01_list_envelopes(self):
        """Test listing budget envelopes"""
        response = self.client.get(f"{BASE_URL}/api/budget-envelopes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Listed {len(data)} envelopes")
    
    def test_02_create_envelope(self):
        """Test creating a new budget envelope"""
        unique_name = f"TEST_Envelope_{uuid.uuid4().hex[:8]}"
        create_payload = {
            "name": unique_name,
            "target_amount": 3000,
            "currency": "USD",
            "description": "Test envelope for automated testing"
        }
        response = self.client.post(f"{BASE_URL}/api/budget-envelopes", json=create_payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "message" in data
        TestBudgetEnvelopes.created_envelope_id = data["id"]
        print(f"✅ Created envelope: {data['id']}")
    
    def test_03_verify_envelope_created(self):
        """Verify envelope was persisted by fetching it"""
        response = self.client.get(f"{BASE_URL}/api/budget-envelopes")
        assert response.status_code == 200
        data = response.json()
        envelope_ids = [e["id"] for e in data]
        assert TestBudgetEnvelopes.created_envelope_id in envelope_ids
        print("✅ Envelope verified in list")
    
    def test_04_add_transaction_to_envelope(self):
        """Test adding a transaction to an envelope"""
        envelope_id = TestBudgetEnvelopes.created_envelope_id
        assert envelope_id is not None, "Envelope ID not set from previous test"
        
        transaction_payload = {
            "type": "income",
            "amount": 500,
            "description": "Test deposit",
            "category": "Savings",
            "date": "2025-01-14"
        }
        response = self.client.post(
            f"{BASE_URL}/api/budget-envelopes/{envelope_id}/transactions",
            json=transaction_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        TestBudgetEnvelopes.created_transaction_id = data["id"]
        print(f"✅ Created transaction: {data['id']}")
    
    def test_05_verify_transaction_created(self):
        """Verify transaction was persisted"""
        envelope_id = TestBudgetEnvelopes.created_envelope_id
        response = self.client.get(f"{BASE_URL}/api/budget-envelopes/{envelope_id}/transactions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        transaction_ids = [t["id"] for t in data]
        assert TestBudgetEnvelopes.created_transaction_id in transaction_ids
        print(f"✅ Transaction verified, total: {len(data)}")
    
    def test_06_delete_transaction(self):
        """Test deleting a transaction from envelope"""
        envelope_id = TestBudgetEnvelopes.created_envelope_id
        transaction_id = TestBudgetEnvelopes.created_transaction_id
        
        response = self.client.delete(
            f"{BASE_URL}/api/budget-envelopes/{envelope_id}/transactions/{transaction_id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✅ Transaction deleted")
    
    def test_07_verify_transaction_deleted(self):
        """Verify transaction was removed"""
        envelope_id = TestBudgetEnvelopes.created_envelope_id
        response = self.client.get(f"{BASE_URL}/api/budget-envelopes/{envelope_id}/transactions")
        assert response.status_code == 200
        data = response.json()
        transaction_ids = [t["id"] for t in data]
        assert TestBudgetEnvelopes.created_transaction_id not in transaction_ids
        print("✅ Transaction deletion verified")
    
    def test_08_delete_envelope(self):
        """Test deleting a budget envelope"""
        envelope_id = TestBudgetEnvelopes.created_envelope_id
        response = self.client.delete(f"{BASE_URL}/api/budget-envelopes/{envelope_id}")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✅ Envelope deleted")
    
    def test_09_verify_envelope_deleted(self):
        """Verify envelope was removed"""
        response = self.client.get(f"{BASE_URL}/api/budget-envelopes")
        assert response.status_code == 200
        data = response.json()
        envelope_ids = [e["id"] for e in data]
        assert TestBudgetEnvelopes.created_envelope_id not in envelope_ids
        print("✅ Envelope deletion verified")


class TestCurrencies:
    """Currency endpoint tests"""
    
    def test_get_currencies(self, api_client):
        """Test currencies endpoint returns list"""
        response = api_client.get(f"{BASE_URL}/api/currencies")
        assert response.status_code == 200
        data = response.json()
        assert "currencies" in data
        assert isinstance(data["currencies"], list)
        assert "USD" in data["currencies"]
        print(f"✅ Retrieved {len(data['currencies'])} currencies")


class TestTransactions:
    """Main transaction endpoint tests"""
    
    def test_get_transactions(self, authenticated_client):
        """Test listing transactions"""
        response = authenticated_client.get(f"{BASE_URL}/api/transactions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Listed {len(data)} transactions")
    
    def test_get_summary(self, authenticated_client):
        """Test transaction summary endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/transactions/summary")
        assert response.status_code == 200
        data = response.json()
        assert "totalIncome" in data
        assert "totalExpenses" in data
        assert "balance" in data
        print(f"✅ Summary: Income={data['totalIncome']}, Expenses={data['totalExpenses']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
