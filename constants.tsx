
import React from 'react';
import { 
  Home, 
  Lightbulb, 
  Smartphone, 
  ShoppingBag, 
  Car, 
  Droplet, 
  ShieldCheck, 
  BookOpen, 
  Tv, 
  Shirt, 
  PiggyBank, 
  CreditCard, 
  Layers,
  Briefcase,
  TrendingUp,
  Gift,
  DollarSign,
  Coffee,
  Utensils,
  Plane,
  Heart,
  Gamepad,
  Music,
  Dumbbell,
  PawPrint,
  GraduationCap
} from 'lucide-react';
import { Category, TransactionType } from './types';

export const COLORS = {
  INCOME: 'text-emerald-500',
  EXPENSE: 'text-rose-500',
  BUDGET: 'text-sky-500',
  SAVINGS: 'text-purple-500',
  NEUTRAL: 'text-slate-500',
};

export const AVAILABLE_ICONS = [
  'Home', 'Lightbulb', 'Smartphone', 'ShoppingBag', 'Car', 'Droplet', 'ShieldCheck', 
  'BookOpen', 'Tv', 'Shirt', 'PiggyBank', 'CreditCard', 'Layers', 'Briefcase', 
  'TrendingUp', 'Gift', 'DollarSign', 'Coffee', 'Utensils', 'Plane', 'Heart',
  'Gamepad', 'Music', 'Dumbbell', 'PawPrint', 'GraduationCap'
];

export const PREDEFINED_CATEGORIES: Category[] = [
  // Income
  { id: 'inc-1', name: 'Salario', type: TransactionType.INCOME, color: '#10b981', icon: 'Briefcase', isPredefined: true },
  { id: 'inc-2', name: 'Bonos/Extras', type: TransactionType.INCOME, color: '#10b981', icon: 'TrendingUp', isPredefined: true },
  { id: 'inc-3', name: 'Ingresos Adicionales', type: TransactionType.INCOME, color: '#10b981', icon: 'DollarSign', isPredefined: true },
  { id: 'inc-4', name: 'Otros Ingresos', type: TransactionType.INCOME, color: '#10b981', icon: 'Gift', isPredefined: true },
  // Expenses
  { id: 'exp-1', name: 'Vivienda', type: TransactionType.EXPENSE, color: '#ef4444', icon: 'Home', isPredefined: true },
  { id: 'exp-2', name: 'Servicios', type: TransactionType.EXPENSE, color: '#f97316', icon: 'Lightbulb', isPredefined: true },
  { id: 'exp-3', name: 'Internet/Teléfono', type: TransactionType.EXPENSE, color: '#3b82f6', icon: 'Smartphone', isPredefined: true },
  { id: 'exp-4', name: 'Alimentación', type: TransactionType.EXPENSE, color: '#eab308', icon: 'ShoppingBag', isPredefined: true },
  { id: 'exp-5', name: 'Transporte', type: TransactionType.EXPENSE, color: '#6366f1', icon: 'Car', isPredefined: true },
  { id: 'exp-6', name: 'Combustible', type: TransactionType.EXPENSE, color: '#4b5563', icon: 'Droplet', isPredefined: true },
  { id: 'exp-7', name: 'Salud/Seguros', type: TransactionType.EXPENSE, color: '#f43f5e', icon: 'ShieldCheck', isPredefined: true },
  { id: 'exp-8', name: 'Educación', type: TransactionType.EXPENSE, color: '#a855f7', icon: 'BookOpen', isPredefined: true },
  { id: 'exp-9', name: 'Entretenimiento', type: TransactionType.EXPENSE, color: '#ec4899', icon: 'Tv', isPredefined: true },
  { id: 'exp-10', name: 'Ropa/Calzado', type: TransactionType.EXPENSE, color: '#d946ef', icon: 'Shirt', isPredefined: true },
  { id: 'exp-11', name: 'Ahorro/Inversión', type: TransactionType.EXPENSE, color: '#8b5cf6', icon: 'PiggyBank', isPredefined: true },
  { id: 'exp-12', name: 'Deudas/Préstamos', type: TransactionType.EXPENSE, color: '#94a3b8', icon: 'CreditCard', isPredefined: true },
  { id: 'exp-13', name: 'Otros Gastos', type: TransactionType.EXPENSE, color: '#cbd5e1', icon: 'Layers', isPredefined: true },
];

export const getIcon = (name: string, className?: string) => {
  const icons: Record<string, any> = {
    Home, Lightbulb, Smartphone, ShoppingBag, Car, Droplet, ShieldCheck, 
    BookOpen, Tv, Shirt, PiggyBank, CreditCard, Layers, Briefcase, 
    TrendingUp, Gift, DollarSign, Coffee, Utensils, Plane, Heart,
    Gamepad, Music, Dumbbell, PawPrint, GraduationCap
  };
  const IconComponent = icons[name] || Layers;
  return <IconComponent className={className || "w-5 h-5"} />;
};
