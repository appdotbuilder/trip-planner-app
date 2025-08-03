
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { Expense, ExpenseSplit, CreateExpenseInput } from '../../../server/src/schema';

interface ExpenseManagerProps {
  tripId: number;
  userId: number;
}

// Match the actual server return type
interface ExpenseWithSplits extends Expense {
  splits: ExpenseSplit[];
}

// Frontend display type with user names
interface ExpenseDisplayItem extends Expense {
  payer_name?: string;
  splits?: Array<{
    user_id: number;
    user_name: string;
    amount: number;
    is_settled: boolean;
  }>;
}

type ExpenseCategory = 'accommodation' | 'food' | 'transport' | 'entertainment' | 'shopping' | 'other';

export function ExpenseManager({ tripId, userId }: ExpenseManagerProps) {
  const [expenses, setExpenses] = useState<ExpenseDisplayItem[]>([]);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expenseSummary, setExpenseSummary] = useState<{
    totalOwed: number;
    totalOwedTo: number;
    netBalance: number;
  }>({ totalOwed: 0, totalOwedTo: 0, netBalance: 0 });

  const [expenseForm, setExpenseForm] = useState<CreateExpenseInput>({
    trip_id: tripId,
    payer_id: userId,
    title: '',
    description: null,
    amount: 0,
    currency: 'USD',
    category: 'other',
    expense_date: new Date(),
    split_with: []
  });

  const loadExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      // Note: Using stub data as the handler returns empty array
      const tripExpenses = await trpc.getTripExpenses.query({ tripId });
      
      // Transform server data to display format
      const displayExpenses: ExpenseDisplayItem[] = tripExpenses.map((expense: ExpenseWithSplits) => ({
        ...expense,
        payer_name: `User ${expense.payer_id}`, // In real app, would fetch user names
        splits: expense.splits.map((split: ExpenseSplit) => ({
          user_id: split.user_id,
          user_name: `User ${split.user_id}`, // In real app, would fetch user names
          amount: split.amount,
          is_settled: split.is_settled
        }))
      }));
      
      setExpenses(displayExpenses);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  const loadExpenseSummary = useCallback(async () => {
    try {
      // Note: Using stub data as the handler returns placeholder data
      const summary = await trpc.getUserExpenseSummary.query({ tripId, userId });
      
      // Transform server response to match component state
      setExpenseSummary({
        totalOwed: summary.owes,
        totalOwedTo: summary.owed,
        netBalance: summary.owed - summary.owes
      });
    } catch (error) {
      console.error('Failed to load expense summary:', error);
    }
  }, [tripId, userId]);

  useEffect(() => {
    loadExpenses();
    loadExpenseSummary();
  }, [loadExpenses, loadExpenseSummary]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newExpense = await trpc.createExpense.mutate(expenseForm);
      
      // Transform new expense to display format
      const displayExpense: ExpenseDisplayItem = {
        ...newExpense,
        payer_name: `User ${newExpense.payer_id}`,
        splits: [] // Would be populated in real implementation
      };
      
      setExpenses((prev: ExpenseDisplayItem[]) => [...prev, displayExpense]);
      setExpenseForm({
        trip_id: tripId,
        payer_id: userId,
        title: '',
        description: null,
        amount: 0,
        currency: 'USD',
        category: 'other',
        expense_date: new Date(),
        split_with: []
      });
      setShowCreateExpense(false);
      loadExpenseSummary();
    } catch (error) {
      console.error('Failed to create expense:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettleExpense = async (expenseId: number) => {
    try {
      await trpc.settleExpense.mutate({ expenseId, userId });
      loadExpenses();
      loadExpenseSummary();
    } catch (error) {
      console.error('Failed to settle expense:', error);
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      accommodation: '🏨',
      food: '🍽️',
      transport: '🚗',
      entertainment: '🎭',
      shopping: '🛍️',
      other: '💳'
    };
    return emojis[category] || '💳';
  };

  const addSplitMember = () => {
    setExpenseForm((prev: CreateExpenseInput) => ({
      ...prev,
      split_with: [...prev.split_with, { user_id: 0, amount: 0 }]
    }));
  };

  const updateSplitMember = (index: number, field: 'user_id' | 'amount', value: number) => {
    setExpenseForm((prev: CreateExpenseInput) => ({
      ...prev,
      split_with: prev.split_with.map((split, i) => 
        i === index ? { ...split, [field]: value } : split
      )
    }));
  };

  const removeSplitMember = (index: number) => {
    setExpenseForm((prev: CreateExpenseInput) => ({
      ...prev,
      split_with: prev.split_with.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Trip Expenses</h2>
          <p className="text-gray-600">Track and split expenses with your group</p>
        </div>
        <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              💰 Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleCreateExpense}>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Record a new expense and split it with group members
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="expense-title">Expense Title</Label>
                  <Input
                    id="expense-title"
                    placeholder="e.g., Restaurant dinner"
                    value={expenseForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setExpenseForm((prev: CreateExpenseInput) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setExpenseForm((prev: CreateExpenseInput) => ({ 
                          ...prev, 
                          amount: parseFloat(e.target.value) || 0 
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={expenseForm.currency || 'USD'}
                      onValueChange={(value: string) =>
                        setExpenseForm((prev: CreateExpenseInput) => ({ ...prev, currency: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={expenseForm.category || 'other'}
                    onValueChange={(value: string) =>
                      setExpenseForm((prev: CreateExpenseInput) => ({ 
                        ...prev, 
                        category: value as ExpenseCategory
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accommodation">🏨 Accommodation</SelectItem>
                      <SelectItem value="food">🍽️ Food & Drinks</SelectItem>
                      <SelectItem value="transport">🚗 Transportation</SelectItem>
                      <SelectItem value="entertainment">🎭 Entertainment</SelectItem>
                      <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                      <SelectItem value="other">💳 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-date">Date</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={expenseForm.expense_date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setExpenseForm((prev: CreateExpenseInput) => ({ 
                        ...prev, 
                        expense_date: new Date(e.target.value) 
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional details..."
                    value={expenseForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setExpenseForm((prev: CreateExpenseInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Split With</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addSplitMember}>
                      + Add Person
                    </Button>
                  </div>
                  {expenseForm.split_with.map((split, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="User ID"
                        type="number"
                        value={split.user_id || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateSplitMember(index, 'user_id', parseInt(e.target.value) || 0)
                        }
                      />
                      <Input
                        placeholder="Amount"
                        type="number"
                        step="0.01"
                        value={split.amount || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateSplitMember(index, 'amount', parseFloat(e.target.value) || 0)
                        }
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeSplitMember(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Expense'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">You Owe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${expenseSummary.totalOwed.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">You're Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${expenseSummary.totalOwedTo.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card className={`${
          expenseSummary.netBalance >= 0 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${
              expenseSummary.netBalance >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              expenseSummary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${Math.abs(expenseSummary.netBalance).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <Card className="text-center py-12 bg-white/80 backdrop-blur-sm">
          <CardContent>
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No expenses yet</h3>
            <p className="text-gray-500">Start tracking your trip expenses to split costs with your group</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense: ExpenseDisplayItem) => (
            <Card key={expense.id} className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getCategoryEmoji(expense.category)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{expense.title}</CardTitle>
                      <CardDescription className="flex items-center space-x-2">
                        <span>Paid by {expense.payer_name || `User ${expense.payer_id}`}</span>
                        <span>•</span>
                        <span>{expense.expense_date.toLocaleDateString()}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {expense.currency} {expense.amount.toFixed(2)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {expense.category}
                    </Badge>
                  </div>
                </div>
                {expense.description && (
                  <p className="text-sm text-gray-600 mt-2">{expense.description}</p>
                )}
              </CardHeader>
              {expense.splits && expense.splits.length > 0 && (
                <CardContent>
                  <Separator className="mb-3" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Split Details:</h4>
                    {expense.splits.map((split, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>{split.user_name || `User ${split.user_id}`}</span>
                        <div className="flex items-center space-x-2">
                          <span>${split.amount.toFixed(2)}</span>
                          {split.user_id === userId && !split.is_settled && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSettleExpense(expense.id)}
                            >
                              Settle
                            </Button>
                          )}
                          {split.is_settled && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              ✓ Settled
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
