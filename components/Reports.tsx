
import React, { useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Transaction, Category, TransactionType } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { FileText, TrendingUp, Download, Calendar } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  categories: Category[];
}

const Reports: React.FC<ReportsProps> = ({ transactions, categories }) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Monthly comparison data
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const t = transactions.filter(tr => {
        const date = new Date(tr.date);
        return date.getMonth() === m && date.getFullYear() === y;
      });

      const income = t.filter(tr => tr.type === TransactionType.INCOME).reduce((s, tr) => s + tr.amount, 0);
      const expenses = t.filter(tr => tr.type === TransactionType.EXPENSE).reduce((s, tr) => s + tr.amount, 0);

      months.push({
        name: d.toLocaleString('default', { month: 'short' }),
        Ingresos: income,
        Gastos: expenses,
        Balance: income - expenses
      });
    }
    return months;
  }, [transactions]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const expenseTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE);
    const totals: Record<string, number> = {};
    
    expenseTransactions.forEach(t => {
      totals[t.categoryId] = (totals[t.categoryId] || 0) + t.amount;
    });

    return Object.entries(totals)
      .map(([id, amount]) => {
        const cat = categories.find(c => c.id === id);
        return {
          name: cat?.name || 'Otro',
          value: amount,
          color: cat?.color || '#cbd5e1'
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reportes Financieros</h2>
          <p className="text-slate-500">Análisis profundo de tus hábitos de consumo y ahorro anual.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4 mr-2 text-slate-400" /> PDF
          </button>
           <button className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100">
            <Calendar className="w-4 h-4 mr-2" /> 2024
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Balance Area Chart */}
        <section className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 mr-3 text-emerald-500" />
            Evolución de Balance Neto
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="Balance" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Expenses Pie Chart */}
        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6">Distribución Total</h3>
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {categoryData.slice(0, 6).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full mr-2" style={{backgroundColor: item.color}}></div>
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Bar Chart */}
        <section className="lg:col-span-3 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-8">Comparativa Mensual: Ingresos vs Gastos</h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '30px', fontSize: '12px', fontWeight: 'bold'}} />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[6, 6, 0, 0]} barSize={25} />
                <Bar dataKey="Gastos" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Reports;
