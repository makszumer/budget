from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os
import sys
sys.path.append('/app/backend')

from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, UserRegister, UserLogin, Token
)
from models import UserResponse
import uuid

router = APIRouter(prefix="/users", tags=["users"])

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@financehub.com"
ADMIN_PASSWORD = "admin"

# Database dependency
def get_db() -> AsyncIOMotorDatabase:
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    return client[os.environ['DB_NAME']]

@router.post("/register", response_model=Token)
async def register_user(user_data: UserRegister):
    """Register a new user with free tier subscription"""
    db = get_db()
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Email already registered'
        )
    
    # Check if username is taken
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Username already taken'
        )
    
    # Create new user
    user_id = str(uuid.uuid4())
    new_user = {
        'id': user_id,
        'email': user_data.email,
        'username': user_data.username,
        'hashed_password': hash_password(user_data.password),
        'is_active': True,
        'subscription_level': 'free',
        'subscription_expires_at': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    
    await db.users.insert_one(new_user)
    
    # Create access token
    access_token = create_access_token(user_id)
    
    return Token(
        access_token=access_token,
        user_id=user_id,
        is_premium=False
    )

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """Authenticate user and return JWT token"""
    db = get_db()
    
    # Special handling for admin login (admin can use either email or username)
    if (user_data.email == ADMIN_EMAIL or user_data.email == ADMIN_USERNAME) and user_data.password == ADMIN_PASSWORD:
        # Check if admin user exists, create if not
        admin_user = await db.users.find_one({"email": ADMIN_EMAIL}, {"_id": 0})
        
        if not admin_user:
            # Create admin user
            admin_id = str(uuid.uuid4())
            admin_user = {
                'id': admin_id,
                'email': ADMIN_EMAIL,
                'username': ADMIN_USERNAME,
                'hashed_password': hash_password(ADMIN_PASSWORD),
                'is_active': True,
                'is_admin': True,
                'subscription_level': 'premium',  # Admin gets premium by default
                'subscription_expires_at': None,  # Never expires for admin
                'created_at': datetime.now(timezone.utc).isoformat(),
            }
            await db.users.insert_one(admin_user)
        
        access_token = create_access_token(admin_user['id'])
        
        return Token(
            access_token=access_token,
            user_id=admin_user['id'],
            is_premium=True
        )
    
    # Regular user login
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid email or password'
        )
    
    if not verify_password(user_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid email or password'
        )
    
    if not user.get('is_active', True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Account is disabled'
        )
    
    # Check if subscription is expired
    is_premium = False
    if user['subscription_level'] == 'premium':
        expires_at = user.get('subscription_expires_at')
        if expires_at:
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at > datetime.now(timezone.utc):
                is_premium = True
            else:
                # Downgrade to free if expired
                await db.users.update_one(
                    {"id": user['id']},
                    {"$set": {"subscription_level": "free"}}
                )
    
    access_token = create_access_token(user['id'])
    
    return Token(
        access_token=access_token,
        user_id=user['id'],
        is_premium=is_premium
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user_id: str = Depends(get_current_user)):
    """Get current user's information"""
    db = get_db()
    
    user = await db.users.find_one({"id": current_user_id}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    
    expires_at = user.get('subscription_expires_at')
    is_premium = False
    
    if user['subscription_level'] == 'premium' and expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at > datetime.now(timezone.utc):
            is_premium = True
        else:
            # Downgrade if expired
            await db.users.update_one(
                {"id": current_user_id},
                {"$set": {"subscription_level": "free"}}
            )
            user['subscription_level'] = 'free'
    
    return UserResponse(
        user_id=user['id'],
        email=user['email'],
        username=user['username'],
        subscription_level=user['subscription_level'],
        subscription_expires_at=expires_at.isoformat() if isinstance(expires_at, datetime) else expires_at,
        is_premium=is_premium
    )
