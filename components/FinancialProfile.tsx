
import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Wallet, 
  CreditCard as CardIcon, 
  CheckCircle2, 
  X,
  Banknote,
  Smartphone,
  Info,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
// Fixed: Added TransactionType to the imported types from '../types'
import { FixedExpense, FinScope, Category, CreditCard, PaymentMethod, TransactionType } from '../types';
import { formatCurrency, generateId, cn } from '../lib/utils';
import { getIcon } from '../constants';

interface FinancialProfileProps {
  monthlyIncome: number;
  setMonthlyIncome: React.Dispatch<React.SetStateAction<number>>;
  fixedExpenses: FixedExpense[];
  setFixedExpenses: React.Dispatch<React.SetStateAction<FixedExpense[]>>;
  categories: Category[];
  creditCards: CreditCard[];
  scope: FinScope;
  onApply: () => void;
}

const FinancialProfile: React.FC<FinancialProfileProps> = ({ 
  monthlyIncome, setMonthlyIncome, fixedExpenses, setFixedExpenses, categories, creditCards, scope, onApply 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIncomeEditing, setIsIncomeEditing] = useState(false);
  const [incomeValue, setIncomeValue] = useState(monthlyIncome.toString());
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    categoryId: '',
    paymentMethod: PaymentMethod.CASH,
    cardId: ''
  });

  const activeFixed = fixedExpenses.filter(f => f.scope === scope);
  const totalFixed = activeFixed.reduce((sum, f) => sum + f.amount, 0);
  const loadPercentage = monthlyIncome > 0 ? (totalFixed / monthlyIncome) * 100 : 0;

  const handleAddFixed = (e: React.FormEvent) => {
    e.preventDefault();
    const newFixed: FixedExpense = {
      id: generateId(),
      name: formData.name,
      amount: parseFloat(formData.amount),
      categoryId: formData.categoryId,
      paymentMethod: formData.paymentMethod,
      cardId: formData.paymentMethod === PaymentMethod.CARD ? formData.cardId : undefined,
      scope: scope
    };

    setFixedExpenses(prev => [...prev, newFixed]);
    setIsModalOpen(false);
    setFormData({ name: '', amount: '', categoryId: '', paymentMethod: PaymentMethod.CASH, cardId: '' });
  };

  const deleteFixed = (id: string) => {
    setFixedExpenses(prev => prev.filter(f => f.id !== id));
  };

  const saveIncome = () => {
    setMonthlyIncome(parseFloat(incomeValue) || 0);
    setIsIncomeEditing(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Mi Estructura Financiera</h2>
          <p className="text-slate-500">Configura tus ingresos base y gastos fijos para automatizar tu mes.</p>
        </div>
        <button 
          onClick={onApply}
          className={cn(
            "flex items-center px-8 py-3 text-white rounded-2xl font-bold transition-all shadow-xl active:scale-95",
            scope === FinScope.BUSINESS ? "bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700" : "bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700"
          )}
        >
          <CheckCircle2 className="w-5 h-5 mr-2" /> Aplicar Gastos del Mes
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Income Card */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <TrendingUp className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ingreso Mensual Estimado</p>
          
          {isIncomeEditing ? (
            <div className="space-y-4">
               <input 
                type="number" 
                value={incomeValue} 
                onChange={e => setIncomeValue(e.target.value)}
                className="text-4xl font-black w-full bg-slate-50 border-b-2 border-indigo-600 p-2 outline-none"
               />
               <button onClick={saveIncome} className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider">Guardar Ingreso</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
               <h3 className="text-4xl font-black text-slate-900">{formatCurrency(monthlyIncome)}</h3>
               <button onClick={() => setIsIncomeEditing(true)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
                 <Plus className="w-5 h-5 rotate-45" />
               </button>
            </div>
          )}
          
          <div className="mt-8 pt-8 border-t border-slate-50">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500">Carga de Gastos Fijos</span>
                <span className={cn("text-xs font-black", loadPercentage > 70 ? "text-rose-600" : "text-emerald-600")}>{Math.round(loadPercentage)}%</span>
             </div>
             <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-1000", loadPercentage > 70 ? "bg-rose-500" : "bg-emerald-500")}
                  style={{ width: `${Math.min(loadPercentage, 100)}%` }}
                ></div>
             </div>
          </div>
        </div>

        {/* Fixed Expenses List */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
             <div>
                <h3 className="text-xl font-black text-slate-900">Mis Gastos Fijos</h3>
                <p className="text-sm text-slate-500">Facturas y compromisos recurrentes.</p>
             </div>
             <button 
                onClick={() => setIsModalOpen(true)}
                className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg active:scale-95"
             >
                <Plus className="w-6 h-6" />
             </button>
          </div>

          <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
             {activeFixed.map(expense => {
               const cat = categories.find(c => c.id === expense.categoryId);
               const card = creditCards.find(c => c.id === expense.cardId);
               return (
                 <div key={expense.id} className="p-8 hover:bg-slate-50/50 transition-all flex items-center group">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mr-6 shadow-sm" 
                      style={{backgroundColor: `${cat?.color}15`, color: cat?.color}}
                    >
                      {getIcon(cat?.icon || 'Tag', "w-7 h-7")}
                    </div>
                    <div className="flex-1">
                       <h4 className="font-bold text-slate-900">{expense.name}</h4>
                       <div className="flex items-center space-x-3 mt-1">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cat?.name || 'Otro'}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className={cn(
                            "flex items-center text-[10px] font-black uppercase tracking-tighter",
                            expense.paymentMethod === PaymentMethod.CARD ? "text-indigo-600" : "text-slate-500"
                          )}>
                             {expense.paymentMethod === PaymentMethod.CARD ? <CardIcon className="w-3 h-3 mr-1" /> : <Banknote className="w-3 h-3 mr-1" />}
                             {expense.paymentMethod === PaymentMethod.CARD && card ? `${card.name} (****${card.lastFour})` : expense.paymentMethod}
                          </span>
                       </div>
                    </div>
                    <div className="text-right mr-8">
                       <p className="text-xl font-black text-slate-900">{formatCurrency(expense.amount)}</p>
                    </div>
                    <button onClick={() => deleteFixed(expense.id)} className="p-3 text-slate-200 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                       <Trash2 className="w-5 h-5" />
                    </button>
                 </div>
               );
             })}

             {activeFixed.length === 0 && (
                <div className="py-24 text-center">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Wallet className="w-10 h-10 text-slate-200" />
                   </div>
                   <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No has definido gastos fijos aún</p>
                </div>
             )}
          </div>
          
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
             <span className="text-sm font-bold text-slate-500">Total Fijos:</span>
             <span className="text-2xl font-black text-slate-900">{formatCurrency(totalFixed)}</span>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Agregar Gasto Fijo</h3>
                <p className="text-sm text-slate-500">Este gasto se repetirá todos los meses.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddFixed} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Gasto (ej: Netflix, Alquiler)</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto ($)</label>
                  <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
                  <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none">
                    <option value="">Seleccionar...</option>
                    {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Método de Pago Predeterminado</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: PaymentMethod.CASH, label: 'Efectivo', icon: <Banknote className="w-4 h-4 mb-1" /> },
                    { id: PaymentMethod.CARD, label: 'Tarjeta', icon: <CardIcon className="w-4 h-4 mb-1" /> },
                    { id: PaymentMethod.TRANSFER, label: 'Transf.', icon: <Smartphone className="w-4 h-4 mb-1" /> },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setFormData({...formData, paymentMethod: method.id})}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
                        formData.paymentMethod === method.id 
                          ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                          : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      {method.icon}
                      <span className="text-[10px] font-black uppercase">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {formData.paymentMethod === PaymentMethod.CARD && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">¿Con qué tarjeta se paga?</label>
                   <select required value={formData.cardId} onChange={e => setFormData({...formData, cardId: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none ring-2 ring-indigo-500/20">
                      <option value="">Seleccionar tarjeta...</option>
                      {creditCards.map(card => (
                        <option key={card.id} value={card.id}>{card.name} (**** {card.lastFour})</option>
                      ))}
                   </select>
                   {creditCards.length === 0 && (
                      <p className="mt-2 text-[10px] text-rose-500 flex items-center font-bold">
                        <AlertCircle className="w-3 h-3 mr-1" /> Debes registrar una tarjeta primero en la sección "Tarjetas".
                      </p>
                   )}
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-4 bg-slate-100 text-slate-700 rounded-3xl font-black text-sm hover:bg-slate-200">Cancelar</button>
                <button type="submit" disabled={formData.paymentMethod === PaymentMethod.CARD && !formData.cardId} className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-3xl font-black text-sm shadow-xl active:scale-95 disabled:opacity-50">Guardar Gasto Fijo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialProfile;
