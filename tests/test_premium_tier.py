"""
Premium Tier Enhancement Tests for FinanceHub Application
Tests: Free Trial, Trial Status, User /me endpoint with trial fields, Discount eligibility
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://budgetbox.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@financehub.com"
ADMIN_PASSWORD = "admin"
TRIAL_TEST_EMAIL = f"trialtest_{uuid.uuid4().hex[:8]}@example.com"
TRIAL_TEST_PASSWORD = "test123"
TRIAL_TEST_USERNAME = f"trialuser_{uuid.uuid4().hex[:8]}"


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
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def trial_user_data(api_client):
    """Register a new user for trial testing"""
    response = api_client.post(f"{BASE_URL}/api/users/register", json={
        "email": TRIAL_TEST_EMAIL,
        "username": TRIAL_TEST_USERNAME,
        "password": TRIAL_TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return {
            "token": data["access_token"],
            "user_id": data["user_id"],
            "email": TRIAL_TEST_EMAIL
        }
    pytest.skip(f"User registration failed: {response.text}")


class TestUserMeEndpoint:
    """Test /users/me endpoint returns trial fields"""
    
    def test_me_endpoint_returns_trial_fields(self, api_client, admin_token):
        """Test that /me endpoint returns all trial-related fields"""
        response = api_client.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields exist
        assert "user_id" in data
        assert "email" in data
        assert "username" in data
        assert "subscription_level" in data
        assert "is_premium" in data
        
        # Check trial-specific fields exist
        assert "trial_started_at" in data, "Missing trial_started_at field"
        assert "trial_expires_at" in data, "Missing trial_expires_at field"
        assert "trial_used" in data, "Missing trial_used field"
        assert "is_trial" in data, "Missing is_trial field"
        assert "discount_eligible" in data, "Missing discount_eligible field"
        assert "discount_used" in data, "Missing discount_used field"
        
        print(f"✅ /me endpoint returns all trial fields")
        print(f"   - is_premium: {data['is_premium']}")
        print(f"   - is_trial: {data['is_trial']}")
        print(f"   - trial_used: {data['trial_used']}")
        print(f"   - discount_eligible: {data['discount_eligible']}")


class TestFreeTrialEndpoint:
    """Test /subscription/start-trial endpoint"""
    
    def test_start_trial_success(self, api_client, trial_user_data):
        """Test starting a 3-day free trial for new user"""
        token = trial_user_data["token"]
        
        response = api_client.post(
            f"{BASE_URL}/api/subscription/start-trial",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["status"] == "success"
        assert "trial_started_at" in data
        assert "trial_expires_at" in data
        assert "days_remaining" in data
        assert data["days_remaining"] == 3
        assert "3-day free trial has started" in data["message"]
        
        print(f"✅ Trial started successfully")
        print(f"   - Started: {data['trial_started_at']}")
        print(f"   - Expires: {data['trial_expires_at']}")
        print(f"   - Days remaining: {data['days_remaining']}")
    
    def test_start_trial_twice_fails(self, api_client, trial_user_data):
        """Test that starting trial twice returns error"""
        token = trial_user_data["token"]
        
        response = api_client.post(
            f"{BASE_URL}/api/subscription/start-trial",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "already used" in data["detail"].lower()
        
        print(f"✅ Second trial attempt correctly rejected: {data['detail']}")
    
    def test_trial_user_has_premium_access(self, api_client, trial_user_data):
        """Test that trial user gets is_premium=true during trial"""
        token = trial_user_data["token"]
        
        response = api_client.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Trial user should have premium access
        assert data["is_trial"] == True, "is_trial should be True"
        assert data["is_premium"] == True, "is_premium should be True during trial"
        assert data["trial_used"] == True, "trial_used should be True"
        assert data["trial_expires_at"] is not None, "trial_expires_at should be set"
        
        print(f"✅ Trial user has premium access")
        print(f"   - is_trial: {data['is_trial']}")
        print(f"   - is_premium: {data['is_premium']}")
        print(f"   - trial_expires_at: {data['trial_expires_at']}")


class TestTrialStatusEndpoint:
    """Test /subscription/trial-status endpoint"""
    
    def test_trial_status_for_trial_user(self, api_client, trial_user_data):
        """Test trial status endpoint returns correct data for trial user"""
        token = trial_user_data["token"]
        
        response = api_client.get(
            f"{BASE_URL}/api/subscription/trial-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "trial_used" in data
        assert "is_trial_active" in data
        assert "trial_started_at" in data
        assert "trial_expires_at" in data
        assert "days_remaining" in data
        assert "discount_eligible" in data
        assert "discount_used" in data
        
        # Verify values for active trial
        assert data["trial_used"] == True
        assert data["is_trial_active"] == True
        assert data["days_remaining"] > 0
        assert data["discount_eligible"] == False  # Not eligible while trial is active
        
        print(f"✅ Trial status endpoint working")
        print(f"   - is_trial_active: {data['is_trial_active']}")
        print(f"   - days_remaining: {data['days_remaining']}")
        print(f"   - discount_eligible: {data['discount_eligible']}")


class TestAdminPremiumStatus:
    """Test admin user premium status"""
    
    def test_admin_is_premium(self, api_client, admin_token):
        """Test that admin user is always premium"""
        response = api_client.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_premium"] == True, "Admin should always be premium"
        assert data["is_trial"] == False, "Admin should not be on trial"
        
        print(f"✅ Admin user has premium status")
        print(f"   - email: {data['email']}")
        print(f"   - is_premium: {data['is_premium']}")
        print(f"   - is_trial: {data['is_trial']}")


class TestFreeUserStatus:
    """Test free user without trial"""
    
    def test_new_user_is_free(self, api_client):
        """Test that new user starts as free tier"""
        # Register a new user
        new_email = f"freeuser_{uuid.uuid4().hex[:8]}@example.com"
        new_username = f"freeuser_{uuid.uuid4().hex[:8]}"
        
        response = api_client.post(f"{BASE_URL}/api/users/register", json={
            "email": new_email,
            "username": new_username,
            "password": "test123"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # Check user status
        response = api_client.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["subscription_level"] == "free"
        assert data["is_premium"] == False
        assert data["is_trial"] == False
        assert data["trial_used"] == False
        
        print(f"✅ New user starts as free tier")
        print(f"   - subscription_level: {data['subscription_level']}")
        print(f"   - is_premium: {data['is_premium']}")
        print(f"   - trial_used: {data['trial_used']}")


class TestSubscriptionPackages:
    """Test subscription checkout endpoints"""
    
    def test_create_checkout_monthly(self, api_client, admin_token):
        """Test creating monthly checkout session"""
        response = api_client.post(
            f"{BASE_URL}/api/subscription/create-checkout",
            json={
                "package_id": "monthly",
                "origin_url": "https://budgetbox.preview.emergentagent.com",
                "apply_discount": False
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "checkout_url" in data
        assert "session_id" in data
        assert data["checkout_url"].startswith("https://")
        
        print(f"✅ Monthly checkout session created")
        print(f"   - session_id: {data['session_id'][:20]}...")
    
    def test_create_checkout_yearly(self, api_client, admin_token):
        """Test creating yearly checkout session"""
        response = api_client.post(
            f"{BASE_URL}/api/subscription/create-checkout",
            json={
                "package_id": "yearly",
                "origin_url": "https://budgetbox.preview.emergentagent.com",
                "apply_discount": False
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "checkout_url" in data
        assert "session_id" in data
        
        print(f"✅ Yearly checkout session created")
    
    def test_invalid_package_fails(self, api_client, admin_token):
        """Test that invalid package ID returns error"""
        response = api_client.post(
            f"{BASE_URL}/api/subscription/create-checkout",
            json={
                "package_id": "invalid_package",
                "origin_url": "https://budgetbox.preview.emergentagent.com",
                "apply_discount": False
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 422  # Validation error
        
        print(f"✅ Invalid package correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
