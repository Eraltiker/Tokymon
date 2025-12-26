
import React, { useState } from 'react';
import { Transaction, TransactionType, UserRole, Language } from '../types';
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
  lang?: Language;
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
  branchName,
  lang = 'vi'
}) => {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const expenseTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE && t.branchId === branchId && !t.deletedAt);
  const isViewer = userRole === UserRole.VIEWER;

  return (
    <div className={`flex flex-col lg:grid lg:grid-cols-12 gap-4 items-start`}>
      {!isViewer && (
        <div className="w-full lg:col-span-4 lg:sticky lg:top-16">
          <TransactionForm 
            onAddTransaction={onAddTransaction} 
            expenseCategories={expenseCategories} 
            fixedType={TransactionType.EXPENSE}
            branchId={branchId}
            initialBalances={initialBalances}
            transactions={transactions}
            branchName={branchName}
            lang={lang}
          />
        </div>
      )}
      <div className={`w-full ${isViewer ? 'lg:col-span-12' : 'lg:col-span-8'} min-h-[500px] h-full`}>
        <TransactionList 
          transactions={expenseTransactions} 
          onDelete={onDeleteTransaction}
          onEdit={(tx) => setEditingTx(tx)}
          title={`Chi Phí - ${branchName}`} 
          userRole={userRole}
          lang={lang}
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
