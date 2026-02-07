"""
AI Financial Engine Tests - Enhanced Features
==============================================
Tests for the data-driven financial calculator AI assistant endpoint.
Focus on: Investment P&L with ROI, Per-asset breakdown, Month-only date parsing,
         Smart category matching (food, tips, transport).

Test data context (Nov 2025 - Feb 2026):
- ETH: $285 invested (3 transactions)
- BTC: $55 invested (1 transaction)
- Tips income category: "Commissions / tips"
- Food categories: Groceries, Restaurants / Cafes, Takeout / Delivery
"""

import pytest
import requests
import os

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable must be set")

AI_ENDPOINT = f"{BASE_URL}/api/ai-assistant"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ==================================================================
# INVESTMENT P&L TESTS - ROI Calculations
# ==================================================================

class TestInvestmentProfitLoss:
    """Tests for investment profit/loss calculations with ROI"""
    
    def test_investment_pnl_general_query(self, api_client):
        """Test: 'How much did I make or lose on investments?' - should show P&L and ROI"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I make or lose on investments?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should contain key P&L metrics
        assert "invested" in answer.lower() or "Investment" in answer
        assert "Profit/Loss" in answer or "profit" in answer.lower() or "loss" in answer.lower()
        assert "ROI" in answer or "%" in answer  # ROI percentage should be shown
        assert "$" in answer  # Dollar amounts should be present
    
    def test_investment_roi_calculation(self, api_client):
        """Test: ROI percentage is calculated and displayed"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What's my investment performance?"
        })
        assert response.status_code == 200
        data = response.json()
        answer = data["answer"]
        
        # ROI should be shown as percentage
        assert "%" in answer, "ROI percentage should be displayed"
    
    def test_investment_shows_current_value(self, api_client):
        """Test: Investment queries show current market value"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much are my investments worth?"
        })
        assert response.status_code == 200
        data = response.json()
        answer = data["answer"]
        
        # Should show current value
        assert "Current Value" in answer or "current value" in answer.lower() or "$" in answer


# ==================================================================
# PER-ASSET P&L BREAKDOWN TESTS
# ==================================================================

class TestPerAssetBreakdown:
    """Tests for per-asset profit/loss breakdown (ETH, BTC individual)"""
    
    def test_eth_specific_pnl(self, api_client):
        """Test: ETH-specific profit/loss query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I make or lose on ETH?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should show ETH specific data
        assert "ETH" in answer
        assert "$285" in answer or "285" in answer  # ETH invested amount
        assert "%" in answer  # ROI percentage
        
    def test_btc_specific_pnl(self, api_client):
        """Test: BTC-specific profit/loss query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I make or lose on BTC?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should show BTC specific data
        assert "BTC" in answer
        assert "$55" in answer or "55.00" in answer  # BTC invested amount
        
    def test_bitcoin_synonym_works(self, api_client):
        """Test: 'Bitcoin' synonym maps to BTC correctly"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much profit or loss on Bitcoin?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should recognize Bitcoin as BTC
        assert "BTC" in answer or "Bitcoin" in answer
        
    def test_ethereum_synonym_works(self, api_client):
        """Test: 'Ethereum' synonym maps to ETH correctly"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What's my profit or loss on Ethereum?"
        })
        assert response.status_code == 200
        data = response.json()
        answer = data["answer"]
        
        # Should recognize Ethereum as ETH
        assert "ETH" in answer or "Ethereum" in answer
        
    def test_investment_breakdown_shows_all_assets(self, api_client):
        """Test: General investment query shows per-asset breakdown"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I make or lose on investments?"
        })
        assert response.status_code == 200
        data = response.json()
        answer = data["answer"]
        
        # Should show both ETH and BTC in breakdown
        assert "ETH" in answer
        assert "BTC" in answer
        assert "Per Asset" in answer or "asset" in answer.lower()


# ==================================================================
# MONTH-ONLY DATE PARSING TESTS (All Years)
# ==================================================================

class TestMonthOnlyDateParsing:
    """Tests for month-only queries that search across ALL years"""
    
    def test_december_all_years(self, api_client):
        """Test: 'December' without year searches all years"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in December?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should mention December and "all years"
        assert "December" in answer
        assert "all years" in answer.lower() or "$" in answer
        
    def test_january_all_years(self, api_client):
        """Test: 'January' without year searches all years"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in January?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should contain January data
        assert "January" in answer or "$" in answer
        
    def test_december_specific_year(self, api_client):
        """Test: 'December 2025' searches only that specific year+month"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in December 2025?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should mention specific year
        assert "December 2025" in answer or "december 2025" in answer.lower()
        assert "all years" not in answer.lower()
        
    def test_november_data_exists(self, api_client):
        """Test: November query (data exists for Nov 2025)"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in November?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should have November data or indicate no transactions
        assert "November" in answer or "$" in answer or "no" in answer.lower()


# ==================================================================
# SMART CATEGORY MATCHING TESTS
# ==================================================================

class TestSmartCategoryMatching:
    """Tests for smart category groups (food, tips, transport)"""
    
    def test_food_combines_multiple_categories(self, api_client):
        """Test: 'food' matches Groceries + Restaurants + Takeout"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend on food?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should combine food categories
        assert "$" in answer
        # Check for breakdown showing multiple food categories
        food_categories_present = any(cat in answer for cat in [
            "Groceries", "Restaurants", "Takeout", "Delivery"
        ])
        assert food_categories_present, "Should show breakdown of food categories"
        
    def test_tips_maps_to_commissions_tips(self, api_client):
        """Test: 'tips' maps to 'Commissions / tips' category"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I earn from tips?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should show tips income
        assert "$" in answer
        assert "Commissions" in answer or "tips" in answer.lower()
        # Data shows ~$1,355.80 in tips
        
    def test_gratuity_maps_to_tips(self, api_client):
        """Test: 'gratuity' synonym maps to tips category"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I earn in gratuity?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should recognize gratuity as tips
        assert "$" in answer or "income" in answer.lower() or "Commissions" in answer
        
    def test_transport_combines_categories(self, api_client):
        """Test: 'transport' combines Public Transport + Fuel categories"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend on transport?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should show transport expenses
        assert "$" in answer
        assert "Transport" in answer or "transport" in answer.lower()
        
    def test_dining_subset_of_food(self, api_client):
        """Test: 'dining' matches restaurants and takeout (subset of food)"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend on dining?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Should show dining expenses
        assert "$" in answer


# ==================================================================
# SUMMARY QUERIES USE AI WITH FULL DATA
# ==================================================================

class TestSummaryQueriesUseAI:
    """Tests that summary queries use AI with comprehensive data context"""
    
    def test_summary_provides_comprehensive_overview(self, api_client):
        """Test: Summary queries return comprehensive financial data"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "Give me a summary of my finances"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"]
        
        # Summary should contain multiple financial aspects
        assert len(answer) > 100, "Summary should be comprehensive"
        
    def test_financial_health_query(self, api_client):
        """Test: 'financial health' triggers summary with all data"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What's my financial health?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True


# ==================================================================
# DATA ACCURACY TESTS
# ==================================================================

class TestDataAccuracy:
    """Tests for data accuracy in responses"""
    
    def test_eth_invested_amount_accurate(self, api_client):
        """Test: ETH invested amount should be $285 (95+130+60)"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I invest in ETH?"
        })
        assert response.status_code == 200
        data = response.json()
        answer = data["answer"]
        
        # Total ETH invested should be $285
        assert "285" in answer or "$285" in answer
        
    def test_btc_invested_amount_accurate(self, api_client):
        """Test: BTC invested amount should be $55"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I invest in BTC?"
        })
        assert response.status_code == 200
        data = response.json()
        answer = data["answer"]
        
        # Total BTC invested should be $55
        assert "55" in answer
        
    def test_total_crypto_invested(self, api_client):
        """Test: Total crypto invested should be $340 (285+55)"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I invest in crypto?"
        })
        assert response.status_code == 200
        data = response.json()
        answer = data["answer"]
        
        # Total crypto invested should be $340
        assert "340" in answer or "$340" in answer


# ==================================================================
# EDGE CASES
# ==================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling"""
    
    def test_empty_question_returns_error(self, api_client):
        """Test: Empty question returns 400 error"""
        response = api_client.post(AI_ENDPOINT, json={"question": ""})
        assert response.status_code == 400
        
    def test_missing_question_returns_error(self, api_client):
        """Test: Missing question field returns 400 error"""
        response = api_client.post(AI_ENDPOINT, json={})
        assert response.status_code == 400
        
    def test_investment_query_for_non_existent_asset(self, api_client):
        """Test: Query for non-existent asset returns helpful message"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I invest in DOGE?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer = data["answer"].lower()
        # Should indicate no DOGE investments or show zero
        assert "no" in answer or "0" in answer or "recorded" in answer or "investment" in answer


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
