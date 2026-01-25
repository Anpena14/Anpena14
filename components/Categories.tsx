
import React, { useState, useEffect } from 'react';
import { Plus, Tag, Trash2, Edit2, Info, X, ChevronRight, AlertCircle } from 'lucide-react';
import { Category, TransactionType } from '../types';
import { generateId, cn } from '../lib/utils';
import { getIcon, AVAILABLE_ICONS } from '../constants';

interface CategoriesProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

const Categories: React.FC<CategoriesProps> = ({ categories, setCategories }) => {
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    icon: 'Tag'
  });

  useEffect(() => {
    setError(null);
  }, [activeTab, formData.name]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = formData.name.trim();
    if (!trimmedName) return;

    const isDuplicate = categories.some(
      c => c.type === activeTab && c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      setError('Ya existe una categoría con este nombre para este tipo de transacción.');
      return;
    }

    const newCat: Category = {
      id: generateId(),
      name: trimmedName,
      type: activeTab,
      color: formData.color,
      icon: formData.icon,
      isPredefined: false
    };
    
    setCategories(prev => [...prev, newCat]);
    setIsModalOpen(false);
    setFormData({ name: '', color: '#3b82f6', icon: 'Tag' });
    setError(null);
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Categorías</h2>
          <p className="text-slate-500">Organiza tus ingresos y gastos de forma personalizada.</p>
        </div>
        <button 
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Categoría
        </button>
      </header>

      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-2xl w-full md:w-fit border border-slate-200">
        <button 
          onClick={() => setActiveTab(TransactionType.EXPENSE)}
          className={cn(
            "px-8 py-2.5 rounded-xl text-sm font-bold transition-all", 
            activeTab === TransactionType.EXPENSE 
              ? "bg-white text-rose-600 shadow-sm" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          Gastos
        </button>
        <button 
          onClick={() => setActiveTab(TransactionType.INCOME)}
          className={cn(
            "px-8 py-2.5 rounded-xl text-sm font-bold transition-all", 
            activeTab === TransactionType.INCOME 
              ? "bg-white text-emerald-600 shadow-sm" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          Ingresos
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.filter(c => c.type === activeTab).map((cat) => (
          <div key={cat.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-emerald-200 hover:shadow-md transition-all flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mr-4" 
                style={{backgroundColor: `${cat.color}15`, color: cat.color}}
              >
                {getIcon(cat.icon, "w-6 h-6")}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{cat.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {cat.isPredefined ? 'Sistema' : 'Usuario'}
                </p>
              </div>
            </div>
            {!cat.isPredefined && (
              <button 
                onClick={() => deleteCategory(cat.id)}
                className="p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Crear Categoría</h3>
                <p className="text-sm text-slate-500">Agrega una etiqueta personalizada para tus movimientos.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddCategory} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre</label>
                <input 
                  type="text" 
                  placeholder="Ej: Gimnasio, Mascotas..." 
                  required
                  autoFocus
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className={cn(
                    "w-full bg-slate-50 border rounded-xl px-5 py-3 text-sm outline-none transition-all",
                    error ? "border-rose-300 focus:ring-rose-500/10" : "border-slate-200 focus:ring-emerald-500/10 focus:border-emerald-500"
                  )}
                />
                {error && (
                  <p className="mt-2 text-xs text-rose-600 flex items-center font-medium">
                    <AlertCircle className="w-3 h-3 mr-1" /> {error}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Color Distintivo</label>
                <div className="flex flex-wrap gap-3">
                  {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map(c => (
                    <button 
                      key={c}
                      type="button"
                      onClick={() => setFormData({...formData, color: c})}
                      className={cn(
                        "w-9 h-9 rounded-full border-4 transition-all hover:scale-110", 
                        formData.color === c ? "border-slate-900 shadow-lg" : "border-transparent"
                      )}
                      style={{backgroundColor: c}}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Icono</label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded-2xl bg-slate-50 custom-scrollbar">
                  {AVAILABLE_ICONS.map(iconName => (
                    <button 
                      key={iconName}
                      type="button"
                      onClick={() => setFormData({...formData, icon: iconName})}
                      className={cn(
                        "p-3 rounded-xl flex items-center justify-center transition-all",
                        formData.icon === iconName 
                          ? "bg-white text-emerald-600 shadow-md ring-1 ring-slate-200" 
                          : "text-slate-400 hover:bg-white hover:text-slate-600"
                      )}
                    >
                      {getIcon(iconName, "w-5 h-5")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
