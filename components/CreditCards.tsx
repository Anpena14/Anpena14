
import React, { useState } from 'react';
import { Plus, CreditCard as CardIcon, Trash2, X, AlertTriangle, Calendar, Building2, Wallet, ChevronRight, History, Edit2 } from 'lucide-react';
import { CreditCard, FinScope, Transaction } from '../types';
import { formatCurrency, generateId, cn } from '../lib/utils';

interface CreditCardsProps {
  creditCards: CreditCard[];
  setCreditCards: React.Dispatch<React.SetStateAction<CreditCard[]>>;
  scope: FinScope;
  onPay: (cardId: string, amount: number) => void;
  transactions: Transaction[];
}

const CreditCards: React.FC<CreditCardsProps> = ({ creditCards, setCreditCards, scope, onPay, transactions }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  
  const initialForm = {
    name: '',
    bank: '',
    lastFour: '',
    limit: '',
    currentBalance: '0',
    closingDay: '15',
    paymentDay: '5',
    color: '#4f46e5'
  };

  const [formData, setFormData] = useState(initialForm);

  const activeCards = creditCards.filter(c => c.scope === scope);

  const openAddModal = () => {
    setEditingCardId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const openEditModal = (card: CreditCard) => {
    setEditingCardId(card.id);
    setFormData({
      name: card.name,
      bank: card.bank,
      lastFour: card.lastFour,
      limit: card.limit.toString(),
      currentBalance: card.currentBalance.toString(),
      closingDay: card.closingDay.toString(),
      paymentDay: card.paymentDay.toString(),
      color: card.color
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCardId) {
      setCreditCards(prev => prev.map(card => 
        card.id === editingCardId 
          ? {
              ...card,
              name: formData.name,
              bank: formData.bank,
              lastFour: formData.lastFour,
              limit: parseFloat(formData.limit),
              currentBalance: parseFloat(formData.currentBalance),
              closingDay: parseInt(formData.closingDay),
              paymentDay: parseInt(formData.paymentDay),
              color: formData.color
            }
          : card
      ));
    } else {
      const newCard: CreditCard = {
        id: generateId(),
        name: formData.name,
        bank: formData.bank,
        lastFour: formData.lastFour,
        limit: parseFloat(formData.limit),
        currentBalance: parseFloat(formData.currentBalance),
        closingDay: parseInt(formData.closingDay),
        paymentDay: parseInt(formData.paymentDay),
        scope: scope,
        color: formData.color
      };
      setCreditCards(prev => [...prev, newCard]);
    }

    setIsModalOpen(false);
    setFormData(initialForm);
    setEditingCardId(null);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCardId && payAmount) {
      onPay(selectedCardId, parseFloat(payAmount));
      setIsPayModalOpen(false);
      setPayAmount('');
      setSelectedCardId(null);
    }
  };

  const deleteCard = (id: string) => {
    if (confirm('¿Eliminar esta tarjeta? Se perderá el seguimiento de su saldo.')) {
      setCreditCards(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Mis Tarjetas de Crédito</h2>
          <p className="text-slate-500">Controla tus límites, deudas y fechas de pago.</p>
        </div>
        <button 
          onClick={openAddModal}
          className={cn(
            "flex items-center px-6 py-3 text-white rounded-2xl font-bold transition-all shadow-lg",
            scope === FinScope.BUSINESS ? "bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700" : "bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700"
          )}
        >
          <Plus className="w-4 h-4 mr-2" /> Agregar Tarjeta
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {activeCards.map((card) => {
          const usagePercent = (card.currentBalance / card.limit) * 100;
          const cardMovements = transactions
            .filter(t => t.cardId === card.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          return (
            <div key={card.id} className="relative group flex flex-col space-y-4">
              {/* Tarjeta Visual */}
              <div 
                className="p-8 rounded-[32px] text-white shadow-2xl transition-all duration-500 hover:scale-[1.02] overflow-hidden"
                style={{ 
                  backgroundColor: card.color,
                  backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)'
                }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <CardIcon className="w-32 h-32 rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{card.bank}</p>
                      <h3 className="text-xl font-black">{card.name}</h3>
                    </div>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => openEditModal(card)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                        title="Editar Tarjeta"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setSelectedCardId(card.id); setIsPayModalOpen(true); }}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                        title="Pagar/Abonar"
                      >
                        <Wallet className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteCard(card.id)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                        title="Eliminar Tarjeta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto space-y-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2">Deuda Actual</p>
                      <p className="text-3xl font-black">{formatCurrency(card.currentBalance)}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span>Uso: {Math.round(usagePercent)}%</span>
                        <span>Límite: {formatCurrency(card.limit)}</span>
                      </div>
                      <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", usagePercent > 90 ? "bg-rose-400" : usagePercent > 70 ? "bg-amber-400" : "bg-emerald-400")}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                       <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 opacity-70" />
                          <span className="text-xs font-bold">Pago: Día {card.paymentDay}</span>
                       </div>
                       <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                          **** {card.lastFour}
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Movimientos */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-slate-900">
                    <History className="w-4 h-4 mr-2 text-slate-400" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Últimos Movimientos</h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                    {cardMovements.length}
                  </span>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {cardMovements.length > 0 ? (
                    cardMovements.map(t => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 group">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{t.description}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(t.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-rose-500">
                            - {formatCurrency(t.amount)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin movimientos registrados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {activeCards.length === 0 && (
          <div className="col-span-full py-24 bg-white border-2 border-dashed border-slate-200 rounded-[40px] text-center flex flex-col items-center">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <CardIcon className="w-10 h-10 text-slate-300" />
             </div>
             <h3 className="text-xl font-bold text-slate-900">No tienes tarjetas registradas</h3>
             <p className="text-slate-500 mt-2 mb-8 max-w-xs">Registra tus tarjetas para recibir avisos de pago y controlar tu cupo disponible.</p>
             <button 
                onClick={openAddModal}
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95"
             >
                Registrar Tarjeta
             </button>
          </div>
        )}
      </div>

      {/* Modal Agregar/Editar Tarjeta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {editingCardId ? 'Editar Tarjeta' : 'Registrar Tarjeta'}
                </h3>
                <p className="text-sm text-slate-500">Configura los límites y fechas de tu tarjeta.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre de la Tarjeta (ej: Visa Oro)</label>
                  <div className="relative">
                    <CardIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Banco Emisor</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" required value={formData.bank} onChange={e => setFormData({...formData, bank: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Últimos 4 Dígitos</label>
                  <input type="text" maxLength={4} required value={formData.lastFour} onChange={e => setFormData({...formData, lastFour: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" placeholder="0000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Límite de Crédito ($)</label>
                  <input type="number" required value={formData.limit} onChange={e => setFormData({...formData, limit: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saldo Actual ($)</label>
                  <input type="number" required value={formData.currentBalance} onChange={e => setFormData({...formData, currentBalance: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Día de Corte</label>
                  <input type="number" min={1} max={31} required value={formData.closingDay} onChange={e => setFormData({...formData, closingDay: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Día Límite de Pago</label>
                  <input type="number" min={1} max={31} required value={formData.paymentDay} onChange={e => setFormData({...formData, paymentDay: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Color de la Tarjeta</label>
                <div className="flex flex-wrap gap-3">
                  {['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#1e293b', '#6d28d9'].map(c => (
                    <button 
                      key={c}
                      type="button"
                      onClick={() => setFormData({...formData, color: c})}
                      className={cn(
                        "w-10 h-10 rounded-full border-4 transition-all hover:scale-110 shadow-sm", 
                        formData.color === c ? "border-slate-900 ring-2 ring-slate-200" : "border-white"
                      )}
                      style={{backgroundColor: c}}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-4 bg-slate-100 text-slate-700 rounded-3xl font-black text-sm hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-3xl font-black text-sm shadow-xl active:scale-95">
                  {editingCardId ? 'Actualizar Tarjeta' : 'Guardar Tarjeta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagar/Abonar */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Registrar Pago</h3>
                <p className="text-sm text-slate-500">¿Cuánto deseas abonar a tu deuda?</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handlePaySubmit} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto del Abono ($)</label>
                <input 
                  type="number" 
                  autoFocus
                  required 
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)} 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-black outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-center" 
                  placeholder="0.00"
                />
                <p className="mt-3 text-xs text-slate-400 text-center font-bold">El saldo de la tarjeta se reducirá inmediatamente.</p>
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="flex-1 px-8 py-4 bg-slate-100 text-slate-700 rounded-3xl font-black text-sm hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="flex-1 px-8 py-4 bg-emerald-600 text-white rounded-3xl font-black text-sm shadow-xl active:scale-95">Confirmar Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditCards;
