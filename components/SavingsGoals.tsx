
import React, { useState } from 'react';
// Fix: Import X icon
import { Target, Plus, Trash2, PiggyBank, Calendar, X } from 'lucide-react';
import { SavingsGoal, FinScope } from '../types';
import { formatCurrency, generateId, cn } from '../lib/utils';

interface SavingsGoalsProps {
  goals: SavingsGoal[];
  setGoals: React.Dispatch<React.SetStateAction<SavingsGoal[]>>;
  scope: FinScope;
}

const SavingsGoals: React.FC<SavingsGoalsProps> = ({ goals, setGoals, scope }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    color: '#10b981'
  });

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal: SavingsGoal = {
      id: generateId(),
      name: formData.name,
      // Fix: assigned the current scope to the new goal
      scope: scope,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount) || 0,
      deadline: formData.deadline,
      color: formData.color
    };
    setGoals(prev => [...prev, newGoal]);
    setIsModalOpen(false);
    setFormData({ name: '', targetAmount: '', currentAmount: '', deadline: '', color: '#10b981' });
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const addContribution = (id: string, amount: number) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g));
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Metas de Ahorro</h2>
          <p className="text-slate-500">Visualiza tus objetivos y mantén la motivación para ahorrar.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Meta
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          return (
            <div key={goal.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:border-emerald-200 transition-colors">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{backgroundColor: goal.color}}
                  >
                    <Target className="w-6 h-6" />
                  </div>
                  <button onClick={() => deleteGoal(goal.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1">{goal.name}</h3>
                <p className="text-sm text-slate-500 mb-6 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                  Vence: {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'Sin fecha'}
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-slate-400">Objetivo: {formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{width: `${Math.min(progress, 100)}%`, backgroundColor: goal.color}}
                    ></div>
                  </div>
                  <p className="text-[10px] font-bold text-emerald-600 text-right uppercase tracking-wider">
                    {Math.round(progress)}% Completado
                  </p>
                </div>
              </div>

              <div className="mt-auto p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                <button 
                  onClick={() => addContribution(goal.id, 100)}
                  className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center"
                >
                  <Plus className="w-3 h-3 mr-1" /> $100
                </button>
                <button 
                  onClick={() => addContribution(goal.id, 500)}
                  className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center"
                >
                  <Plus className="w-3 h-3 mr-1" /> $500
                </button>
                <button 
                  className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
                  onClick={() => {
                    const amount = prompt('Ingrese el monto a aportar:');
                    if (amount && !isNaN(parseFloat(amount))) addContribution(goal.id, parseFloat(amount));
                  }}
                >
                  <PiggyBank className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-slate-800 font-bold mb-1">Crea tu primera meta</h3>
            <p className="text-slate-500 text-sm mb-6">Ahorra para ese viaje, coche o fondo de emergencia.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              Comenzar ahora
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Nueva Meta de Ahorro</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddGoal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nombre de la Meta</label>
                <input 
                  type="text" 
                  placeholder="Ej: Fondo de emergencia" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Objetivo</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    required
                    value={formData.targetAmount}
                    onChange={e => setFormData({...formData, targetAmount: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ahorro Inicial</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.currentAmount}
                    onChange={e => setFormData({...formData, currentAmount: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha Límite</label>
                <input 
                  type="date"
                  value={formData.deadline}
                  onChange={e => setFormData({...formData, deadline: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Color Distintivo</label>
                <div className="flex gap-2">
                  {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(c => (
                    <button 
                      key={c}
                      type="button"
                      onClick={() => setFormData({...formData, color: c})}
                      className={cn("w-8 h-8 rounded-full border-2", formData.color === c ? "border-slate-900 shadow-md" : "border-transparent")}
                      style={{backgroundColor: c}}
                    />
                  ))}
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700">Crear Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsGoals;
