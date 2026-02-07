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
BASE_URL = "https://vaulton-preview.preview.emergentagent.com/api"
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
    
    def test_standing_orders_feature(self) -> bool:
        """Test Standing Orders (Recurring Transactions) Feature"""
        print("\n🔍 Testing Standing Orders Feature...")
        
        try:
            # Test 1: Create a new standing order (Netflix subscription)
            print("📋 Test 1: Creating Netflix standing order...")
            
            netflix_order = {
                "type": "expense",
                "amount": 15.99,
                "description": "Netflix",
                "category": "Subscriptions",
                "frequency": "monthly",
                "day_of_month": 15,
                "start_date": "2025-01-01",
                "currency": "USD"
            }
            
            response = self.session.post(
                f"{BASE_URL}/recurring-transactions",
                json=netflix_order,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Create standing order failed: {response.status_code} - {response.text}")
                return False
            
            created_order = response.json()
            order_id = created_order.get("id")
            
            if not order_id:
                print("❌ Created order missing ID")
                return False
            
            print(f"✅ Netflix standing order created successfully (ID: {order_id})")
            
            # Test 2: List all standing orders
            print("📋 Test 2: Listing all standing orders...")
            
            response = self.session.get(f"{BASE_URL}/recurring-transactions", timeout=10)
            
            if response.status_code != 200:
                print(f"❌ List standing orders failed: {response.status_code} - {response.text}")
                return False
            
            orders_list = response.json()
            
            if not isinstance(orders_list, list):
                print("❌ Standing orders list should be an array")
                return False
            
            # Find our Netflix order
            netflix_found = False
            for order in orders_list:
                if order.get("id") == order_id and order.get("description") == "Netflix":
                    netflix_found = True
                    break
            
            if not netflix_found:
                print("❌ Netflix order not found in list")
                return False
            
            print(f"✅ Standing orders list retrieved successfully ({len(orders_list)} orders)")
            
            # Test 3: Edit the standing order (update amount)
            print("📋 Test 3: Updating standing order amount...")
            
            update_data = {
                "type": "expense",
                "amount": 19.99,  # Updated amount
                "description": "Netflix Premium",
                "category": "Subscriptions",
                "frequency": "monthly",
                "day_of_month": 15,
                "start_date": "2025-01-01",
                "currency": "USD"
            }
            
            response = self.session.put(
                f"{BASE_URL}/recurring-transactions/{order_id}",
                json=update_data,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Update standing order failed: {response.status_code} - {response.text}")
                return False
            
            print("✅ Standing order updated successfully")
            
            # Test 4: Toggle standing order (pause/resume)
            print("📋 Test 4: Toggling standing order status...")
            
            response = self.session.put(
                f"{BASE_URL}/recurring-transactions/{order_id}/toggle",
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Toggle standing order failed: {response.status_code} - {response.text}")
                return False
            
            toggle_result = response.json()
            print(f"✅ Standing order toggled: {toggle_result.get('message', 'Success')}")
            
            # Test 5: Process due standing orders
            print("📋 Test 5: Processing due standing orders...")
            
            response = self.session.post(
                f"{BASE_URL}/recurring-transactions/process",
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Process standing orders failed: {response.status_code} - {response.text}")
                return False
            
            process_result = response.json()
            created_count = process_result.get("created_count", 0)
            
            print(f"✅ Standing orders processed: {created_count} transactions created")
            
            # Test 6: Edge case - Day 31 handling
            print("📋 Test 6: Testing Day 31 edge case...")
            
            day31_order = {
                "type": "expense",
                "amount": 100.00,
                "description": "Monthly Rent",
                "category": "Rent / Mortgage",
                "frequency": "monthly",
                "day_of_month": 31,  # Edge case: day 31
                "start_date": "2025-01-01",
                "currency": "USD"
            }
            
            response = self.session.post(
                f"{BASE_URL}/recurring-transactions",
                json=day31_order,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"❌ Day 31 standing order creation failed: {response.status_code} - {response.text}")
                return False
            
            day31_created = response.json()
            day31_id = day31_created.get("id")
            
            print("✅ Day 31 standing order created successfully")
            
            # Test 7: Delete standing orders (cleanup)
            print("📋 Test 7: Deleting test standing orders...")
            
            # Delete Netflix order
            response = self.session.delete(f"{BASE_URL}/recurring-transactions/{order_id}", timeout=10)
            if response.status_code != 200:
                print(f"❌ Delete Netflix order failed: {response.status_code}")
                return False
            
            # Delete Day 31 order
            response = self.session.delete(f"{BASE_URL}/recurring-transactions/{day31_id}", timeout=10)
            if response.status_code != 200:
                print(f"❌ Delete Day 31 order failed: {response.status_code}")
                return False
            
            print("✅ Test standing orders deleted successfully")
            
            print("\n✅ ALL STANDING ORDERS TESTS PASSED")
            print("   ✓ Create standing order")
            print("   ✓ List standing orders")
            print("   ✓ Update standing order")
            print("   ✓ Toggle standing order")
            print("   ✓ Process due orders")
            print("   ✓ Day 31 edge case handling")
            print("   ✓ Delete standing order")
            
            return True
            
        except Exception as e:
            print(f"❌ Standing orders test error: {str(e)}")
            return False
    
    def test_ai_assistant_feature(self) -> bool:
        """Test AI Assistant Feature"""
        print("\n🔍 Testing AI Assistant Feature...")
        
        try:
            # First, let's add some test transactions to have data to query
            print("📋 Setting up test data for AI queries...")
            
            # Add some test transactions
            test_transactions = [
                {
                    "type": "expense",
                    "amount": 150.00,
                    "description": "Groceries",
                    "category": "Groceries",
                    "date": "2025-01-15",
                    "currency": "USD"
                },
                {
                    "type": "expense", 
                    "amount": 50.00,
                    "description": "Gas",
                    "category": "Fuel / Gas",
                    "date": "2025-01-10",
                    "currency": "USD"
                },
                {
                    "type": "income",
                    "amount": 3000.00,
                    "description": "Monthly Salary",
                    "category": "Salary / wages",
                    "date": "2025-01-01",
                    "currency": "USD"
                }
            ]
            
            transaction_ids = []
            for trans in test_transactions:
                response = self.session.post(f"{BASE_URL}/transactions", json=trans, timeout=10)
                if response.status_code == 200:
                    transaction_ids.append(response.json().get("id"))
            
            print(f"✅ Added {len(transaction_ids)} test transactions")
            
            # Test 1: Ask about monthly spending
            print("📋 Test 1: Asking about monthly spending...")
            
            monthly_question = {"question": "How much did I spend this month?"}
            
            response = self.session.post(
                f"{BASE_URL}/ai-assistant",
                json=monthly_question,
                timeout=15
            )
            
            if response.status_code != 200:
                print(f"❌ Monthly spending query failed: {response.status_code} - {response.text}")
                return False
            
            monthly_result = response.json()
            answer = monthly_result.get("answer", "")
            
            if not answer or len(answer) < 10:
                print("❌ AI assistant returned empty or too short answer")
                return False
            
            # Check if answer contains dollar amount
            if "$" not in answer and "dollar" not in answer.lower():
                print("❌ Monthly spending answer should contain dollar amount")
                return False
            
            print(f"✅ Monthly spending query successful")
            print(f"   Answer: {answer[:100]}...")
            
            # Test 2: Ask about income by category
            print("📋 Test 2: Asking about salary income...")
            
            salary_question = {"question": "How much did I earn from salary?"}
            
            response = self.session.post(
                f"{BASE_URL}/ai-assistant",
                json=salary_question,
                timeout=15
            )
            
            if response.status_code != 200:
                print(f"❌ Salary income query failed: {response.status_code} - {response.text}")
                return False
            
            salary_result = response.json()
            salary_answer = salary_result.get("answer", "")
            
            if not salary_answer or len(salary_answer) < 10:
                print("❌ Salary query returned empty answer")
                return False
            
            print(f"✅ Salary income query successful")
            print(f"   Answer: {salary_answer[:100]}...")
            
            # Test 3: Ask about biggest expense category
            print("📋 Test 3: Asking about biggest expense category...")
            
            category_question = {"question": "What's my biggest expense category?"}
            
            response = self.session.post(
                f"{BASE_URL}/ai-assistant",
                json=category_question,
                timeout=15
            )
            
            if response.status_code != 200:
                print(f"❌ Biggest category query failed: {response.status_code} - {response.text}")
                return False
            
            category_result = response.json()
            category_answer = category_result.get("answer", "")
            
            if not category_answer or len(category_answer) < 5:
                print("❌ Category query returned empty answer")
                return False
            
            print(f"✅ Biggest expense category query successful")
            print(f"   Answer: {category_answer[:100]}...")
            
            # Test 4: Ask about non-existent period
            print("📋 Test 4: Asking about non-existent period (2020)...")
            
            old_question = {"question": "How much did I spend in 2020?"}
            
            response = self.session.post(
                f"{BASE_URL}/ai-assistant",
                json=old_question,
                timeout=15
            )
            
            if response.status_code != 200:
                print(f"❌ Non-existent period query failed: {response.status_code} - {response.text}")
                return False
            
            old_result = response.json()
            old_answer = old_result.get("answer", "").lower()
            
            # Should indicate no data found
            no_data_indicators = ["no data", "don't have", "no information", "not found", "no records"]
            has_no_data_indicator = any(indicator in old_answer for indicator in no_data_indicators)
            
            if not has_no_data_indicator:
                print(f"❌ Should indicate no data for 2020, got: {old_answer[:100]}...")
                return False
            
            print(f"✅ Non-existent period query handled correctly")
            print(f"   Answer: {old_answer[:100]}...")
            
            # Cleanup: Delete test transactions
            print("📋 Cleaning up test transactions...")
            for trans_id in transaction_ids:
                if trans_id:
                    self.session.delete(f"{BASE_URL}/transactions/{trans_id}", timeout=10)
            
            print("✅ Test data cleaned up")
            
            print("\n✅ ALL AI ASSISTANT TESTS PASSED")
            print("   ✓ Monthly spending query")
            print("   ✓ Income by category query")
            print("   ✓ Biggest expense category query")
            print("   ✓ Non-existent period handling")
            
            return True
            
        except Exception as e:
            print(f"❌ AI assistant test error: {str(e)}")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for Standing Orders and AI Assistant")
        print("=" * 70)
        
        # Login first
        if not self.login_admin():
            return {
                "login": False,
                "standing_orders": False,
                "ai_assistant": False
            }
        
        # Run tests
        results = {
            "login": True,
            "standing_orders": self.test_standing_orders_feature(),
            "ai_assistant": self.test_ai_assistant_feature()
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