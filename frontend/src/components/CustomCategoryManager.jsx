import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { Plus, Pencil, Trash2, Tag, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const CustomCategoryManager = () => {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  useEffect(() => {
    if (token) {
      fetchCategories();
    } else {
      // No token yet, stop loading
      setLoading(false);
    }
  }, [token]);

  const fetchCategories = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/categories/custom`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load custom categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    
    setSaving(true);
    try {
      const response = await axios.post(
        `${API}/categories/custom`,
        { name: newCategoryName.trim(), type: newCategoryType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCategories([...categories, response.data]);
      setNewCategoryName('');
      toast.success('Category created successfully');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create category';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    
    setSaving(true);
    try {
      await axios.put(
        `${API}/categories/custom/${editingCategory.id}`,
        { name: editName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id ? { ...cat, name: editName.trim() } : cat
      ));
      setEditDialogOpen(false);
      setEditingCategory(null);
      toast.success('Category updated successfully');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update category';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    
    setSaving(true);
    try {
      await axios.delete(
        `${API}/categories/custom/${categoryToDelete.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCategories(categories.filter(cat => cat.id !== categoryToDelete.id));
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      toast.success('Category deleted successfully');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete category';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const incomeCategories = categories.filter(cat => cat.type === 'income');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!token) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-slate-500">Please log in to manage custom categories</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Custom Categories</h1>
        <p className="text-slate-600">Create and manage your personal expense and income categories</p>
      </div>
      
      {/* Add New Category Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Add Custom Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCategory} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Coffee, Side Hustle, Tips"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="w-40 space-y-2">
              <Label htmlFor="category-type">Type</Label>
              <Select value={newCategoryType} onValueChange={setNewCategoryType}>
                <SelectTrigger id="category-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Display Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600">
              Custom Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <p className="text-slate-500 text-sm">No custom expense categories yet</p>
            ) : (
              <ul className="space-y-2">
                {expenseCategories.map(cat => (
                  <li 
                    key={cat.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <span className="font-medium">{cat.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(cat)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick(cat)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Income Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-600">
              Custom Income Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomeCategories.length === 0 ? (
              <p className="text-slate-500 text-sm">No custom income categories yet</p>
            ) : (
              <ul className="space-y-2">
                {incomeCategories.map(cat => (
                  <li 
                    key={cat.id}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                  >
                    <span className="font-medium">{cat.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(cat)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick(cat)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the name of your custom category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
