
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Target, 
  Settings as SettingsIcon, 
  PieChart, 
  Tag, 
  Plus, 
  LogOut,
  Bell,
  Search,
  ChevronRight,
  Menu,
  X,
  User,
  Briefcase,
  CreditCard as CreditCardIcon,
  UserCheck
} from 'lucide-react';

import { 
  Transaction, 
  Category, 
  Budget, 
  SavingsGoal, 
  TransactionType, 
  RecurrenceFrequency, 
  PaymentMethod,
  FinScope,
  CreditCard,
  FixedExpense
} from './types';
import { PREDEFINED_CATEGORIES } from './constants';
import { generateId, cn } from './lib/utils';

// Views
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Budgets from './components/Budgets';
import Categories from './components/Categories';
import SavingsGoals from './components/SavingsGoals';
import Settings from './components/Settings';
import Reports from './components/Reports';
import CreditCardsView from './components/CreditCards';
import FinancialProfile from './components/FinancialProfile';

// Default Cards to restore
const INITIAL_CARDS: CreditCard[] = [
  {
    id: 'card-1',
    name: 'Visa Platinum',
    bank: 'Chase',
    lastFour: '4242',
    limit: 5000,
    currentBalance: 1250.50,
    closingDay: 15,
    paymentDay: 5,
    scope: FinScope.PERSONAL,
    color: '#4f46e5'
  },
  {
    id: 'card-2',
    name: 'Mastercard Black',
    bank: 'Citi',
    lastFour: '8888',
    limit: 10000,
    currentBalance: 0,
    closingDay: 20,
    paymentDay: 10,
    scope: FinScope.PERSONAL,
    color: '#1e293b'
  },
  {
    id: 'card-3',
    name: 'Amex Gold',
    bank: 'American Express',
    lastFour: '1001',
    limit: 15000,
    currentBalance: 4500.00,
    closingDay: 28,
    paymentDay: 15,
    scope: FinScope.PERSONAL,
    color: '#f59e0b'
  }
];

const App: React.FC = () => {
  // Global State
  const [activeScope, setActiveScope] = useState<FinScope>(() => {
    const saved = localStorage.getItem('ab_active_scope');
    return (saved as FinScope) || FinScope.PERSONAL;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('ab_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('ab_categories');
    return saved ? JSON.parse(saved) : PREDEFINED_CATEGORIES;
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('ab_budgets');
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    const saved = localStorage.getItem('ab_goals');
    return saved ? JSON.parse(saved) : [];
  });

  const [creditCards, setCreditCards] = useState<CreditCard[]>(() => {
    const saved = localStorage.getItem('ab_credit_cards');
    return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : INITIAL_CARDS;
  });

  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(() => {
    const saved = localStorage.getItem('ab_fixed_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [monthlyIncome, setMonthlyIncome] = useState<number>(() => {
    const saved = localStorage.getItem('ab_monthly_income');
    return saved ? parseFloat(saved) : 3500;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('ab_active_scope', activeScope);
    localStorage.setItem('ab_transactions', JSON.stringify(transactions));
    localStorage.setItem('ab_categories', JSON.stringify(categories));
    localStorage.setItem('ab_budgets', JSON.stringify(budgets));
    localStorage.setItem('ab_goals', JSON.stringify(goals));
    localStorage.setItem('ab_credit_cards', JSON.stringify(creditCards));
    localStorage.setItem('ab_fixed_expenses', JSON.stringify(fixedExpenses));
    localStorage.setItem('ab_monthly_income', monthlyIncome.toString());
  }, [activeScope, transactions, categories, budgets, goals, creditCards, fixedExpenses, monthlyIncome]);

  // Filtered Data based on Scope
  const filteredTransactions = useMemo(() => transactions.filter(t => t.scope === activeScope), [transactions, activeScope]);
  const filteredBudgets = useMemo(() => budgets.filter(b => b.scope === activeScope), [budgets, activeScope]);
  const filteredGoals = useMemo(() => goals.filter(g => g.scope === activeScope), [goals, activeScope]);
  const filteredCategories = useMemo(() => categories.filter(c => !c.scope || c.scope === activeScope), [categories, activeScope]);
  const filteredCards = useMemo(() => creditCards.filter(c => c.scope === activeScope), [creditCards, activeScope]);
  const filteredFixed = useMemo(() => fixedExpenses.filter(f => f.scope === activeScope), [fixedExpenses, activeScope]);

  // Actions
  const addTransaction = (t: Omit<Transaction, 'id' | 'scope'>) => {
    const newT: Transaction = { ...t, id: generateId(), scope: activeScope };
    setTransactions(prev => [newT, ...prev]);

    if (t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CARD && t.cardId) {
      setCreditCards(prev => prev.map(card => 
        card.id === t.cardId ? { ...card, currentBalance: card.currentBalance + t.amount } : card
      ));
    }
  };

  const deleteTransaction = (id: string) => {
    const tToDelete = transactions.find(t => t.id === id);
    if (!tToDelete) return;

    if (confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      if (tToDelete.type === TransactionType.EXPENSE && tToDelete.paymentMethod === PaymentMethod.CARD && tToDelete.cardId) {
        setCreditCards(prev => prev.map(card => 
          card.id === tToDelete.cardId ? { ...card, currentBalance: Math.max(0, card.currentBalance - tToDelete.amount) } : card
        ));
      }
    }
  };

  const payCreditCard = (cardId: string, amount: number) => {
    setCreditCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, currentBalance: Math.max(0, card.currentBalance - amount) } : card
    ));
    
    const newT: Transaction = {
      id: generateId(),
      type: TransactionType.EXPENSE,
      scope: activeScope,
      date: new Date().toISOString().split('T')[0],
      description: `Pago Tarjeta: ${creditCards.find(c => c.id === cardId)?.name}`,
      amount: amount,
      categoryId: 'exp-12',
      paymentMethod: PaymentMethod.TRANSFER,
      isRecurrent: false,
      frequency: RecurrenceFrequency.NONE,
      tags: ['pago-tarjeta']
    };
    setTransactions(prev => [newT, ...prev]);
    alert('Pago registrado correctamente.');
  };

  const applyFixedExpenses = () => {
    if (filteredFixed.length === 0) {
      alert('No tienes gastos fijos configurados en este perfil.');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const newTransactions: Transaction[] = [];
    const updatedCards = [...creditCards];

    filteredFixed.forEach(expense => {
      const newT: Transaction = {
        id: generateId(),
        type: TransactionType.EXPENSE,
        scope: activeScope,
        date: dateStr,
        description: `Gasto Fijo: ${expense.name}`,
        amount: expense.amount,
        categoryId: expense.categoryId,
        paymentMethod: expense.paymentMethod,
        isRecurrent: true,
        frequency: RecurrenceFrequency.MONTHLY,
        tags: ['fijo'],
        cardId: expense.cardId
      };
      newTransactions.push(newT);

      if (expense.paymentMethod === PaymentMethod.CARD && expense.cardId) {
        const cardIndex = updatedCards.findIndex(c => c.id === expense.cardId);
        if (cardIndex !== -1) {
          updatedCards[cardIndex] = {
            ...updatedCards[cardIndex],
            currentBalance: updatedCards[cardIndex].currentBalance + expense.amount
          };
        }
      }
    });

    setTransactions(prev => [...newTransactions, ...prev]);
    setCreditCards(updatedCards);
    alert(`¡Se han aplicado ${newTransactions.length} gastos fijos y actualizado los saldos de tus tarjetas!`);
  };

  const updateBudget = (b: Omit<Budget, 'id' | 'scope'>) => {
    setBudgets(prev => {
      const exists = prev.find(item => 
        item.categoryId === b.categoryId && 
        item.month === b.month && 
        item.year === b.year &&
        item.scope === activeScope
      );
      if (exists) {
        return prev.map(item => item.id === exists.id ? { ...b, id: exists.id, scope: activeScope } as Budget : item);
      }
      return [...prev, { ...b, id: generateId(), scope: activeScope } as Budget];
    });
  };

  const handleLogout = () => {
    if (confirm('¿Cerrar sesión y limpiar datos locales?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-2xl lg:shadow-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full">
            <div className="p-8 flex items-center justify-between">
              <Link to="/" className="flex items-center space-x-3 group" onClick={() => setIsSidebarOpen(false)}>
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg transition-all",
                  activeScope === FinScope.BUSINESS ? "bg-emerald-600 shadow-emerald-200" : "bg-indigo-600 shadow-indigo-200"
                )}>M</div>
                <h1 className="text-2xl font-black tracking-tighter text-slate-900">Macetamania</h1>
              </Link>
              <button className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-xl" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
              <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">General</div>
              <NavItem to="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Resumen" scope={activeScope} onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/transactions" icon={<ArrowLeftRight className="w-5 h-5" />} label="Transacciones" scope={activeScope} onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/reports" icon={<PieChart className="w-5 h-5" />} label="Reportes" scope={activeScope} onClick={() => setIsSidebarOpen(false)} />
              
              <div className="px-4 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuración</div>
              <NavItem to="/profile" icon={<UserCheck className="w-5 h-5" />} label="Mi Perfil Financiero" scope={activeScope} onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/cards" icon={<CreditCardIcon className="w-5 h-5" />} label="Tarjetas" scope={activeScope} onClick={() => setIsSidebarOpen(false)} />
              
              <div className="px-4 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Planificación</div>
              <NavItem to="/budgets" icon={<Tag className="w-5 h-5" />} label="Presupuestos" scope={activeScope} onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/categories" icon={<Plus className="w-5 h-5" />} label="Categorías" scope={activeScope} onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/savings" icon={<Target className="w-5 h-5" />} label="Metas de Ahorro" scope={activeScope} onClick={() => setIsSidebarOpen(false)} />
            </nav>

            <div className="p-6 mt-auto border-t border-slate-100 space-y-2">
              <NavItem to="/settings" icon={<SettingsIcon className="w-5 h-5" />} label="Opciones" scope={activeScope} onClick={() => setIsSidebarOpen(false)} />
              <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-sm font-bold text-rose-600 rounded-xl hover:bg-rose-50 transition-all group">
                <LogOut className="w-5 h-5 mr-3 text-rose-400 group-hover:text-rose-600" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-30">
            <div className="flex items-center space-x-4">
              <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl mr-2" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button 
                  onClick={() => setActiveScope(FinScope.PERSONAL)}
                  className={cn(
                    "flex items-center px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                    activeScope === FinScope.PERSONAL 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <User className="w-3 h-3 mr-2" /> Personal
                </button>
                <button 
                  onClick={() => setActiveScope(FinScope.BUSINESS)}
                  className={cn(
                    "flex items-center px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                    activeScope === FinScope.BUSINESS 
                      ? "bg-white text-emerald-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Briefcase className="w-3 h-3 mr-2" /> Macetamanía
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-5">
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
                 <div className={cn("w-2 h-2 rounded-full", activeScope === FinScope.BUSINESS ? "bg-emerald-500 animate-pulse" : "bg-indigo-500")}></div>
                 <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Perfil {activeScope === FinScope.BUSINESS ? 'Negocio' : 'Personal'}
                 </span>
              </div>
              <button className="relative p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
              </button>
              <Link to="/settings" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 rounded-2xl bg-slate-200 overflow-hidden shadow-sm border-2 border-white group-hover:border-emerald-500 transition-all">
                  <img src={`https://ui-avatars.com/api/?name=${activeScope === FinScope.BUSINESS ? 'Macetamania' : 'Usuario'}&background=${activeScope === FinScope.BUSINESS ? '10b981' : '4f46e5'}&color=fff`} alt="Avatar" />
                </div>
              </Link>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50/50 custom-scrollbar">
            <Routes>
              <Route path="/" element={
                <Dashboard 
                  transactions={filteredTransactions} 
                  budgets={filteredBudgets} 
                  categories={filteredCategories} 
                  goals={filteredGoals} 
                  creditCards={filteredCards}
                  scope={activeScope}
                />
              } />
              <Route path="/transactions" element={
                <Transactions 
                  transactions={filteredTransactions} 
                  categories={filteredCategories} 
                  onAdd={addTransaction}
                  onDelete={deleteTransaction}
                  scope={activeScope}
                  creditCards={filteredCards}
                />
              } />
              <Route path="/cards" element={
                <CreditCardsView 
                  creditCards={creditCards}
                  setCreditCards={setCreditCards}
                  scope={activeScope}
                  onPay={payCreditCard}
                  transactions={filteredTransactions}
                />
              } />
              <Route path="/profile" element={
                <FinancialProfile 
                  monthlyIncome={monthlyIncome}
                  setMonthlyIncome={setMonthlyIncome}
                  fixedExpenses={fixedExpenses}
                  setFixedExpenses={setFixedExpenses}
                  categories={filteredCategories}
                  creditCards={filteredCards}
                  scope={activeScope}
                  onApply={applyFixedExpenses}
                />
              } />
              <Route path="/budgets" element={
                <Budgets 
                  budgets={filteredBudgets} 
                  transactions={filteredTransactions} 
                  categories={filteredCategories} 
                  onUpdate={updateBudget}
                />
              } />
              <Route path="/categories" element={
                <Categories 
                  categories={categories} 
                  setCategories={setCategories}
                />
              } />
              <Route path="/savings" element={
                <SavingsGoals 
                  goals={filteredGoals} 
                  setGoals={setGoals} 
                  scope={activeScope}
                />
              } />
              <Route path="/reports" element={
                <Reports 
                  transactions={filteredTransactions} 
                  categories={filteredCategories} 
                />
              } />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

const NavItem = ({ to, icon, label, onClick, scope }: { to: string, icon: React.ReactNode, label: string, onClick?: () => void, scope: FinScope }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={cn(
        "flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 group relative",
        isActive 
          ? (scope === FinScope.BUSINESS ? "bg-emerald-600 text-white shadow-emerald-100" : "bg-indigo-600 text-white shadow-indigo-100 shadow-lg") 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <span className={cn("mr-3 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")}>
        {icon}
      </span>
      {label}
      {isActive && (
        <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
      )}
    </Link>
  );
};

export default App;
