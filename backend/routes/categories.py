"""Custom category routes - User-defined categories"""
from fastapi import APIRouter, HTTPException, Depends

from models.transaction import CustomCategory, CustomCategoryCreate, CustomCategoryUpdate
from auth import get_current_user

router = APIRouter(prefix="/categories/custom", tags=["categories"])

# Will be injected by main app
db = None


def init_router(database):
    """Initialize the router with database"""
    global db
    db = database


@router.get("")
async def get_custom_categories(user_id: str = Depends(get_current_user)):
    """Get all custom categories for the current user"""
    categories = await db.custom_categories.find(
        {"user_id": user_id}, 
        {"_id": 0}
    ).to_list(100)
    return categories


@router.post("", response_model=CustomCategory)
async def create_custom_category(
    category: CustomCategoryCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new custom category for the user"""
    existing = await db.custom_categories.find_one({
        "user_id": user_id,
        "name": category.name,
        "type": category.type
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    cat_obj = CustomCategory(
        user_id=user_id,
        name=category.name,
        type=category.type
    )
    
    doc = cat_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.custom_categories.insert_one(doc)
    return cat_obj


@router.put("/{category_id}")
async def update_custom_category(
    category_id: str,
    update_data: CustomCategoryUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a custom category"""
    existing = await db.custom_categories.find_one({
        "id": category_id,
        "user_id": user_id
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    duplicate = await db.custom_categories.find_one({
        "user_id": user_id,
        "name": update_data.name,
        "type": existing["type"],
        "id": {"$ne": category_id}
    })
    
    if duplicate:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    await db.custom_categories.update_one(
        {"id": category_id},
        {"$set": {"name": update_data.name}}
    )
    
    return {"message": "Category updated successfully"}


@router.delete("/{category_id}")
async def delete_custom_category(
    category_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a custom category"""
    result = await db.custom_categories.delete_one({
        "id": category_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully"}
