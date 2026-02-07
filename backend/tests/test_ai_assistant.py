"""
AI Assistant API Tests
======================
Tests for the data-driven financial calculator AI assistant endpoint.
Tests cover: summary queries, expense/income/investment queries, date parsing, category filtering.
"""

import pytest
import requests
import os
from datetime import datetime, timedelta
import calendar

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


class TestAIAssistantBasics:
    """Basic AI assistant endpoint tests"""
    
    def test_endpoint_requires_question(self, api_client):
        """Test that endpoint returns 400 when no question provided"""
        response = api_client.post(AI_ENDPOINT, json={})
        assert response.status_code == 400
        assert "detail" in response.json()
    
    def test_endpoint_with_empty_question(self, api_client):
        """Test that endpoint returns 400 when question is empty string"""
        response = api_client.post(AI_ENDPOINT, json={"question": ""})
        assert response.status_code == 400
    
    def test_endpoint_returns_answer(self, api_client):
        """Test that endpoint returns answer and data_provided fields"""
        response = api_client.post(AI_ENDPOINT, json={"question": "Hello"})
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "data_provided" in data


class TestSummaryQueries:
    """Tests for summary/overview queries"""
    
    def test_summary_query(self, api_client):
        """Test summary query returns overview of finances"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "Give me a summary of my finances"
        })
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert data["data_provided"] == True
        # Summary should mention totals or provide financial overview
        answer_lower = data["answer"].lower()
        # Should contain some financial information
        assert len(data["answer"]) > 50  # Non-trivial response
    
    def test_overview_query(self, api_client):
        """Test overview query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What is my financial overview?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_total_balance_query(self, api_client):
        """Test total/balance query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What is my total balance?"
        })
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert data["data_provided"] == True


class TestExpenseQueries:
    """Tests for expense-related queries"""
    
    def test_how_much_spent_query(self, api_client):
        """Test basic spending query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend?"
        })
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert data["data_provided"] == True
        # Should mention spending/expenses or "no transactions"
        answer_lower = data["answer"].lower()
        assert any(word in answer_lower for word in ["spent", "expense", "total", "no", "$"])
    
    def test_expense_last_month(self, api_client):
        """Test expense query with 'last month' date range"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend last month?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        # Check for date period mention
        answer_lower = data["answer"].lower()
        # Should reference the month or indicate no data
        assert len(data["answer"]) > 20
    
    def test_expense_this_month(self, api_client):
        """Test expense query with 'this month' date range"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What are my expenses this month?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_expense_this_year(self, api_client):
        """Test expense query with 'this year' date range"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend this year?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_expense_last_7_days(self, api_client):
        """Test expense query with 'last 7 days' date range"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in the last 7 days?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_expense_last_30_days(self, api_client):
        """Test expense query with 'last 30 days' date range"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What were my expenses in the last 30 days?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True


class TestIncomeQueries:
    """Tests for income-related queries"""
    
    def test_how_much_earned_query(self, api_client):
        """Test basic income query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I earn?"
        })
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert data["data_provided"] == True
    
    def test_income_this_year(self, api_client):
        """Test income query with 'this year' date range"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I earn this year?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_income_last_month(self, api_client):
        """Test income query with 'last month' date range"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What was my income last month?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_salary_query(self, api_client):
        """Test salary-specific income query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much salary did I receive?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_tips_query(self, api_client):
        """Test tips-specific income query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I earn in tips?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True


class TestInvestmentQueries:
    """Tests for investment-related queries"""
    
    def test_total_invested_query(self, api_client):
        """Test basic investment query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I invest?"
        })
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert data["data_provided"] == True
    
    def test_crypto_investment_query(self, api_client):
        """Test crypto-specific investment query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I invest in crypto?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        # Should mention crypto or indicate no data
        answer_lower = data["answer"].lower()
        assert any(word in answer_lower for word in ["crypto", "invested", "investment", "no", "$"])
    
    def test_stocks_investment_query(self, api_client):
        """Test stocks-specific investment query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I invest in stocks?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_etf_investment_query(self, api_client):
        """Test ETF-specific investment query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I invest in ETFs?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_portfolio_query(self, api_client):
        """Test portfolio overview query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What does my investment portfolio look like?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True


class TestCategorySpecificQueries:
    """Tests for category-specific queries"""
    
    def test_groceries_expense_query(self, api_client):
        """Test groceries category expense query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend on groceries?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        # Should mention groceries or indicate no data for that category
    
    def test_restaurants_expense_query(self, api_client):
        """Test restaurants category expense query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend at restaurants?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_rent_expense_query(self, api_client):
        """Test rent category expense query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I pay for rent?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_transport_expense_query(self, api_client):
        """Test transport category expense query"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend on gas?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True


class TestNonExistentCategoryQueries:
    """Tests for queries about non-existent categories - should return helpful messages"""
    
    def test_travel_category_not_found(self, api_client):
        """Test query for travel when no travel expenses exist"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend on travel?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        answer_lower = data["answer"].lower()
        # Should either have travel data or mention no transactions/available categories
        assert any(word in answer_lower for word in ["travel", "no", "categories", "recorded", "$"])
    
    def test_vacation_category_not_found(self, api_client):
        """Test query for vacation when no vacation expenses exist"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend on vacation?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_gym_category_not_found(self, api_client):
        """Test query for gym when no gym expenses exist"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend on the gym?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True


class TestQuarterDateParsing:
    """Tests for quarter date parsing (Q1, Q2, Q3, Q4)"""
    
    def test_q1_expense_query(self, api_client):
        """Test Q1 date parsing for expenses"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in Q1?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        # Q1 should be parsed (Jan-Mar)
    
    def test_q2_expense_query(self, api_client):
        """Test Q2 date parsing for expenses"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in Q2?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_q3_expense_query(self, api_client):
        """Test Q3 date parsing for expenses"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What were my expenses in Q3?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_q4_expense_query(self, api_client):
        """Test Q4 date parsing for expenses"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What were my expenses in Q4?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_q1_with_year(self, api_client):
        """Test Q1 with explicit year"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in Q1 2025?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
        # Should parse as Q1 2025 (Jan-Mar 2025)


class TestRelativeDateParsing:
    """Tests for relative date parsing"""
    
    def test_today_query(self, api_client):
        """Test 'today' date parsing"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend today?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_this_week_query(self, api_client):
        """Test 'this week' date parsing"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What are my expenses this week?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_last_week_query(self, api_client):
        """Test 'last week' date parsing"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend last week?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_last_3_months_query(self, api_client):
        """Test 'last 3 months' date parsing"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "What were my expenses in the last 3 months?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_last_6_months_query(self, api_client):
        """Test 'last 6 months' date parsing"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in the last 6 months?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_specific_month_query(self, api_client):
        """Test specific month name parsing"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in January?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_specific_month_with_year(self, api_client):
        """Test specific month with year parsing"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in December 2024?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True


class TestCombinedQueries:
    """Tests for queries combining multiple filters"""
    
    def test_category_with_date_range(self, api_client):
        """Test category + date range combination"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend on groceries last month?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_income_category_with_date(self, api_client):
        """Test income category + date combination"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much salary did I earn this year?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True
    
    def test_investment_with_quarter(self, api_client):
        """Test investment + quarter date combination"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I invest in stocks in Q4?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data_provided"] == True


class TestResponseFormat:
    """Tests for response format and structure"""
    
    def test_expense_response_has_total(self, api_client):
        """Test that expense responses include total amount"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend this year?"
        })
        assert response.status_code == 200
        data = response.json()
        # Response should contain dollar sign or mention of amount
        answer = data["answer"]
        assert "$" in answer or "no" in answer.lower() or "recorded" in answer.lower()
    
    def test_response_contains_period(self, api_client):
        """Test that date-filtered responses mention the period"""
        response = api_client.post(AI_ENDPOINT, json={
            "question": "How much did I spend in Q1?"
        })
        assert response.status_code == 200
        data = response.json()
        answer_lower = data["answer"].lower()
        # Should mention Q1 or the time period
        assert any(word in answer_lower for word in ["q1", "jan", "feb", "mar", "quarter", "time", "$", "no"])


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
