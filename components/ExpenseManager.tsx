import React from 'react';
import { Transaction, TransactionType, UserRole } from '../types';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

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
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ transactions, onAddTransaction, onDeleteTransaction, onEditTransaction, expenseCategories, branchId, initialBalances, userRole, lang }) => {
  const expenseTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE);
  const isViewer = userRole === UserRole.VIEWER;

  return (
    <div className={`flex flex-col lg:grid ${isViewer ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6 lg:h-[calc(100vh-120px)] overflow-hidden`}>
      {!isViewer && (
        <div className="lg:col-span-1 h-auto lg:h-full overflow-visible lg:overflow-y-auto">
          <TransactionForm 
            onAddTransaction={onAddTransaction} 
            expenseCategories={expenseCategories} 
            fixedType={TransactionType.EXPENSE}
            branchId={branchId}
            initialBalances={initialBalances}
            transactions={transactions}
          />
        </div>
      )}
      <div className={`${isViewer ? 'lg:col-span-1' : 'lg:col-span-2'} h-[500px] lg:h-full overflow-hidden mt-4 lg:mt-0`}>
        <TransactionList 
          transactions={expenseTransactions} 
          onDelete={onDeleteTransaction}
          onEdit={onEditTransaction}
          title="Lịch Sử Chi Phí" 
          userRole={userRole}
        />
      </div>
    </div>
  );
};

export default ExpenseManager;