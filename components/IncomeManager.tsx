
import React, { useState } from 'react';
import { Transaction, TransactionType, UserRole, Branch } from '../types';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import EditTransactionModal from './EditTransactionModal';

interface IncomeManagerProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  branchId: string;
  initialBalances: { cash: number; card: number };
  userRole?: UserRole;
  lang?: any;
  branchName?: string;
}

const IncomeManager: React.FC<IncomeManagerProps> = ({ 
  transactions, 
  onAddTransaction, 
  onDeleteTransaction, 
  onEditTransaction, 
  branchId, 
  initialBalances, 
  userRole,
  branchName
}) => {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const incomeTransactions = transactions.filter(t => t.type === TransactionType.INCOME && t.branchId === branchId && !t.deletedAt);
  const isViewer = userRole === UserRole.VIEWER;

  return (
    <div className={`flex flex-col lg:grid ${isViewer ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
      {!isViewer && (
        <div className="lg:col-span-1">
          <TransactionForm 
            onAddTransaction={onAddTransaction} 
            expenseCategories={[]} 
            fixedType={TransactionType.INCOME}
            branchId={branchId}
            initialBalances={initialBalances}
            transactions={transactions}
            branchName={branchName}
          />
        </div>
      )}
      <div className={`${isViewer ? 'lg:col-span-1' : 'lg:col-span-2'} min-h-[500px]`}>
        <TransactionList 
          transactions={incomeTransactions} 
          onDelete={onDeleteTransaction}
          onEdit={(tx) => setEditingTx(tx)}
          title={`Doanh Thu - ${branchName}`} 
          userRole={userRole}
        />
      </div>

      {editingTx && (
        <EditTransactionModal 
          transaction={editingTx}
          expenseCategories={[]}
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

export default IncomeManager;
