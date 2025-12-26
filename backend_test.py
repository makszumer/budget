#!/usr/bin/env python3
"""
Backend API Testing Script for Financial Tracker
Tests the newly implemented features: Daily Quote Feature and Voice Input Improvements
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuration
BASE_URL = "https://fintrack-522.preview.emergentagent.com/api"
ADMIN_CREDENTIALS = {
    "email": "admin",
    "password": "admin"
}

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        
    def login_admin(self) -> bool:
        """Login as admin user and get auth token"""
        try:
            response = self.session.post(
                f"{BASE_URL}/users/login",
                json=ADMIN_CREDENTIALS,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.user_id = data.get("user_id")
                
                # Set auth header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                
                print("✅ Admin login successful")
                return True
            else:
                print(f"❌ Admin login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Admin login error: {str(e)}")
            return False
    
    def test_premium_buttons_fix(self) -> bool:
        """Test Premium Buttons Fix - Stripe checkout creation"""
        print("\n🔍 Testing Premium Buttons Fix...")
        
        try:
            # Test monthly subscription checkout creation
            response = self.session.post(
                f"{BASE_URL}/subscription/create-checkout",
                json={
                    "package_id": "monthly",
                    "origin_url": "https://fintrack-522.preview.emergentagent.com"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                checkout_url = data.get("checkout_url")
                session_id = data.get("session_id")
                
                if checkout_url and "stripe.com" in checkout_url:
                    print("✅ Premium buttons fix working - valid Stripe checkout URL returned")
                    print(f"   Checkout URL: {checkout_url[:50]}...")
                    print(f"   Session ID: {session_id}")
                    return True
                else:
                    print(f"❌ Invalid checkout URL returned: {checkout_url}")
                    return False
            else:
                print(f"❌ Stripe checkout creation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Premium buttons test error: {str(e)}")
            return False
    
    def test_custom_categories_feature(self) -> bool:
        """Test Custom Categories CRUD operations"""
        print("\n🔍 Testing Custom Categories Feature...")
        
        try:
            # Test 1: Get existing custom categories
            response = self.session.get(f"{BASE_URL}/categories/custom", timeout=10)
            if response.status_code != 200:
                print(f"❌ Get custom categories failed: {response.status_code} - {response.text}")
                return False
            
            initial_categories = response.json()
            print(f"✅ Get custom categories working - found {len(initial_categories)} existing categories")
            
            # Test 2: Create new expense category
            new_expense_category = {
                "name": "Coffee Shop Visits",
                "type": "expense"
            }
            
            response = self.session.post(
                f"{BASE_URL}/categories/custom",
                json=new_expense_category,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Create expense category failed: {response.status_code} - {response.text}")
                return False
            
            expense_category_data = response.json()
            expense_category_id = expense_category_data.get("id")
            print(f"✅ Create expense category working - ID: {expense_category_id}")
            
            # Test 3: Create new income category
            new_income_category = {
                "name": "Freelance Tips",
                "type": "income"
            }
            
            response = self.session.post(
                f"{BASE_URL}/categories/custom",
                json=new_income_category,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Create income category failed: {response.status_code} - {response.text}")
                return False
            
            income_category_data = response.json()
            income_category_id = income_category_data.get("id")
            print(f"✅ Create income category working - ID: {income_category_id}")
            
            # Test 4: Update expense category
            updated_data = {"name": "Premium Coffee Shops"}
            
            response = self.session.put(
                f"{BASE_URL}/categories/custom/{expense_category_id}",
                json=updated_data,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Update category failed: {response.status_code} - {response.text}")
                return False
            
            print("✅ Update category working")
            
            # Test 5: Verify categories appear in list
            response = self.session.get(f"{BASE_URL}/categories/custom", timeout=10)
            if response.status_code == 200:
                updated_categories = response.json()
                found_expense = any(cat.get("name") == "Premium Coffee Shops" for cat in updated_categories)
                found_income = any(cat.get("name") == "Freelance Tips" for cat in updated_categories)
                
                if found_expense and found_income:
                    print("✅ Categories appear in list correctly")
                else:
                    print("❌ Categories not found in updated list")
                    return False
            
            # Test 6: Delete categories (cleanup)
            for cat_id in [expense_category_id, income_category_id]:
                response = self.session.delete(f"{BASE_URL}/categories/custom/{cat_id}", timeout=10)
                if response.status_code != 200:
                    print(f"⚠️ Warning: Could not delete category {cat_id}")
            
            print("✅ Custom categories feature fully working")
            return True
            
        except Exception as e:
            print(f"❌ Custom categories test error: {str(e)}")
            return False
    
    def test_daily_quote_feature(self) -> bool:
        """Test Daily Quote Feature"""
        print("\n🔍 Testing Daily Quote Feature...")
        
        try:
            # Test 1: Get quote of the day
            response = self.session.get(f"{BASE_URL}/quote-of-day", timeout=10)
            
            if response.status_code != 200:
                print(f"❌ Daily quote API failed: {response.status_code} - {response.text}")
                return False
            
            quote_data = response.json()
            
            # Verify required fields
            required_fields = ["quote", "author", "date", "category"]
            for field in required_fields:
                if field not in quote_data:
                    print(f"❌ Missing required field: {field}")
                    return False
            
            print(f"✅ Daily quote API working")
            print(f"   Quote: {quote_data['quote'][:50]}...")
            print(f"   Author: {quote_data['author']}")
            print(f"   Date: {quote_data['date']}")
            print(f"   Category: {quote_data['category']}")
            
            # Test 2: Call again to verify caching (should return same quote)
            response2 = self.session.get(f"{BASE_URL}/quote-of-day", timeout=10)
            
            if response2.status_code != 200:
                print(f"❌ Second daily quote call failed: {response2.status_code}")
                return False
            
            quote_data2 = response2.json()
            
            if quote_data["quote"] == quote_data2["quote"] and quote_data["date"] == quote_data2["date"]:
                print("✅ Quote caching working - same quote returned for same day")
            else:
                print("❌ Quote caching failed - different quotes returned")
                return False
            
            print("✅ Daily quote feature fully working")
            return True
            
        except Exception as e:
            print(f"❌ Daily quote test error: {str(e)}")
            return False
    
    def test_voice_input_improvements(self) -> bool:
        """Test Voice Input Improvements with enhanced intent detection"""
        print("\n🔍 Testing Voice Input Improvements...")
        
        try:
            # Test 1: Unclear intent (no income/expense keywords) - should ask for type clarification
            unclear_intent_request = {"text": "50 dollars"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=unclear_intent_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Voice input parsing failed: {response.status_code} - {response.text}")
                return False
            
            unclear_data = response.json()
            
            if unclear_data.get("needs_type_clarification") == True:
                parsed_amount = unclear_data.get("parsed_amount")
                print(f"✅ Unclear intent triggers type clarification correctly")
                print(f"   Parsed amount: ${parsed_amount}")
                
                if parsed_amount != 50.0:
                    print("❌ Type clarification response missing correct amount")
                    return False
            else:
                print("❌ Unclear intent should trigger type clarification but didn't")
                return False
            
            # Test 2: Clear expense with category
            clear_expense_request = {"text": "I spent 30 dollars on groceries"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=clear_expense_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Clear expense parsing failed: {response.status_code} - {response.text}")
                return False
            
            expense_data = response.json()
            
            if expense_data.get("success") == True:
                transaction_data = expense_data.get("data", {})
                transaction_type = transaction_data.get("type")
                category = transaction_data.get("category")
                amount = transaction_data.get("amount")
                
                print(f"✅ Clear expense processes successfully")
                print(f"   Type: {transaction_type}")
                print(f"   Amount: ${amount}")
                print(f"   Category: {category}")
                
                if transaction_type != "expense" or category != "Groceries" or amount != 30.0:
                    print("❌ Clear expense parsing returned incorrect data")
                    return False
            else:
                print("❌ Clear expense should succeed but didn't")
                return False
            
            # Test 3: Clear income
            clear_income_request = {"text": "I earned 1000 dollars from salary"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=clear_income_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Clear income parsing failed: {response.status_code} - {response.text}")
                return False
            
            income_data = response.json()
            
            if income_data.get("success") == True:
                transaction_data = income_data.get("data", {})
                transaction_type = transaction_data.get("type")
                category = transaction_data.get("category")
                amount = transaction_data.get("amount")
                
                print(f"✅ Clear income processes successfully")
                print(f"   Type: {transaction_type}")
                print(f"   Amount: ${amount}")
                print(f"   Category: {category}")
                
                if transaction_type != "income" or category != "Salary / wages" or amount != 1000.0:
                    print("❌ Clear income parsing returned incorrect data")
                    return False
            else:
                print("❌ Clear income should succeed but didn't")
                return False
            
            # Test 4: Expense with unclear category - should ask for category clarification
            unclear_category_request = {"text": "spent 100 dollars"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=unclear_category_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Unclear category parsing failed: {response.status_code} - {response.text}")
                return False
            
            unclear_cat_data = response.json()
            
            if unclear_cat_data.get("needs_clarification") == True:
                suggested_categories = unclear_cat_data.get("suggested_categories", [])
                parsed_type = unclear_cat_data.get("parsed_type")
                parsed_amount = unclear_cat_data.get("parsed_amount")
                
                print(f"✅ Unclear category triggers clarification correctly")
                print(f"   Parsed type: {parsed_type}")
                print(f"   Parsed amount: ${parsed_amount}")
                print(f"   Suggested categories: {suggested_categories}")
                
                if not suggested_categories or parsed_type != "expense" or parsed_amount != 100.0:
                    print("❌ Category clarification response missing required data")
                    return False
                
                # Verify suggested categories include user's custom categories
                if "Groceries" not in suggested_categories:
                    print("❌ Suggested categories should include default categories")
                    return False
            else:
                print("❌ Unclear category should trigger clarification but didn't")
                return False
            
            print("✅ Voice input improvements fully working")
            return True
            
        except Exception as e:
            print(f"❌ Voice input improvements test error: {str(e)}")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for New Features")
        print("=" * 60)
        
        # Login first
        if not self.login_admin():
            return {
                "login": False,
                "daily_quote": False,
                "voice_input_improvements": False
            }
        
        # Run tests
        results = {
            "login": True,
            "daily_quote": self.test_daily_quote_feature(),
            "voice_input_improvements": self.test_voice_input_improvements()
        }
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        for test_name, passed in results.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
        
        total_tests = len(results)
        passed_tests = sum(results.values())
        
        print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All tests passed!")
        else:
            print("⚠️ Some tests failed - see details above")
        
        return results

if __name__ == "__main__":
    tester = BackendTester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    if not all(results.values()):
        sys.exit(1)
    else:
        sys.exit(0)