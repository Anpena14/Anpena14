
import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Globe, 
  Shield, 
  Trash2, 
  Save,
  Moon,
  Sun,
  Lock,
  Edit2,
  ChevronRight,
  CreditCard,
  Mail,
  Smartphone
} from 'lucide-react';
import { cn } from '../lib/utils';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('perfil');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const sections = [
    { id: 'perfil', label: 'Mi Perfil', icon: <User className="w-4 h-4" /> },
    { id: 'notificaciones', label: 'Notificaciones', icon: <Bell className="w-4 h-4" /> },
    { id: 'preferencias', label: 'Preferencias', icon: <Globe className="w-4 h-4" /> },
    { id: 'seguridad', label: 'Seguridad', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Configuración</h2>
        <p className="text-slate-500">Administra tu cuenta, preferencias personales y opciones de seguridad.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-72 shrink-0">
          <nav className="space-y-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            {sections.map(s => (
              <button 
                key={s.id}
                onClick={() => setActiveTab(s.id)}
                className={cn(
                  "flex items-center w-full px-4 py-3 text-sm font-bold rounded-xl transition-all group",
                  activeTab === s.id 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span className={cn(
                  "mr-3 transition-colors",
                  activeTab === s.id ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  {s.icon}
                </span>
                {s.label}
                {activeTab === s.id && <ChevronRight className="ml-auto w-4 h-4 text-emerald-500" />}
              </button>
            ))}
          </nav>

          <div className="mt-6 p-5 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl text-white shadow-lg shadow-emerald-200 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <h4 className="font-bold mb-1">Macetamania Pro</h4>
            <p className="text-xs text-emerald-100 mb-4">Desbloquea reportes ilimitados y sincronización en la nube.</p>
            <button className="w-full py-2.5 bg-white text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors">Actualizar ahora</button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {activeTab === 'perfil' && (
            <div className="p-8 space-y-8">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8 pb-8 border-b border-slate-100">
                <div className="relative">
                  <div className="w-28 h-28 rounded-3xl bg-slate-200 overflow-hidden ring-4 ring-slate-50 shadow-md">
                    <img src="https://picsum.photos/200/200" alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all hover:scale-110 active:scale-95 border-2 border-white">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-xl font-bold text-slate-900">Usuario Demostración</h3>
                  <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start mt-1">
                    <Mail className="w-4 h-4 mr-2" /> demo@macetamania.com
                  </p>
                  <div className="mt-3 flex gap-2 justify-center sm:justify-start">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-full">Miembro Premium</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-full">Beta Tester</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" defaultValue="Usuario Demostración" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Teléfono</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="tel" defaultValue="+1 234 567 890" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                   <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Biografía Corta</label>
                    <textarea rows={4} placeholder="Cuéntanos un poco sobre tus metas financieras..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none resize-none"></textarea>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button className="flex items-center px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all hover:shadow-lg hover:shadow-emerald-200 active:scale-95">
                  <Save className="w-4 h-4 mr-2" /> Guardar Perfil
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preferencias' && (
            <div className="p-8 space-y-10">
              <section className="space-y-5">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center">
                   Visualización
                </h4>
                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={cn("p-3 rounded-2xl shadow-sm", isDarkMode ? "bg-slate-800 text-slate-100" : "bg-white text-amber-500")}>
                      {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Modo Oscuro</p>
                      <p className="text-xs text-slate-500">Ajusta el tema visual de la aplicación.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={cn(
                      "w-14 h-7 rounded-full relative transition-all duration-500",
                      isDarkMode ? "bg-emerald-600" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-500", 
                      isDarkMode ? "translate-x-8" : "translate-x-1"
                    )}></div>
                  </button>
                </div>
              </section>

              <section className="space-y-5">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Configuración Regional</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Moneda Principal</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10">
                      <option>USD - Dólar Estadounidense</option>
                      <option>EUR - Euro</option>
                      <option>DOP - Peso Dominicano</option>
                      <option>MXN - Peso Mexicano</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Idioma de Interfaz</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10">
                      <option>Español (ES)</option>
                      <option>English (US)</option>
                      <option>Português (BR)</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'seguridad' && (
            <div className="p-8 space-y-10">
              <section className="space-y-5">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Seguridad de Cuenta</h4>
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between hover:bg-white hover:border-emerald-200 transition-all shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-600">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Actualizar Contraseña</p>
                      <p className="text-xs text-slate-500">Último cambio hace 84 días. Se recomienda cambiar cada 90 días.</p>
                    </div>
                  </div>
                  <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm active:scale-95">Cambiar</button>
                </div>
                
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between hover:bg-white hover:border-emerald-200 transition-all shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Autenticación de 2 Factores</p>
                      <p className="text-xs text-slate-500">Añade una capa extra de seguridad a tu cuenta.</p>
                    </div>
                  </div>
                  <button className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 active:scale-95">Activar</button>
                </div>
              </section>

              <div className="pt-8 border-t border-slate-100">
                <h4 className="text-sm font-bold text-rose-600 uppercase tracking-widest mb-4">Zona Crítica</h4>
                <div className="p-8 border border-rose-100 bg-rose-50/50 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <p className="text-base font-bold text-rose-900">Eliminar Cuenta Permanentemente</p>
                    <p className="text-sm text-rose-700/80 mt-1">Al realizar esta acción, todos tus datos, transacciones y metas se borrarán de forma irreversible.</p>
                  </div>
                  <button className="whitespace-nowrap flex items-center px-6 py-3 bg-rose-600 text-white text-xs font-bold rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 active:scale-95">
                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar ahora
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
