
import React, { useState } from 'react';
import { Transaction, TransactionType, UserRole, Language } from '../types';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import EditTransactionModal from './EditTransactionModal';
import { useTranslation } from '../i18n';

interface IncomeManagerProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  branchId: string;
  initialBalances: { cash: number; card: number };
  userRole?: UserRole;
  lang?: Language;
  branchName?: string;
  currentUsername?: string;
}

const IncomeManager: React.FC<IncomeManagerProps> = ({ 
  transactions, 
  onAddTransaction, 
  onDeleteTransaction, 
  onEditTransaction, 
  branchId, 
  initialBalances, 
  userRole,
  branchName,
  lang = 'vi' as Language,
  currentUsername
}) => {
  const { t } = useTranslation(lang);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const incomeTransactions = transactions.filter(tx => tx.type === TransactionType.INCOME && tx.branchId === branchId && !tx.deletedAt);
  const isViewer = userRole === UserRole.VIEWER;

  return (
    <div className={`flex flex-col lg:grid lg:grid-cols-12 gap-4 items-start`}>
      {!isViewer && (
        <div className="w-full lg:col-span-4 lg:sticky lg:top-16">
          <TransactionForm 
            onAddTransaction={onAddTransaction} 
            expenseCategories={[]} 
            fixedType={TransactionType.INCOME}
            branchId={branchId}
            initialBalances={initialBalances}
            transactions={transactions}
            branchName={branchName}
            lang={lang}
            currentUsername={currentUsername}
          />
        </div>
      )}
      <div className={`w-full ${isViewer ? 'lg:col-span-12' : 'lg:col-span-8'} min-h-[500px] h-full`}>
        <TransactionList 
          transactions={incomeTransactions} 
          onDelete={onDeleteTransaction}
          onEdit={(tx) => setEditingTx(tx)}
          title={`${t('income')} - ${branchName}`} 
          userRole={userRole}
          lang={lang}
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
          lang={lang}
          currentUsername={currentUsername}
        />
      )}
    </div>
  );
};

export default IncomeManager;
