"""
Stripe Checkout and Dashboard Layout Tests for FinanceHub Application
Tests: Stripe checkout button, Dashboard layout order, Quote visibility, PRO badge
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://budgetbox.preview.emergentagent.com')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get authentication token for admin user"""
    response = api_client.post(f"{BASE_URL}/api/users/login", json={
        "email": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def free_user_data(api_client):
    """Register a new free user for testing"""
    random_suffix = uuid.uuid4().hex[:8]
    email = f"freeuser_{random_suffix}@test.com"
    username = f"freeuser_{random_suffix}"
    password = "Test123!"
    
    response = api_client.post(f"{BASE_URL}/api/users/register", json={
        "email": email,
        "username": username,
        "password": password
    })
    if response.status_code == 200:
        data = response.json()
        return {
            "token": data["access_token"],
            "user_id": data["user_id"],
            "email": email,
            "username": username
        }
    pytest.skip(f"User registration failed: {response.text}")


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login_with_username(self, api_client):
        """Test admin can login with username 'admin' and password 'admin'"""
        response = api_client.post(f"{BASE_URL}/api/users/login", json={
            "email": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        # Admin login returns is_premium=True (admin has premium access)
        assert data.get("is_premium") == True, "Admin should have premium access"
        print("✅ Admin login works with username 'admin' and password 'admin'")


class TestStripeCheckout:
    """Test Stripe checkout endpoint"""
    
    def test_create_checkout_monthly(self, api_client, free_user_data):
        """Test creating a monthly checkout session"""
        token = free_user_data["token"]
        
        response = api_client.post(
            f"{BASE_URL}/api/subscription/create-checkout",
            json={
                "package_id": "monthly",
                "origin_url": "https://budgetbox.preview.emergentagent.com",
                "apply_discount": False
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Checkout creation failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "checkout_url" in data, "Missing checkout_url in response"
        assert "session_id" in data, "Missing session_id in response"
        
        # Verify checkout URL is a valid Stripe URL
        checkout_url = data["checkout_url"]
        assert "stripe.com" in checkout_url or "checkout" in checkout_url, f"Invalid checkout URL: {checkout_url}"
        
        print(f"✅ Monthly checkout session created successfully")
        print(f"   - Session ID: {data['session_id'][:20]}...")
        print(f"   - Checkout URL starts with: {checkout_url[:50]}...")
    
    def test_create_checkout_yearly(self, api_client, free_user_data):
        """Test creating a yearly checkout session"""
        token = free_user_data["token"]
        
        response = api_client.post(
            f"{BASE_URL}/api/subscription/create-checkout",
            json={
                "package_id": "yearly",
                "origin_url": "https://budgetbox.preview.emergentagent.com",
                "apply_discount": False
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Checkout creation failed: {response.text}"
        data = response.json()
        
        assert "checkout_url" in data
        assert "session_id" in data
        assert "stripe.com" in data["checkout_url"] or "checkout" in data["checkout_url"]
        
        print(f"✅ Yearly checkout session created successfully")
    
    def test_checkout_requires_auth(self, api_client):
        """Test that checkout endpoint requires authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/subscription/create-checkout",
            json={
                "package_id": "monthly",
                "origin_url": "https://budgetbox.preview.emergentagent.com",
                "apply_discount": False
            }
        )
        
        # Should fail without auth token
        assert response.status_code in [401, 403, 422], f"Expected auth error, got: {response.status_code}"
        print("✅ Checkout endpoint correctly requires authentication")
    
    def test_checkout_invalid_package(self, api_client, free_user_data):
        """Test that invalid package ID is rejected"""
        token = free_user_data["token"]
        
        response = api_client.post(
            f"{BASE_URL}/api/subscription/create-checkout",
            json={
                "package_id": "invalid_package",
                "origin_url": "https://budgetbox.preview.emergentagent.com",
                "apply_discount": False
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should fail with invalid package
        assert response.status_code in [400, 422], f"Expected validation error, got: {response.status_code}"
        print("✅ Invalid package ID correctly rejected")


class TestUserProfile:
    """Test user profile endpoints"""
    
    def test_free_user_profile(self, api_client, free_user_data):
        """Test that new user starts as free tier"""
        token = free_user_data["token"]
        
        response = api_client.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Free user should not be premium
        assert data.get("is_premium") == False or data.get("subscription_level") == "free"
        print("✅ New user correctly starts as free tier")
    
    def test_admin_is_premium(self, api_client, admin_token):
        """Test that admin user has premium access"""
        response = api_client.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Admin should have premium access
        assert data.get("is_premium") == True or data.get("role") == "admin"
        print("✅ Admin user has premium access")


class TestTrialEndpoint:
    """Test trial functionality"""
    
    def test_start_trial(self, api_client):
        """Test starting a free trial for new user"""
        # Register a new user
        random_suffix = uuid.uuid4().hex[:8]
        email = f"trialtest_{random_suffix}@test.com"
        username = f"trialtest_{random_suffix}"
        password = "Test123!"
        
        reg_response = api_client.post(f"{BASE_URL}/api/users/register", json={
            "email": email,
            "username": username,
            "password": password
        })
        
        if reg_response.status_code != 200:
            pytest.skip(f"User registration failed: {reg_response.text}")
        
        token = reg_response.json()["access_token"]
        
        # Start trial
        response = api_client.post(
            f"{BASE_URL}/api/subscription/start-trial",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Start trial failed: {response.text}"
        data = response.json()
        
        assert data.get("status") == "success"
        assert "trial_expires_at" in data
        print("✅ Free trial started successfully")
    
    def test_trial_cannot_start_twice(self, api_client):
        """Test that trial cannot be started twice"""
        # Register a new user
        random_suffix = uuid.uuid4().hex[:8]
        email = f"trialtwice_{random_suffix}@test.com"
        username = f"trialtwice_{random_suffix}"
        password = "Test123!"
        
        reg_response = api_client.post(f"{BASE_URL}/api/users/register", json={
            "email": email,
            "username": username,
            "password": password
        })
        
        if reg_response.status_code != 200:
            pytest.skip(f"User registration failed: {reg_response.text}")
        
        token = reg_response.json()["access_token"]
        
        # Start trial first time
        response1 = api_client.post(
            f"{BASE_URL}/api/subscription/start-trial",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        
        # Try to start trial second time
        response2 = api_client.post(
            f"{BASE_URL}/api/subscription/start-trial",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should fail
        assert response2.status_code == 400, f"Expected 400, got: {response2.status_code}"
        print("✅ Trial correctly cannot be started twice")


class TestQuoteEndpoint:
    """Test quote of day endpoint"""
    
    def test_quote_endpoint(self, api_client):
        """Test that quote endpoint returns a quote"""
        response = api_client.get(f"{BASE_URL}/api/quote-of-day")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "quote" in data
        assert "author" in data
        assert len(data["quote"]) > 0
        print(f"✅ Quote endpoint working: \"{data['quote'][:50]}...\" - {data['author']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
