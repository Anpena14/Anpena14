
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  ChevronRight,
  ArrowLeftRight,
  CreditCard as CardIcon,
  Banknote,
  Smartphone,
  Tag,
  X
} from 'lucide-react';
import { Transaction, Category, TransactionType, PaymentMethod, RecurrenceFrequency, FinScope, CreditCard } from '../types';
import { formatCurrency, cn, generateId } from '../lib/utils';
import { getIcon } from '../constants';

interface TransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  onAdd: (t: Omit<Transaction, 'id' | 'scope'>) => void;
  onDelete: (id: string) => void;
  scope: FinScope;
  creditCards: CreditCard[];
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, categories, onAdd, onDelete, scope, creditCards }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    type: TransactionType.EXPENSE,
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    categoryId: '',
    paymentMethod: PaymentMethod.CASH,
    isRecurrent: false,
    frequency: RecurrenceFrequency.NONE,
    cardId: ''
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || t.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, filterType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.categoryId) return;
    
    onAdd({
      type: formData.type,
      date: formData.date,
      description: formData.description,
      amount: parseFloat(formData.amount),
      categoryId: formData.categoryId,
      paymentMethod: formData.paymentMethod,
      isRecurrent: formData.isRecurrent,
      frequency: formData.frequency,
      tags: [],
      cardId: formData.paymentMethod === PaymentMethod.CARD ? formData.cardId : undefined
    });

    setFormData({
      type: TransactionType.EXPENSE,
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      categoryId: '',
      paymentMethod: PaymentMethod.CASH,
      isRecurrent: false,
      frequency: RecurrenceFrequency.NONE,
      cardId: ''
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Movimientos de {scope === FinScope.BUSINESS ? 'Macetamanía' : 'Mi Bolsillo'}</h2>
          <p className="text-slate-500">Historial completo de tus registros en este perfil.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="flex items-center px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4 mr-2 text-slate-400" /> Exportar CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className={cn(
              "flex items-center px-6 py-2.5 text-white rounded-xl font-bold transition-all shadow-lg shadow-slate-100",
              scope === FinScope.BUSINESS ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"
            )}
          >
            <Plus className="w-4 h-4 mr-2" /> Nueva Entrada
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-5 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="¿Qué buscas? (ej: sueldo, materiales, abono...)" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
          />
        </div>
        <div className="flex items-center space-x-3 w-full lg:w-auto">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setFilterType('ALL')}
              className={cn("px-5 py-2 rounded-xl text-xs font-bold transition-all", filterType === 'ALL' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterType(TransactionType.INCOME)}
              className={cn("px-5 py-2 rounded-xl text-xs font-bold transition-all", filterType === TransactionType.INCOME ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}
            >
              Ingresos
            </button>
            <button 
              onClick={() => setFilterType(TransactionType.EXPENSE)}
              className={cn("px-5 py-2 rounded-xl text-xs font-bold transition-all", filterType === TransactionType.EXPENSE ? "bg-white text-rose-600 shadow-sm" : "text-slate-500")}
            >
              Gastos
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoría</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Método</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Monto</th>
                <th className="px-8 py-5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((t) => {
                const cat = categories.find(c => c.id === t.categoryId);
                const card = creditCards.find(c => c.id === t.cardId);
                return (
                  <tr key={t.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-slate-500">
                      {new Date(t.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{t.description}</span>
                        {card && <span className="text-[9px] text-indigo-600 font-black uppercase tracking-widest mt-0.5">{card.name} (**** {card.lastFour})</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 shadow-sm" 
                          style={{backgroundColor: `${cat?.color}15` || '#f1f5f9', color: cat?.color}}
                        >
                          {getIcon(cat?.icon || 'Tag', "w-5 h-5")}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{cat?.name || 'Otro'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider",
                        t.paymentMethod === PaymentMethod.CARD ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-slate-100 text-slate-600"
                      )}>
                        {t.paymentMethod === PaymentMethod.CARD ? <CardIcon className="w-3 h-3 mr-1.5" /> : <Banknote className="w-3 h-3 mr-1.5" />}
                        {t.paymentMethod}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right whitespace-nowrap">
                      <span className={cn(
                        "text-base font-black",
                        t.type === TransactionType.INCOME ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => onDelete(t.id)}
                        className="p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Registrar en {scope === FinScope.BUSINESS ? 'Macetamanía' : 'Personal'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Flujo</label>
                  <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
                    <button type="button" onClick={() => setFormData({...formData, type: TransactionType.EXPENSE})} className={cn("flex-1 py-2.5 rounded-xl text-xs font-bold transition-all", formData.type === TransactionType.EXPENSE ? "bg-white text-rose-600 shadow-sm" : "text-slate-500")}>Gasto</button>
                    <button type="button" onClick={() => setFormData({...formData, type: TransactionType.INCOME})} className={cn("flex-1 py-2.5 rounded-xl text-xs font-bold transition-all", formData.type === TransactionType.INCOME ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}>Ingreso</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto</label>
                  <input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción</label>
                <input type="text" required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
                  <select required value={formData.categoryId} onChange={(e) => setFormData({...formData, categoryId: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none">
                    <option value="">Seleccionar...</option>
                    {categories.filter(c => c.type === formData.type).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha</label>
                  <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Método de Pago</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: PaymentMethod.CASH, label: 'Efectivo', icon: <Banknote className="w-4 h-4 mb-1" /> },
                    { id: PaymentMethod.CARD, label: 'Tarjeta', icon: <CardIcon className="w-4 h-4 mb-1" /> },
                    { id: PaymentMethod.TRANSFER, label: 'Transf.', icon: <Smartphone className="w-4 h-4 mb-1" /> },
                    { id: PaymentMethod.OTHER, label: 'Otro', icon: <Tag className="w-4 h-4 mb-1" /> },
                  ].map((method) => (
                    <button key={method.id} type="button" onClick={() => setFormData({...formData, paymentMethod: method.id})} className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all", formData.paymentMethod === method.id ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200")}>
                      {method.icon}
                      <span className="text-[10px] font-black uppercase">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {formData.paymentMethod === PaymentMethod.CARD && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seleccionar Tarjeta</label>
                   <select required value={formData.cardId} onChange={(e) => setFormData({...formData, cardId: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none ring-2 ring-indigo-500/20">
                      <option value="">¿Cuál tarjeta usaste?</option>
                      {creditCards.map(card => (
                        <option key={card.id} value={card.id}>{card.name} (**** {card.lastFour})</option>
                      ))}
                   </select>
                </div>
              )}

              <div className="flex space-x-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-4 bg-slate-100 text-slate-700 rounded-3xl font-black text-sm hover:bg-slate-200">Cancelar</button>
                <button type="submit" className={cn("flex-1 px-8 py-4 text-white rounded-3xl font-black text-sm transition-all shadow-xl active:scale-95", scope === FinScope.BUSINESS ? "bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700" : "bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700")}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
