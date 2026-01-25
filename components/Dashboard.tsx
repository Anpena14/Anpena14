
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertCircle,
  Plus,
  ArrowRight,
  Target,
  CreditCard as CardIcon,
  Briefcase,
  User as UserIcon,
  Layers,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Transaction, Budget, Category, SavingsGoal, TransactionType, FinScope, PaymentMethod, CreditCard } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { getIcon } from '../constants';

interface DashboardProps {
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  goals: SavingsGoal[];
  creditCards: CreditCard[];
  scope: FinScope;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, budgets, categories, goals, creditCards, scope }) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Metrics for current month
  const currentMonthStats = useMemo(() => {
    const monthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = monthTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const cardExpenses = monthTransactions
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CARD)
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses, balance: income - expenses, cardExpenses };
  }, [transactions, currentMonth, currentYear]);

  // Card Reminders Logic
  const upcomingPayments = useMemo(() => {
    const today = now.getDate();
    return creditCards
      .filter(card => card.scope === scope && card.currentBalance > 0)
      .map(card => {
        let daysRemaining = card.paymentDay - today;
        if (daysRemaining < 0) {
          // Asumimos que es para el próximo mes
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          daysRemaining = (lastDay - today) + card.paymentDay;
        }
        return { ...card, daysRemaining };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [creditCards, scope, now]);

  // Chart data: Monthly comparison (Last 6 months)
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const monthTransactions = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === m && td.getFullYear() === y;
      });

      const income = monthTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = monthTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

      data.push({
        name: d.toLocaleString('default', { month: 'short' }),
        Ingresos: income,
        Gastos: expenses
      });
    }
    return data;
  }, [transactions]);

  // Pie chart data: Expenses by category
  const pieData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const monthExpenses = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === TransactionType.EXPENSE;
    });

    monthExpenses.forEach(t => {
      categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
    });

    return Object.entries(categoryTotals).map(([catId, total]) => {
      const cat = categories.find(c => c.id === catId);
      return {
        name: cat?.name || 'Otro',
        value: total,
        color: cat?.color || '#cbd5e1'
      };
    }).sort((a, b) => b.value - a.value);
  }, [transactions, categories, currentMonth, currentYear]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
             <div className={cn("p-1.5 rounded-lg", scope === FinScope.BUSINESS ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600")}>
                {scope === FinScope.BUSINESS ? <Briefcase className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
             </div>
             <h2 className="text-2xl font-bold text-slate-900">
                {scope === FinScope.BUSINESS ? 'Resumen de Macetamanía' : 'Mi Presupuesto Personal'}
             </h2>
          </div>
          <p className="text-slate-500">Control de {scope === FinScope.BUSINESS ? 'ventas y materiales' : 'sueldos y gastos fijos'}.</p>
        </div>
        <Link to="/transactions" className={cn(
          "flex items-center px-6 py-3 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95",
          scope === FinScope.BUSINESS ? "bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700" : "bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700"
        )}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Entrada
        </Link>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          label={scope === FinScope.BUSINESS ? "Utilidad Neta" : "Balance Mensual"}
          value={formatCurrency(currentMonthStats.balance)} 
          subText="Saldo libre este mes"
          icon={<Wallet className={cn("w-6 h-6", scope === FinScope.BUSINESS ? "text-emerald-600" : "text-indigo-600")} />}
          trend={currentMonthStats.balance >= 0 ? "positive" : "negative"}
        />
        <StatCard 
          label={scope === FinScope.BUSINESS ? "Ventas" : "Ingresos Totales"}
          value={formatCurrency(currentMonthStats.income)} 
          subText="Recaudado"
          icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
          bgColor="bg-emerald-50/50"
        />
        <StatCard 
          label={scope === FinScope.BUSINESS ? "Costos/Insumos" : "Gastos Totales"}
          value={formatCurrency(currentMonthStats.expenses)} 
          subText="Egresos"
          icon={<TrendingDown className="w-6 h-6 text-rose-600" />}
          bgColor="bg-rose-50/50"
        />
        <StatCard 
          label="Uso de Tarjeta" 
          value={formatCurrency(currentMonthStats.cardExpenses)} 
          subText="Gastado a crédito"
          icon={<CardIcon className="w-6 h-6 text-amber-600" />}
          bgColor="bg-amber-50/50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-8">
          {/* Card Reminders */}
          {upcomingPayments.length > 0 && (
             <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="font-bold text-slate-800 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-3 text-amber-500" />
                      Próximos Vencimientos de Tarjeta
                   </h3>
                   <Link to="/cards" className="text-xs font-bold text-indigo-600 hover:underline">Ver todas</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {upcomingPayments.slice(0, 2).map(card => (
                      <div key={card.id} className="flex items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                         <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white mr-4 shadow-sm" style={{backgroundColor: card.color}}>
                            <CardIcon className="w-5 h-5" />
                         </div>
                         <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">{card.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Saldo: {formatCurrency(card.currentBalance)}</p>
                         </div>
                         <div className="text-right">
                            <p className={cn(
                               "text-xs font-black px-3 py-1 rounded-full",
                               card.daysRemaining <= 3 ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-indigo-100 text-indigo-600"
                            )}>
                               {card.daysRemaining === 0 ? '¡Hoy!' : card.daysRemaining === 1 ? 'Mañana' : `En ${card.daysRemaining} días`}
                            </p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-slate-800 flex items-center">
                Tendencia de {scope === FinScope.BUSINESS ? 'Negocio' : 'Consumo'}
              </h3>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="Ingresos" fill={scope === FinScope.BUSINESS ? "#10b981" : "#4f46e5"} radius={[6, 6, 0, 0]} barSize={25} />
                  <Bar dataKey="Gastos" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-8">Distribución de Gastos</h3>
          <div className="h-60 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full mr-2" style={{backgroundColor: item.color}}></div>
                  <span className="text-slate-600 font-medium truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{formatCurrency(item.value)}</span>
              </div>
            ))}
            {pieData.length === 0 && (
              <div className="text-center py-10 text-slate-400 italic">No hay registros este mes</div>
            )}
          </div>
        </section>
      </div>
      
      {scope === FinScope.PERSONAL && (
        <div className="bg-indigo-600 rounded-[40px] p-10 text-white flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-indigo-200 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10 space-y-2">
            <h3 className="text-2xl font-black">Monitoreo de Tarjeta</h3>
            <p className="text-indigo-100 max-w-md">Llevas consumido {formatCurrency(currentMonthStats.cardExpenses)} este mes. Asegúrate de tener liquidez para el próximo corte.</p>
          </div>
          <div className="mt-8 md:mt-0 relative z-10">
             <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl">
                <div className="flex items-center space-x-4">
                   <div className="p-3 bg-white rounded-2xl">
                      <CardIcon className="w-8 h-8 text-indigo-600" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Impacto en Presupuesto</p>
                      <p className="text-3xl font-black">
                        {currentMonthStats.expenses > 0 ? Math.round((currentMonthStats.cardExpenses / currentMonthStats.expenses) * 100) : 0}%
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, subText, icon, bgColor = "bg-white", trend }: any) => (
  <div className={cn("p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all", bgColor)}>
    <div className="relative z-10 flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <h4 className="text-2xl font-black text-slate-900 group-hover:scale-105 transition-transform origin-left">{value}</h4>
        <div className="flex items-center pt-1">
           {trend === 'positive' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></div>}
           {trend === 'negative' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2 animate-pulse"></div>}
           <p className="text-[10px] font-bold text-slate-500 uppercase">{subText}</p>
        </div>
      </div>
      <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-50">
        {icon}
      </div>
    </div>
  </div>
);

export default Dashboard;
