
import React, { useState } from 'react';
import { Transaction, TransactionType, UserRole } from '../types';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import EditTransactionModal from './EditTransactionModal';

interface ExpenseManagerProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  expenseCategories: string[];
  branchId: string;
  initialBalances: { cash: number; card: number };
  userRole?: UserRole;
  lang?: any;
  branchName?: string;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ 
  transactions, 
  onAddTransaction, 
  onDeleteTransaction, 
  onEditTransaction, 
  expenseCategories, 
  branchId, 
  initialBalances, 
  userRole,
  branchName
}) => {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const expenseTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE && t.branchId === branchId && !t.deletedAt);
  const isViewer = userRole === UserRole.VIEWER;

  return (
    <div className={`flex flex-col lg:grid ${isViewer ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
      {!isViewer && (
        <div className="lg:col-span-1">
          <TransactionForm 
            onAddTransaction={onAddTransaction} 
            expenseCategories={expenseCategories} 
            fixedType={TransactionType.EXPENSE}
            branchId={branchId}
            initialBalances={initialBalances}
            transactions={transactions}
            branchName={branchName}
          />
        </div>
      )}
      <div className={`${isViewer ? 'lg:col-span-1' : 'lg:col-span-2'} min-h-[500px]`}>
        <TransactionList 
          transactions={expenseTransactions} 
          onDelete={onDeleteTransaction}
          onEdit={(tx) => setEditingTx(tx)}
          title={`Chi Phí - ${branchName}`} 
          userRole={userRole}
        />
      </div>

      {editingTx && (
        <EditTransactionModal 
          transaction={editingTx}
          expenseCategories={expenseCategories}
          onClose={() => setEditingTx(null)}
          onSave={(updated) => {
            onEditTransaction(updated);
            setEditingTx(null);
          }}
        />
      )}
    </div>
  );
};

export default ExpenseManager;
