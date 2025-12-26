#!/usr/bin/env python3
"""
Backend API Testing Script for Financial Tracker
Tests the newly implemented features: Premium Buttons, Custom Categories, Voice Input
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
                json={"package": "monthly"},
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
    
    def test_voice_input_clarification(self) -> bool:
        """Test Voice Input Clarification Flow"""
        print("\n🔍 Testing Voice Input Clarification Flow...")
        
        try:
            # Test 1: Unclear text that should trigger clarification
            unclear_request = {"text": "spent 50 dollars"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=unclear_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Voice input parsing failed: {response.status_code} - {response.text}")
                return False
            
            unclear_data = response.json()
            
            if unclear_data.get("needs_clarification") == True:
                suggested_categories = unclear_data.get("suggested_categories", [])
                parsed_amount = unclear_data.get("parsed_amount")
                
                print(f"✅ Unclear text triggers clarification correctly")
                print(f"   Parsed amount: ${parsed_amount}")
                print(f"   Suggested categories: {suggested_categories}")
                
                if not suggested_categories or parsed_amount != 50.0:
                    print("❌ Clarification response missing required data")
                    return False
            else:
                print("❌ Unclear text should trigger clarification but didn't")
                return False
            
            # Test 2: Clear text that should succeed
            clear_request = {"text": "spent 50 dollars on groceries"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=clear_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Clear voice input parsing failed: {response.status_code} - {response.text}")
                return False
            
            clear_data = response.json()
            
            if clear_data.get("success") == True and clear_data.get("needs_clarification") == False:
                transaction_data = clear_data.get("data", {})
                category = transaction_data.get("category")
                amount = transaction_data.get("amount")
                
                print(f"✅ Clear text processes successfully")
                print(f"   Amount: ${amount}")
                print(f"   Category: {category}")
                
                if category != "Groceries" or amount != 50.0:
                    print("❌ Clear text parsing returned incorrect data")
                    return False
            else:
                print("❌ Clear text should succeed but didn't")
                return False
            
            print("✅ Voice input clarification flow fully working")
            return True
            
        except Exception as e:
            print(f"❌ Voice input test error: {str(e)}")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for New Features")
        print("=" * 60)
        
        # Login first
        if not self.login_admin():
            return {
                "login": False,
                "premium_buttons": False,
                "custom_categories": False,
                "voice_input": False
            }
        
        # Run tests
        results = {
            "login": True,
            "premium_buttons": self.test_premium_buttons_fix(),
            "custom_categories": self.test_custom_categories_feature(),
            "voice_input": self.test_voice_input_clarification()
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