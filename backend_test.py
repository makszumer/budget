#!/usr/bin/env python3
"""
Backend API Testing Script for Financial Tracker
Tests analytics endpoints for custom date range filtering functionality
"""

import requests
import json
import sys
from typing import Dict, Any
from datetime import datetime, date

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
        """Test Voice Input Improvements - NEW SYSTEM: Always requires category confirmation"""
        print("\n🔍 Testing Voice Input Improvements (New Category Handling System)...")
        
        try:
            # Test 1: Always requires category confirmation - NEVER auto-saves
            groceries_request = {"text": "spent 50 dollars on groceries"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=groceries_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Voice input parsing failed: {response.status_code} - {response.text}")
                return False
            
            groceries_data = response.json()
            
            # CRITICAL: Should NEVER return success=true, always ask for category
            if groceries_data.get("success") == True:
                print("❌ CRITICAL FAILURE: System auto-saved transaction - should ALWAYS ask for category confirmation")
                return False
            
            if groceries_data.get("needs_clarification") != True:
                print("❌ System should always ask for category confirmation")
                return False
            
            print("✅ Test 1 PASSED: Always requires category confirmation (never auto-saves)")
            
            # Test 2: Returns ALL categories grouped
            general_request = {"text": "spent 100 dollars"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=general_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ General expense parsing failed: {response.status_code} - {response.text}")
                return False
            
            general_data = response.json()
            all_categories = general_data.get("all_categories", {})
            
            # Verify all category groups are present
            expected_groups = ["Living & Housing", "Transportation", "Food & Dining"]
            for group in expected_groups:
                if group not in all_categories:
                    print(f"❌ Missing category group: {group}")
                    return False
                
                if not isinstance(all_categories[group], list) or len(all_categories[group]) == 0:
                    print(f"❌ Category group {group} should contain multiple options")
                    return False
            
            print("✅ Test 2 PASSED: Returns ALL categories grouped correctly")
            print(f"   Found {len(all_categories)} category groups")
            
            # Test 3: Synonym matching for "uber"
            uber_request = {"text": "spent 20 dollars on uber"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=uber_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Uber synonym parsing failed: {response.status_code} - {response.text}")
                return False
            
            uber_data = response.json()
            matched_categories = uber_data.get("matched_categories", [])
            
            if "Public Transport" not in matched_categories:
                print(f"❌ 'uber' should match 'Public Transport' category")
                print(f"   Matched categories: {matched_categories}")
                return False
            
            print("✅ Test 3 PASSED: Synonym matching for 'uber' → 'Public Transport'")
            
            # Test 4: Synonym matching for store names (walmart)
            walmart_request = {"text": "spent 50 at walmart"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=walmart_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Walmart synonym parsing failed: {response.status_code} - {response.text}")
                return False
            
            walmart_data = response.json()
            matched_categories = walmart_data.get("matched_categories", [])
            
            if "Groceries" not in matched_categories:
                print(f"❌ 'walmart' should match 'Groceries' category")
                print(f"   Matched categories: {matched_categories}")
                return False
            
            print("✅ Test 4 PASSED: Synonym matching for 'walmart' → 'Groceries'")
            
            # Test 5: Synonym matching for "netflix"
            netflix_request = {"text": "paid 15 dollars for netflix"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=netflix_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Netflix synonym parsing failed: {response.status_code} - {response.text}")
                return False
            
            netflix_data = response.json()
            matched_categories = netflix_data.get("matched_categories", [])
            
            if "Subscriptions" not in matched_categories:
                print(f"❌ 'netflix' should match 'Subscriptions' category")
                print(f"   Matched categories: {matched_categories}")
                return False
            
            print("✅ Test 5 PASSED: Synonym matching for 'netflix' → 'Subscriptions'")
            
            # Test 6: Synonym matching for "starbucks"
            starbucks_request = {"text": "spent 5 dollars at starbucks"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=starbucks_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Starbucks synonym parsing failed: {response.status_code} - {response.text}")
                return False
            
            starbucks_data = response.json()
            matched_categories = starbucks_data.get("matched_categories", [])
            
            if "Restaurants / Cafes" not in matched_categories:
                print(f"❌ 'starbucks' should match 'Restaurants / Cafes' category")
                print(f"   Matched categories: {matched_categories}")
                return False
            
            print("✅ Test 6 PASSED: Synonym matching for 'starbucks' → 'Restaurants / Cafes'")
            
            # Test 7: Type clarification still works
            unclear_request = {"text": "50 dollars"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=unclear_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Type clarification parsing failed: {response.status_code} - {response.text}")
                return False
            
            unclear_data = response.json()
            
            if unclear_data.get("needs_type_clarification") != True:
                print("❌ Unclear intent should trigger type clarification")
                return False
            
            print("✅ Test 7 PASSED: Type clarification still works for unclear intent")
            
            # Test 8: Income detection with category prompt
            income_request = {"text": "earned 1000 dollars from work"}
            
            response = self.session.post(
                f"{BASE_URL}/parse-voice-transaction",
                json=income_request,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Income parsing failed: {response.status_code} - {response.text}")
                return False
            
            income_data = response.json()
            
            # Should still ask for category confirmation even for income
            if income_data.get("needs_clarification") != True:
                print("❌ Income should also trigger category confirmation")
                return False
            
            if income_data.get("parsed_type") != "income":
                print("❌ Should correctly detect income type")
                return False
            
            # Should have income categories
            all_categories = income_data.get("all_categories", {})
            income_groups = ["Employment Income", "Self-Employment / Business"]
            
            for group in income_groups:
                if group not in all_categories:
                    print(f"❌ Missing income category group: {group}")
                    return False
            
            print("✅ Test 8 PASSED: Income detection with category prompt works")
            
            print("\n✅ ALL VOICE INPUT TESTS PASSED")
            print("   ✓ Never auto-saves (always asks for category)")
            print("   ✓ Returns complete category groups")
            print("   ✓ Synonym matching works for all test cases")
            print("   ✓ Type clarification still functional")
            print("   ✓ Income categories properly handled")
            
            return True
            
        except Exception as e:
            print(f"❌ Voice input improvements test error: {str(e)}")
            return False
    
    def test_analytics_date_filtering_detailed(self) -> bool:
        """Detailed test of Analytics endpoints for date filtering functionality"""
        print("\n🔍 Detailed Testing of Analytics Date Range Filtering...")
        
        try:
            # Test 1: Check current analytics endpoint implementation
            print("📋 Testing current analytics endpoints without date filtering...")
            
            # Get all analytics data
            response = self.session.get(f"{BASE_URL}/analytics", timeout=10)
            if response.status_code != 200:
                print(f"❌ Analytics endpoint failed: {response.status_code}")
                return False
            
            all_analytics = response.json()
            print("✅ Basic analytics endpoint working")
            print(f"   Expense categories: {len(all_analytics.get('expense_breakdown', []))}")
            print(f"   Income categories: {len(all_analytics.get('income_breakdown', []))}")
            
            # Test 2: Try date filtering parameters
            print("\n🔍 Testing date filtering parameters...")
            
            date_params = {
                "start_date": "2025-01-01",
                "end_date": "2025-06-30"
            }
            
            response = self.session.get(
                f"{BASE_URL}/analytics",
                params=date_params,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ CRITICAL: Analytics endpoint rejects date parameters: {response.status_code}")
                print(f"   Error: {response.text}")
                return False
            
            filtered_analytics = response.json()
            
            # Compare the data structures
            if all_analytics == filtered_analytics:
                print("❌ CRITICAL: Date filtering is NOT implemented")
                print("   Filtered and unfiltered data are identical")
                print("   The backend analytics endpoints do not support date range filtering")
                return False
            else:
                print("✅ Date filtering appears to be working")
            
            # Test 3: Budget Growth endpoint
            print("\n🔍 Testing budget growth endpoint...")
            
            response = self.session.get(f"{BASE_URL}/analytics/budget-growth", timeout=10)
            if response.status_code != 200:
                print(f"❌ Budget growth endpoint failed: {response.status_code}")
                return False
            
            budget_data = response.json()
            print("✅ Budget growth endpoint working")
            print(f"   Data points: {len(budget_data.get('data', []))}")
            
            # Test with date parameters
            response = self.session.get(
                f"{BASE_URL}/analytics/budget-growth",
                params=date_params,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Budget growth with date params failed: {response.status_code}")
                return False
            
            filtered_budget_data = response.json()
            
            if budget_data == filtered_budget_data:
                print("❌ CRITICAL: Budget growth date filtering is NOT implemented")
                return False
            else:
                print("✅ Budget growth date filtering working")
            
            # Test 4: Investment Growth endpoint  
            print("\n🔍 Testing investment growth endpoint...")
            
            response = self.session.get(f"{BASE_URL}/analytics/investment-growth", timeout=10)
            if response.status_code != 200:
                print(f"❌ Investment growth endpoint failed: {response.status_code}")
                return False
            
            investment_data = response.json()
            print("✅ Investment growth endpoint working")
            
            # Test with date parameters
            response = self.session.get(
                f"{BASE_URL}/analytics/investment-growth",
                params=date_params,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Investment growth with date params failed: {response.status_code}")
                return False
            
            filtered_investment_data = response.json()
            
            if investment_data == filtered_investment_data:
                print("❌ CRITICAL: Investment growth date filtering is NOT implemented")
                return False
            else:
                print("✅ Investment growth date filtering working")
            
            print("\n✅ All analytics endpoints support date filtering")
            return True
            
        except Exception as e:
            print(f"❌ Analytics detailed test error: {str(e)}")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for Analytics Date Range Filtering")
        print("=" * 70)
        
        # Login first
        if not self.login_admin():
            return {
                "login": False,
                "analytics_date_filtering": False
            }
        
        # Run tests
        results = {
            "login": True,
            "analytics_date_filtering": self.test_analytics_date_filtering_detailed()
        }
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 70)
        
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