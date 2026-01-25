
import React, { useState, useMemo } from 'react';
import { 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Edit2, 
  Check, 
  X,
  Plus,
  BarChart3,
  ArrowUpRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { Budget, Category, Transaction, TransactionType } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { getIcon } from '../constants';

interface BudgetsProps {
  budgets: Budget[];
  transactions: Transaction[];
  categories: Category[];
  onUpdate: (b: Budget) => void;
}

const Budgets: React.FC<BudgetsProps> = ({ budgets, transactions, categories, onUpdate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const prevMonth = () => {
    const d = new Date(currentDate);
    // Fix: replaced undefined variable 'i' with 1 to correctly decrement the month
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const budgetItems = useMemo(() => {
    return categories
      .filter(c => c.type === TransactionType.EXPENSE)
      .map(cat => {
        const budget = budgets.find(b => b.categoryId === cat.id && b.month === currentMonth && b.year === currentYear);
        const actual = transactions
          .filter(t => t.categoryId === cat.id && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
          .reduce((sum, t) => sum + t.amount, 0);
        
        return {
          category: cat,
          budgetAmount: budget?.amount || 0,
          actualAmount: actual,
          percent: budget && budget.amount > 0 ? (actual / budget.amount) * 100 : 0
        };
      });
  }, [categories, budgets, transactions, currentMonth, currentYear]);

  const totals = useMemo(() => {
    const budgeted = budgetItems.reduce((sum, item) => sum + item.budgetAmount, 0);
    const spent = budgetItems.reduce((sum, item) => sum + item.actualAmount, 0);
    const remaining = Math.max(0, budgeted - spent);
    const percent = budgeted > 0 ? (spent / budgeted) * 100 : 0;
    
    return { budgeted, spent, remaining, percent };
  }, [budgetItems]);

  const chartData = [
    { name: 'Gastado', value: totals.spent, color: totals.percent > 100 ? '#ef4444' : '#10b981' },
    { name: 'Disponible', value: totals.remaining, color: '#f1f5f9' }
  ];

  const handleEdit = (catId: string, currentAmount: number) => {
    setEditingId(catId);
    setEditValue(currentAmount.toString());
  };

  const handleSave = (catId: string) => {
    const amount = parseFloat(editValue) || 0;
    onUpdate({
      id: '', // Will be handled in parent
      categoryId: catId,
      amount,
      month: currentMonth,
      year: currentYear
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Presupuestos Mensuales</h2>
          <p className="text-slate-500">Planifica tus gastos y mantén el control de tus finanzas.</p>
        </div>
        <div className="flex items-center space-x-4 bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm">
          <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-slate-900"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm font-bold text-slate-700 min-w-[140px] text-center capitalize">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 text-slate-400 hover:text-slate-900"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Desglose por Categoría</h3>
              <button className="text-xs font-bold text-emerald-600 flex items-center hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
                <Copy className="w-3 h-3 mr-2" /> Copiar anterior
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {budgetItems.map((item, idx) => (
                <div key={idx} className="p-8 hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mr-4 shadow-sm" 
                        style={{backgroundColor: `${item.category.color}15`, color: item.category.color}}
                      >
                        {getIcon(item.category.icon, "w-6 h-6")}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{item.category.name}</h4>
                        <p className="text-xs text-slate-400 font-medium">
                          {item.budgetAmount > 0 
                            ? `${formatCurrency(item.actualAmount)} de ${formatCurrency(item.budgetAmount)}`
                            : 'Presupuesto no asignado'}
                        </p>
                      </div>
                    </div>
                    
                    {editingId === item.category.id ? (
                      <div className="flex items-center space-x-2">
                        <input 
                          type="number" 
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-28 px-4 py-2 bg-slate-50 border border-emerald-300 rounded-xl text-sm font-bold outline-none ring-4 ring-emerald-500/10"
                        />
                        <button onClick={() => handleSave(item.category.id)} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className={cn("text-sm font-black", item.percent > 90 ? "text-rose-600" : "text-slate-900")}>
                            {Math.round(item.percent)}%
                          </p>
                        </div>
                        <button 
                          onClick={() => handleEdit(item.category.id, item.budgetAmount)}
                          className="p-2.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {item.budgetAmount > 0 && (
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          item.percent > 100 ? "bg-rose-500" : item.percent > 80 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{width: `${Math.min(item.percent, 100)}%`}}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <section className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 rounded-3xl text-white shadow-xl shadow-emerald-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BarChart3 className="w-24 h-24 rotate-12" />
            </div>
            <div className="relative z-10">
              <h3 className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-2">Total Presupuestado</h3>
              <p className="text-4xl font-black mb-6">
                {formatCurrency(totals.budgeted)}
              </p>
              <div className="space-y-4 border-t border-white/10 pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-200 text-xs font-bold uppercase">Ejecutado</span>
                  <span className="font-bold">{formatCurrency(totals.spent)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-200 text-xs font-bold uppercase">Disponible</span>
                  <span className="font-bold text-white">
                    {formatCurrency(totals.remaining)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800">Consejos de Ahorro</h3>
            </div>
            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center mr-3 shrink-0 mt-0.5">
                  <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                </div>
                <p>Prioriza completar primero el fondo de emergencia antes de lujos.</p>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center mr-3 shrink-0 mt-0.5">
                  <ArrowUpRight className="w-3 h-3 text-amber-600" />
                </div>
                <p>Revisa las suscripciones mensuales que no has usado en 30 días.</p>
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* NEW: General Progress Section */}
      <section className="bg-white p-8 lg:p-12 rounded-[40px] border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-12">
        <div className="w-full lg:w-1/3 flex flex-col items-center justify-center">
          <div className="relative w-64 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={105}
                  startAngle={90}
                  endAngle={450}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={cn(
                "text-4xl font-black",
                totals.percent > 100 ? "text-rose-600" : "text-emerald-600"
              )}>
                {Math.round(totals.percent)}%
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Consumido</span>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 text-center lg:text-left w-full">
          <div>
            <h3 className="text-2xl font-black text-slate-900">Estado General del Presupuesto</h3>
            <p className="text-slate-500 mt-2 max-w-xl">
              Has utilizado el {Math.round(totals.percent)}% de tu presupuesto total para {monthLabel}. 
              {totals.percent > 90 
                ? " Estás muy cerca de tu límite mensual, considera reducir gastos no esenciales." 
                : " Vas por buen camino para cumplir tus objetivos financieros este mes."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Presupuestado</p>
              <p className="text-xl font-black text-slate-900">{formatCurrency(totals.budgeted)}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ejecutado</p>
              <p className={cn("text-xl font-black", totals.percent > 100 ? "text-rose-600" : "text-emerald-600")}>
                {formatCurrency(totals.spent)}
              </p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diferencia</p>
              <p className="text-xl font-black text-slate-900">{formatCurrency(totals.remaining)}</p>
            </div>
          </div>

          <div className="pt-4">
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div 
                className={cn(
                  "h-full transition-all duration-1000",
                  totals.percent > 100 ? "bg-rose-500" : "bg-emerald-500"
                )}
                style={{width: `${Math.min(totals.percent, 100)}%`}}
              ></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Budgets;
