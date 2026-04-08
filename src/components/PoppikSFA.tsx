import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import AdminDashboardView from './AdminDashboardView';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Plus, 
  Minus, 
  ShoppingCart, 
  ArrowLeft, 
  Home, 
  Store, 
  User, 
  BarChart3,
  Clock,
  ChevronRight,
  Settings,
  LogOut,
  Target,
  Bell,
  CheckCheck,
  Package,
  Menu,
  X,
  FileText,
  Pencil,
  Wifi,
  WifiOff,
  RefreshCw,
  CloudUpload,
  MessageCircle,
  Share2,
  Phone,
  Hash,
  ShieldCheck,
  Building2,
  Navigation
} from 'lucide-react';

// API Base URL
const API_BASE = 'http://localhost:5000/api';

// Safe Storage Helper to prevent SecurityError in restricted environments
const createSafeStorage = () => {
  const memoryStorage: Record<string, string> = {};
  let useLocalStorage = false;

  // Window.name fallback helpers (persists across refreshes in same tab)
  const getWindowNameData = () => {
    try {
      return JSON.parse(window.name || '{}');
    } catch (e) { return {}; }
  };

  const setWindowNameData = (key: string, value: string) => {
    try {
      const data = getWindowNameData();
      data[key] = value;
      window.name = JSON.stringify(data);
    } catch (e) { /* silent */ }
  };

  const removeWindowNameData = (key: string) => {
    try {
      const data = getWindowNameData();
      delete data[key];
      window.name = JSON.stringify(data);
    } catch (e) { /* silent */ }
  };

  // Cookie fallback helpers
  const setCookie = (name: string, value: string, days = 7) => {
    try {
      const expires = new Date(Date.now() + days * 864e5).toUTCString();
      document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    } catch (e) { /* silent */ }
  };

  const getCookie = (name: string) => {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
    } catch (e) { /* silent */ }
    return null;
  };

  const deleteCookie = (name: string) => {
    try {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    } catch (e) { /* silent */ }
  };

  // One-time check for localStorage availability
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    useLocalStorage = true;
  } catch (e) {
    useLocalStorage = false;
  }

  return {
    getItem: (key: string) => {
      // 1. Try Local Storage
      if (useLocalStorage) {
        try {
          const val = window.localStorage.getItem(key);
          if (val !== null) return val;
        } catch (e) { /* fallback */ }
      }
      // 2. Try Window.name (Persists refresh)
      const winData = getWindowNameData();
      if (winData[key]) return winData[key];

      // 3. Try Cookie fallback
      const cookieVal = getCookie(key);
      if (cookieVal !== null && cookieVal !== '') return cookieVal;

      // 4. Memory
      return memoryStorage[key] || null;
    },
    setItem: (key: string, value: string) => {
      // 1. Memory
      memoryStorage[key] = value;
      // 2. Window.name (very reliable for refresh)
      setWindowNameData(key, value);
      // 3. Cookies
      setCookie(key, value);
      // 4. Local Storage
      if (useLocalStorage) {
        try {
          window.localStorage.setItem(key, value);
        } catch (e) { /* silent */ }
      }
    },
    removeItem: (key: string) => {
      delete memoryStorage[key];
      removeWindowNameData(key);
      deleteCookie(key);
      if (useLocalStorage) {
        try {
          window.localStorage.removeItem(key);
        } catch (e) { /* silent */ }
      }
    }
  };
};

const safeStorage = createSafeStorage();

// Types
type Screen = 'dashboard' | 'createOrder' | 'addClient' | 'reports' | 'productCatalog' | 'cart' | 'login' | 'adminDashboard' | 'adminUsers' | 'adminAddUser' | 'adminEditUser' | 'adminReports' | 'orders' | 'profile' | 'attendance' | 'adminLeaves' | 'inventory' | 'notifications';

interface Outlet {
  id: number;
  name: string;
  beat_name?: string;
  area?: string;
  city?: string;
  owner_name?: string;
  owner_no?: string;
  class?: string;
  gstNumber?: string; // Added GST Number field
  address: string;
}

interface Product {
  id: number;
  name: string;
  productCode?: string;
  price: number;
  category: string;
  image?: string;
  stock: number;
  boxSize?: string;
  hsn?: string;
  gst?: number;
  mrp?: number;
}

interface Order {
  id: number;
  outlet: { name: string, address: string, owner_no?: string, gstNumber?: string };
  createdAt: string;
  totalAmount: number;
  status: string;
  orderItems: Array<{ 
    product: { 
      name: string, 
      productCode?: string,
      hsn?: string,
      gst?: number,
      mrp?: number,
      boxSize?: string
    }, 
    quantity: number, 
    priceAtTime: number 
  }>;
  items?: Array<{ productId: number, quantity: number, price: number }>;
}

interface DayWiseReport {
  totalAttendance: number;
  totalSalesValue: number;
}

interface PartyWiseReport {
  [outletName: string]: {
    totalOrders: number;
    totalAmount: number;
    orders: Order[];
  };
}

interface LocationWiseReport {
  [location: string]: {
    totalOrders: number;
    totalAmount: number;
    uniquePartiesCount: number;
  };
}

interface ProductWiseReport {
  [productName: string]: {
    totalQuantity: number;
    totalRevenue: number;
    category: string;
    productCode?: string;
  };
}

interface Notification {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: string; // 'order', 'attendance', 'system'
}

interface Leave {
  id: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
  user?: { name: string };
}

// Helper Components
const ScreenWrapper: React.FC<{ 
  children: React.ReactNode, 
  title?: string, 
  showBack?: boolean, 
  backAction?: () => void, 
  user: any, 
  isSidebarOpen: boolean, 
  setIsSidebarOpen: (v: boolean) => void, 
  isOnline?: boolean, 
  pendingSyncCount?: number,
  notifications?: Notification[],
  setNotifications?: React.Dispatch<React.SetStateAction<Notification[]>>,
  onSync?: () => void,
  api: any,
  onProfileClick?: () => void,
  onViewAllNotifications?: () => void,
  markAllRead?: () => void
}> = ({ children, title, showBack, backAction, user, isSidebarOpen, setIsSidebarOpen, isOnline = true, pendingSyncCount = 0, notifications = [], setNotifications, onSync, api, onProfileClick, onViewAllNotifications, markAllRead }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleCheckConnection = () => {
    setIsCheckingConnection(true);
    setTimeout(() => {
      setIsCheckingConnection(false);
      alert(navigator.onLine ? "Connection is stable." : "You are currently offline.");
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      <header className="sticky top-0 z-[1010] bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBack && (
            <button onClick={backAction} className="p-2 hover:bg-slate-100 rounded-full transition-colors md:hidden">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
          )}
          <div className="flex flex-col">
            {title && <h1 className="text-xl md:text-2xl font-bold text-slate-800">{title}</h1>}
            {!isOnline && (
              <span className="flex items-center text-[10px] font-black text-red-500 uppercase tracking-widest">
                <WifiOff className="w-3 h-3 mr-1" /> Offline Mode
              </span>
            )}
            {pendingSyncCount > 0 && (
              <span className="flex items-center text-[10px] font-black text-blue-500 uppercase tracking-widest">
                <CloudUpload className="w-3 h-3 mr-1" /> {pendingSyncCount} Drafts Pending
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button 
              onClick={() => setShowConnectionDetails(!showConnectionDetails)}
              className={`hidden md:flex items-center px-4 py-2 rounded-full border transition-all hover:shadow-md ${
                isOnline 
                ? 'bg-green-50 text-poppik-green border-green-100 hover:bg-green-100' 
                : 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100'
              }`}
            >
              {isOnline ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </button>

            {/* Connection Details Dropdown */}
            {showConnectionDetails && (
              <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 z-[1020] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Network Status</h3>
                    <button onClick={() => setShowConnectionDetails(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOnline ? 'bg-green-100 text-poppik-green' : 'bg-red-100 text-red-500'}`}>
                          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{isOnline ? 'Connected' : 'Disconnected'}</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    </div>

                    {pendingSyncCount > 0 && (
                      <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Pending Data</p>
                        <p className="text-xs font-bold text-blue-700">{pendingSyncCount} orders waiting to sync</p>
                        {isOnline && onSync && (
                          <button 
                            onClick={() => { onSync(); setShowConnectionDetails(false); }}
                            className="mt-2 w-full py-2 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors"
                          >
                            Sync Now
                          </button>
                        )}
                      </div>
                    )}

                    <button 
                      onClick={handleCheckConnection}
                      disabled={isCheckingConnection}
                      className="w-full py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center space-x-2"
                    >
                      {isCheckingConnection ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>{isCheckingConnection ? 'Checking...' : 'Check Connection'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) markAllRead();
              }}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative mr-2 transition-colors"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[8px] text-white flex items-center justify-center font-black">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-[1020] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-black text-slate-800 text-lg">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div key={n.id} className={`p-5 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-4 ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          n.type === 'order' ? 'bg-orange-100 text-orange-600' :
                          n.type === 'attendance' ? 'bg-blue-100 text-blue-600' :
                          'bg-green-100 text-poppik-green'
                        }`}>
                          {n.type === 'order' ? <ShoppingCart className="w-5 h-5" /> :
                           n.type === 'attendance' ? <Clock className="w-5 h-5" /> :
                           <Bell className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-bold">No new notifications</p>
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => {
                      setShowNotifications(false);
                      if (onViewAllNotifications) onViewAllNotifications();
                    }}
                    className="w-full p-4 text-xs font-black text-poppik-green uppercase tracking-widest hover:bg-slate-50 transition-colors border-t border-slate-50"
                  >
                    View All Notifications
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4 pl-6 border-l border-slate-200">
             <div className="hidden md:block text-right cursor-pointer" onClick={onProfileClick}>
                <p className="text-lg font-black text-slate-800 leading-none mb-0.5">{user?.name || 'User'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{user?.role || 'Sales'}</p>
             </div>
             <div 
               onClick={onProfileClick}
               className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-sm hover:scale-105 hover:border-poppik-green transition-all cursor-pointer"
             >
               <User className="text-slate-600 w-6 h-6" />
             </div>
          </div>
          
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 md:hidden">
             <Menu className="w-6 h-6 text-slate-600" />
          </button>
        </div>
      </header>
      <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

const AttendanceView: React.FC<{
  user: any,
  isPunchedIn: boolean,
  onPunch: (type: 'IN' | 'OUT') => void,
  api: any
}> = ({ user, isPunchedIn, onPunch, api }) => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveData, setLeaveData] = useState({ startDate: '', endDate: '', reason: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leaves');
      setLeaves(res.data);
    } catch (err) { console.error("Error fetching leaves", err); }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/leaves', leaveData);
      alert("Leave application submitted successfully!");
      setShowLeaveModal(false);
      setLeaveData({ startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch (err) { alert("Failed to apply for leave"); }
    finally { setIsLoading(false); }
  };

  // Simple custom calendar helper
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleDateClick = (day: number) => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const formattedDate = `${year}-${month}-${dayStr}`;
    
    setLeaveData({
      ...leaveData,
      startDate: formattedDate,
      endDate: formattedDate
    });
    setShowLeaveModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Punch In/Out Section */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
              <Clock size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Daily Attendance</h2>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Mark your presence</p>
            </div>
          </div>

          <div className="p-10 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isPunchedIn ? 'bg-green-100 text-poppik-green' : 'bg-orange-100 text-orange-500'}`}>
              <Clock size={48} className={isPunchedIn ? 'animate-pulse' : ''} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">
              {isPunchedIn ? 'You are currently Punched In' : 'Ready to start your day?'}
            </h3>
            <p className="text-slate-500 font-medium mb-8 max-w-xs">
              {isPunchedIn 
                ? 'Your location is being tracked live for sales operations.' 
                : 'Please punch in to begin your work day and start location tracking.'}
            </p>
            
            <button 
              onClick={() => onPunch(isPunchedIn ? 'OUT' : 'IN')}
              className={`w-full py-5 rounded-2xl text-lg font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 ${
                isPunchedIn 
                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200' 
                : 'bg-poppik-green text-white hover:bg-green-600 shadow-green-200'
              }`}
            >
              {isPunchedIn ? 'Punch Out Now' : 'Punch In Now'}
            </button>
          </div>
        </div>

        {/* Calendar & Leave Section */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-purple-50 rounded-2xl text-purple-600">
                <Calendar size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800">Leave Calendar</h2>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{monthNames[today.getMonth()]} {today.getFullYear()}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowLeaveModal(true)}
              className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              <Plus size={24} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={`${day}-${idx}`} className="text-center text-[10px] font-black text-slate-400 uppercase py-2">{day}</div>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="p-3"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate();
              return (
                <div 
                  key={day} 
                  onClick={() => handleDateClick(day)}
                  className={`p-3 text-center rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                    isToday ? 'bg-poppik-green text-white' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Recent Leave Requests</h4>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {leaves.length > 0 ? (
                leaves.map(leave => (
                  <div key={leave.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[150px]">{leave.reason}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      leave.status === 'Approved' ? 'bg-green-100 text-poppik-green' :
                      leave.status === 'Rejected' ? 'bg-red-100 text-red-500' :
                      'bg-orange-100 text-orange-500'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs font-bold">No leave requests found</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leave Application Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800">Apply for Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={28} /></button>
            </div>
            <form onSubmit={handleApplyLeave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                  <input 
                    type="date" 
                    required
                    value={leaveData.startDate}
                    onChange={e => setLeaveData({...leaveData, startDate: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                  <input 
                    type="date" 
                    required
                    value={leaveData.endDate}
                    onChange={e => setLeaveData({...leaveData, endDate: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reason for Leave</label>
                <textarea 
                  required
                  rows={4}
                  value={leaveData.reason}
                  onChange={e => setLeaveData({...leaveData, reason: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold resize-none"
                  placeholder="Tell us why you need leave..."
                ></textarea>
              </div>
              <div className="flex space-x-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-2 py-4 bg-poppik-green text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-green-600 shadow-lg shadow-green-100 transition-all flex items-center justify-center"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{icon: React.ReactNode, value: string, label: string, sub: string, trend: string}> = ({icon, value, label, sub, trend}) => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col hover:shadow-2xl transition-all group">
    <div className="flex items-center justify-between mb-6">
       <div className="p-4 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">{React.cloneElement(icon as React.ReactElement, { className: 'w-8 h-8' })}</div>
       <span className="text-[10px] font-black text-poppik-green bg-green-50 px-3 py-1.5 rounded-full uppercase">{trend}</span>
    </div>
    <p className="text-3xl font-black text-slate-800 mb-1">{value}</p>
    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">{label}</p>
    <p className="text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-xl inline-block w-fit">{sub}</p>
  </div>
);

const SidebarNavItem: React.FC<{icon: React.ReactNode, label: string, screen: Screen, current: Screen, onClick: (s: Screen) => void}> = ({icon, label, screen, current, onClick}) => (
   <button onClick={() => onClick(screen)} className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all font-bold ${current === screen ? 'bg-poppik-green text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
      {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}<span className="text-base">{label}</span>
   </button>
);

const BottomNavItem: React.FC<{icon: React.ReactNode, label: string, screen: Screen, currentScreen: Screen, setCurrentScreen: (s: Screen) => void}> = ({icon, label, screen, currentScreen, setCurrentScreen}) => (
  <button onClick={() => setCurrentScreen(screen)} className={`flex flex-col items-center space-y-1 transition-all flex-1 py-2 rounded-2xl ${currentScreen === screen ? 'text-poppik-green' : 'text-slate-400'}`}>
    {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}<span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const ProfileLink: React.FC<{icon: React.ReactNode, label: string}> = ({icon, label}) => (
    <button className="w-full p-6 flex items-center space-x-4 text-left hover:bg-slate-50 transition-all group border-b border-slate-50">
        <div className="text-slate-400 group-hover:text-poppik-green transition-colors">{React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}</div>
        <span className="font-bold text-lg text-slate-700 flex-1">{label}</span>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-all" />
    </button>
);

const NotificationsView: React.FC<{ notifications: Notification[], markAllRead: () => void }> = ({ notifications, markAllRead }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800">All Notifications</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Stay updated with your activities</p>
        </div>
        <button 
          onClick={markAllRead}
          className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all flex items-center space-x-2 shadow-sm"
        >
          <CheckCheck className="w-4 h-4 text-poppik-green" />
          <span>Mark All as Read</span>
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
        {notifications.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {notifications.map((n) => (
              <div key={n.id} className={`p-8 hover:bg-slate-50/50 transition-all flex gap-6 items-start ${!n.isRead ? 'bg-blue-50/20' : ''}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  n.type === 'order' ? 'bg-orange-100 text-orange-600' :
                  n.type === 'attendance' ? 'bg-blue-100 text-blue-600' :
                  'bg-green-100 text-poppik-green'
                }`}>
                  {n.type === 'order' ? <ShoppingCart className="w-7 h-7" /> :
                   n.type === 'attendance' ? <Clock className="w-7 h-7" /> :
                   <Bell className="w-7 h-7" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-black text-slate-800 text-lg leading-tight">{n.title}</p>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                      {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-500 font-medium text-base leading-relaxed">{n.message}</p>
                  {!n.isRead && (
                    <div className="mt-4 flex items-center space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">New Notification</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-24 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-12 h-12 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No notifications yet</h3>
            <p className="text-slate-400 font-bold max-w-xs mx-auto">We'll notify you here when there's something new to check.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardCard: React.FC<{icon: React.ReactNode, title: string, onClick: () => void, color: string}> = ({icon, title, onClick, color}) => (
  <div onClick={onClick} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-2xl hover:border-poppik-green transition-all group">
    <div className={`p-5 bg-slate-50 rounded-3xl mb-4 group-hover:scale-110 transition-transform ${color}`}>{React.cloneElement(icon as React.ReactElement, { size: 32 })}</div>
    <h3 className="text-lg font-black text-slate-800">{title}</h3>
  </div>
);

const PoppikSFA: React.FC = () => {
  const [user, setUser] = useState<any>(() => {
    const savedUser = safeStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) { return null; }
  });
  const [token, setToken] = useState<string | null>(() => {
    return safeStorage.getItem('token');
  });

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    // Read directly from storage for initialization to be robust
    const savedToken = safeStorage.getItem('token');
    const savedUserStr = safeStorage.getItem('user');
    let savedUser = null;
    try {
      savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
    } catch (e) { savedUser = null; }

    const validScreens: Screen[] = ['dashboard', 'createOrder', 'addClient', 'reports', 'productCatalog', 'cart', 'login', 'adminDashboard', 'adminUsers', 'adminAddUser', 'adminEditUser', 'adminReports', 'orders', 'profile', 'inventory', 'notifications'];
    
    // 1. Check URL Hash first (Best for refresh)
    const hash = window.location.hash.replace('#', '') as Screen;
    
    if (savedToken && savedUser) {
      if (hash && validScreens.includes(hash) && hash !== 'login') return hash;
      
      // 2. Fallback to localStorage saved screen
      const savedScreen = safeStorage.getItem('currentScreen') as Screen;
      if (savedScreen && validScreens.includes(savedScreen) && savedScreen !== 'login') return savedScreen;
      
      // 3. Fallback to role-based dashboard
      return savedUser.role === 'admin' ? 'adminDashboard' : 'dashboard';
    }
    return 'login';
  });

  // Sync state with URL Hash for proper routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as Screen;
      const validScreens: Screen[] = ['dashboard', 'createOrder', 'addClient', 'reports', 'productCatalog', 'cart', 'login', 'adminDashboard', 'adminUsers', 'adminAddUser', 'adminEditUser', 'adminReports', 'orders', 'profile', 'attendance', 'adminLeaves', 'inventory', 'notifications'];
      if (hash && validScreens.includes(hash) && hash !== currentScreen) {
        setCurrentScreen(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen) {
      window.location.hash = currentScreen;
      safeStorage.setItem('currentScreen', currentScreen);
    }
  }, [currentScreen]);
  
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOutlet, setActiveOutlet] = useState<Outlet | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [dayWiseReport, setDayWiseReport] = useState<DayWiseReport | null>(null);
  const [partyWiseReport, setPartyWiseReport] = useState<PartyWiseReport | null>(null);
  const [locationWiseReport, setLocationWiseReport] = useState<LocationWiseReport | null>(null);
  const [productWiseReport, setProductWiseReport] = useState<ProductWiseReport | null>(null);

  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminReports, setAdminReports] = useState<any[]>([]);
  const [adminLeaves, setAdminLeaves] = useState<Leave[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [loginForm, setLoginForm] = useState({ phone: '8888888888', password: 'sales123', name: '', role: 'sales' });
  const [outletForm, setOutletForm] = useState({ name: '', beat_name: '', area: '', city: '', owner_name: '', owner_no: '', class: 'C', address: '', gstNumber: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Offline / PWA States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOrders, setPendingOrders] = useState<any[]>(() => {
    const saved = safeStorage.getItem('pendingOrders');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchAttendanceStatus = async () => {
    try {
      const res = await api.get('/attendance/status');
      setIsPunchedIn(res.data.isPunchedIn);
    } catch (err) { console.error("Error fetching attendance status", err); }
  };

  const handlePunch = async (type: 'IN' | 'OUT') => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await api.post('/attendance', {
          type,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        setIsPunchedIn(type === 'IN');
        alert(`Punched ${type} successfully!`);
        fetchNotifications();
      } catch (err) { alert(`Punch ${type} failed`); }
    }, (err) => alert("Location access denied. Attendance requires location."), { timeout: 10000 }); // 10 seconds timeout
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  // Sync state with URL Hash for proper routing
  useEffect(() => {
    if (token && user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // Poll every minute
      return () => clearInterval(interval);
    }
  }, [token, user]);

  // Live location tracking for punched-in users
  useEffect(() => {
    let watchId: number | null = null;
    
    if (token && user?.role === 'sales' && isPunchedIn && navigator.geolocation) {
      console.log("Starting live movement tracking...");
      
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          try {
            await axios.post(`${API_BASE}/attendance/update-location`, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Live location updated:", pos.coords.latitude, pos.coords.longitude);
          } catch (err) {
            console.error("Failed to update live location", err);
          }
        },
        (err) => {
          console.error("Geolocation watch error", err);
          if (err.code === 1) { // PERMISSION_DENIED
            alert("CRITICAL: Location access is required for live tracking. Please enable it in your browser settings.");
          }
        },
        { 
          enableHighAccuracy: true, 
          maximumAge: 0, // Don't use cached position
          timeout: 10000 // 10 seconds timeout
        }
      );
    }

    return () => {
      if (watchId !== null) {
        console.log("Stopping live movement tracking...");
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [token, user, isPunchedIn]);

  // Axios Config
  const api = React.useMemo(() => {
    const instance = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${token}` }
    });

    // Logout on 401 Unauthorized or 403 Forbidden (Invalid token)
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [token]);

  // Load Initial Data
  useEffect(() => {
    // Online/Offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (token) {
      console.log(`[AUTH] Initial data load for user: ${user?.name}, Token: ${!!token}`);
      if (user?.role === 'admin') {
        fetchAdminData();
        fetchProducts(); 
        fetchOutlets();
      } else {
        fetchOutlets();
        fetchProducts();
        fetchOrders();
        fetchReports();
        fetchAttendanceStatus();
        fetchNotifications();
      }
    } else {
      console.log("[AUTH] No token found during initial load");
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token, user]);

  // Refresh Data when switching screens
  useEffect(() => {
    if (token) {
      if (user?.role === 'admin') {
        if (currentScreen === 'adminLeaves') fetchAdminLeaves();
        else if (currentScreen === 'adminDashboard') fetchAdminData();
        else if (currentScreen === 'adminUsers') fetchAdminData();
        else if (currentScreen === 'adminReports') fetchAdminData();
      } else {
        if (currentScreen === 'reports') fetchReports();
        else if (currentScreen === 'orders') fetchOrders();
        else if (currentScreen === 'dashboard') {
          fetchOrders();
          fetchAttendanceStatus();
          fetchNotifications();
        }
      }
    }
  }, [currentScreen, token, user]);

  // Sync Pending Orders when online
  useEffect(() => {
    if (isOnline && pendingOrders.length > 0 && !isSyncing) {
      syncOrders();
    }
  }, [isOnline, pendingOrders]);

  const syncOrders = async () => {
    setIsSyncing(true);
    const ordersToSync = [...pendingOrders];
    const failedSyncs: any[] = [];

    for (const order of ordersToSync) {
      try {
        await api.post('/orders', order);
      } catch (err) {
        console.error("Sync failed for order", order, err);
        failedSyncs.push(order);
      }
    }

    setPendingOrders(failedSyncs);
    safeStorage.setItem('pendingOrders', JSON.stringify(failedSyncs));
    setIsSyncing(false);
    
    if (failedSyncs.length === 0) {
      alert("All offline orders synced successfully!");
      fetchOrders();
    }
  };

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, reportsRes, leavesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/sales-reports'),
        api.get('/admin/leaves')
      ]);
      setAdminStats(statsRes.data);
      setAdminUsers(usersRes.data);
      setAdminReports(reportsRes.data);
      setAdminLeaves(leavesRes.data);
    } catch (err) { console.error("Error fetching admin data", err); }
  };

  const fetchAdminLeaves = async () => {
    try {
      const res = await api.get('/admin/leaves');
      setAdminLeaves(res.data);
    } catch (err) { console.error("Error fetching admin leaves", err); }
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchAdminData();
    } catch (err: any) { alert(err.response?.data?.error || "Delete Failed"); }
  };

  const fetchOutlets = async () => {
    try {
      const res = await api.get('/outlets');
      setOutlets(res.data);
    } catch (err) { console.error("Error fetching outlets", err); }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) { console.error("Error fetching products", err); }
  };

  const fetchOrders = async () => {
    try {
      console.log("[ORDERS] Fetching fresh order history...");
      const res = await api.get('/orders');
      console.log("[ORDERS] Order history received:", res.data);
      setOrders([...res.data]); // Force state refresh
    } catch (err) { 
      console.error("[ORDERS] Error fetching orders", err); 
    }
  };

  const fetchReports = async () => {
    try {
      console.log("[REPORTS] Fetching fresh report data...");
      const [dayRes, partyRes, locationRes, productRes] = await Promise.all([
        api.get('/reports/day-wise'),
        api.get('/reports/party-wise'),
        api.get('/reports/location-wise'),
        api.get('/reports/product-wise')
      ]);
      
      console.log("[REPORTS] SUCCESS - Received data:", {
        day: dayRes.data,
        party: partyRes.data,
        location: locationRes.data,
        product: productRes.data
      });
      
      setDayWiseReport(dayRes.data);
      
      const partyData = partyRes.data.data || partyRes.data;
      setPartyWiseReport({ ...partyData }); 
      setLocationWiseReport(locationRes.data);
      setProductWiseReport(productRes.data);
    } catch (err) { 
      console.error("[REPORTS] Error fetching reports", err); 
    }
  };

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, loginForm);
      setToken(res.data.token);
      setUser(res.data.user);
      safeStorage.setItem('token', res.data.token);
      safeStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user.role === 'admin') {
        setCurrentScreen('adminDashboard');
      } else {
        setCurrentScreen('dashboard');
      }
    } catch (err) { alert("Login Failed!"); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/auth/register`, loginForm);
      if (currentScreen === 'adminAddUser') {
        alert("Team Member Added Successfully!");
        fetchAdminData();
        setCurrentScreen('adminUsers');
      } else {
        alert("Registration Successful! Please login.");
        setIsRegistering(false);
      }
    } catch (err: any) { alert(err.response?.data?.error || "Registration Failed!"); }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${editingUser.id}`, editingUser);
      alert("User Updated Successfully!");
      fetchAdminData();
      setCurrentScreen('adminUsers');
    } catch (err: any) { alert(err.response?.data?.error || "Update Failed!"); }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/outlets', outletForm);
      alert("Client Added Successfully!");
      setOutletForm({ name: '', beat_name: '', area: '', city: '', owner_name: '', owner_no: '', class: 'C', address: '', gstNumber: '' });
      fetchOutlets();
      setCurrentScreen('dashboard');
    } catch (err: any) { alert("Failed to add client"); }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    safeStorage.removeItem('token');
    safeStorage.removeItem('user');
    safeStorage.removeItem('currentScreen');
    setCurrentScreen('login');
  };

  // Order Handlers
  const addToCart = (productId: number) => {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) newCart[productId] -= 1;
      else delete newCart[productId];
      return newCart;
    });
  };

  const submitOrder = async () => {
    if (!activeOutlet) return;
    const items = Object.entries(cart).map(([pid, qty]) => ({
      productId: parseInt(pid),
      quantity: qty,
      price: products.find(p => p.id === parseInt(pid))?.price || 0
    }));

    const orderData = {
      outletId: activeOutlet.id,
      totalAmount,
      items
    };

    if (!isOnline) {
      const newPending = [...pendingOrders, orderData];
      setPendingOrders(newPending);
      safeStorage.setItem('pendingOrders', JSON.stringify(newPending));
      alert("No internet! Order saved as Draft. It will sync automatically when you are online.");
      setCart({});
      setCurrentScreen('dashboard');
      return;
    }

    try {
      const res = await api.post('/orders', orderData);
      alert("Order Placed Successfully! Generating Invoice...");
      setCart({});
      fetchOrders();
      fetchReports();
      setCurrentScreen('dashboard');
      
      // Generate the professional invoice immediately
      generateInvoice(res.data);
      
      // Auto-share on WhatsApp for better UX
      if (window.confirm("Do you want to share the order summary on WhatsApp?")) {
        shareOnWhatsApp(res.data);
      }
    } catch (err) { alert("Order failed"); }
  };

  const totalAmount = products.reduce((sum, p) => sum + (p.price * (cart[p.id] || 0)), 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // Helper for Number to Words
  const numberToWords = (num: number): string => {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const format = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + format(n % 100) : '');
      if (n < 100000) return format(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + format(n % 1000) : '');
      return n.toString();
    };
    
    return format(Math.floor(num)) + ' Rupees Only';
  };

  // Professional Invoice Generator (Ramesh Electronics Style)
  const generateInvoice = (order: Order) => {
    const doc = new jsPDF() as any;
    const pageWidth = 210;
    
    // Top Right Tagline
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("One place for your beauty empowerment", pageWidth - 15, 10, { align: "right" });
    
    // Top Left TAX INVOICE
    doc.setFontSize(9);
    doc.setTextColor(50);
    doc.text("TAX INVOICE", 15, 10);
    doc.setDrawColor(200);
    doc.rect(38, 6, 42, 6);
    doc.text("ORIGINAL FOR RECIPIENT", 40, 10.5);
    
    // Shop Logo/Name
    doc.setFontSize(28);
    doc.setTextColor(128, 0, 128); // Purple like Ramesh Electronics
    doc.setFont("helvetica", "bold");
    doc.text("POPPIK LIFESTYLE PRIVATE LIMITED", pageWidth / 2, 25, { align: "center" });
    
    // Shop Details
    doc.setFontSize(8);
    doc.setTextColor(50);
    doc.setFont("helvetica", "normal");
    doc.text("Office No.- 213, A- Wing, Skylark Building, Plot No.- 63, Sector No.- 11, C.B.D. Belapur, Navi Mumbai- 400614 INDIA.", pageWidth / 2, 30, { align: "center" });
    doc.text(`Mobile: 8976261444          Email: info@poppik.in`, pageWidth / 2, 34, { align: "center" });
    
    // Invoice Bar (Grey Header)
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 45, pageWidth - 30, 12, 'F');
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50);
    doc.text(`Order No.:`, 20, 52.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${order.id}`, 40, 52.5);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Order Date:`, 80, 52.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${new Date(order.createdAt).toLocaleDateString('en-GB')}`, 105, 52.5);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Due Date:`, 145, 52.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${new Date(new Date(order.createdAt).getTime() + 30*24*60*60*1000).toLocaleDateString('en-GB')}`, 165, 52.5);
    
    // Bill To / Ship To Headers (Purpleish)
    doc.setFontSize(9);
    doc.setTextColor(128, 0, 128);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO", 15, 65);
    doc.text("SHIP TO", 105, 65);
    
    // Client Details
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(order.outlet.name, 15, 71);
    doc.text(order.outlet.name, 105, 71);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    doc.text(order.outlet.address, 15, 76, { maxWidth: 80 });
    doc.text(order.outlet.address, 105, 76, { maxWidth: 80 });
    doc.text(`Mobile: ${order.outlet.owner_no || 'N/A'}`, 15, 86);
    doc.text(`State: Rajasthan`, 15, 91);
    
    // Items Table
    const tableData = order.orderItems.map((item) => {
      // Handle GST percentage correctly (if 0.18 -> 18)
      let gstPercent = item.product.gst || 0;
      if (gstPercent > 0 && gstPercent < 1) gstPercent = gstPercent * 100;
      if (gstPercent === 0) gstPercent = 18; // Default to 18 if not set

      const taxable = item.priceAtTime / (1 + (gstPercent / 100));
      const taxAmount = (item.priceAtTime - taxable) * item.quantity;
      return [
        `${item.product.name}\n${item.product.productCode || ''} | ${item.product.boxSize || ''}`,
        item.product.hsn || "N/A",
        `${item.quantity}`,
        `${(item.product.mrp || 0).toLocaleString()}`,
        taxable.toFixed(2),
        `${taxAmount.toFixed(2)}\n(${gstPercent}%)`,
        (item.quantity * item.priceAtTime).toLocaleString()
      ];
    });

    autoTable(doc, {
      startY: 100,
      head: [['ITEMS & CODE', 'HSN', 'QTY', 'MRP', 'RATE', 'TAX', 'AMOUNT']],
      body: tableData,
      theme: 'plain',
      headStyles: { 
        borderBottom: { color: [128, 0, 128], width: 1 }, 
        textColor: [50, 50, 50], 
        fontStyle: 'bold', 
        fontSize: 8,
        halign: 'center' // Default head alignment
      },
      styles: { fontSize: 8, cellPadding: 3, textColor: [50, 50, 50], halign: 'center' },
      columnStyles: {
        0: { cellWidth: 55, halign: 'left' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' }
      },
      didParseCell: function(data) {
        if (data.section === 'head') {
          if (data.column.index === 0) data.cell.styles.halign = 'left';
          if (data.column.index >= 3) data.cell.styles.halign = 'right';
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    
    // Subtotal Row
    doc.setDrawColor(128, 0, 128);
    doc.line(15, finalY, pageWidth - 15, finalY);
    doc.setFont("helvetica", "bold");
    doc.text("SUBTOTAL", 15, finalY + 7);
    const totalQty = order.orderItems.reduce((s, i) => s + i.quantity, 0);
    doc.text(totalQty.toString(), 97.5, finalY + 7, { align: "center" });
    doc.text(order.totalAmount.toLocaleString(), pageWidth - 15, finalY + 7, { align: "right" });
    doc.line(15, finalY + 10, pageWidth - 15, finalY + 10);
    
    const summaryY = finalY + 20;
    
    // Totals Section - Calculate weighted tax
    const taxableTotal = order.orderItems.reduce((sum, item) => {
        let gstPercent = item.product.gst || 0;
        if (gstPercent > 0 && gstPercent < 1) gstPercent = gstPercent * 100;
        if (gstPercent === 0) gstPercent = 18;
        return sum + (item.priceAtTime / (1 + (gstPercent / 100))) * item.quantity;
    }, 0);
    const taxTotal = order.totalAmount - taxableTotal;
    
    doc.setFontSize(9);
    doc.text("TAXABLE AMOUNT", 140, summaryY + 5);
    doc.text(taxableTotal.toLocaleString(undefined, {minimumFractionDigits: 2}), pageWidth - 15, summaryY + 5, { align: "right" });
    doc.text("GST TOTAL", 140, summaryY + 10);
    doc.text(taxTotal.toLocaleString(undefined, {minimumFractionDigits: 2}), pageWidth - 15, summaryY + 10, { align: "right" });
    
    doc.line(140, summaryY + 13, pageWidth - 15, summaryY + 13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text("TOTAL AMOUNT", 140, summaryY + 18);
    doc.text(order.totalAmount.toLocaleString(), pageWidth - 15, summaryY + 18, { align: "right" });
    
    // Amount in words
    doc.setFont("helvetica", "bold");
    doc.text("Total Amount (in words)", pageWidth - 15, summaryY + 50, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(numberToWords(order.totalAmount), pageWidth - 15, summaryY + 55, { align: "right" });
    
    doc.save(`Invoice_${order.id}_${order.outlet.name.replace(/\s+/g, '_')}.pdf`);
  };

  const shareOnWhatsApp = (order: Order) => {
    const message = `*Poppik Lifestyle - Order Confirmation*\n\n` +
      `*Order ID:* #${order.id}\n` +
      `*Date:* ${new Date(order.createdAt).toLocaleDateString()}\n` +
      `*Outlet:* ${order.outlet.name}\n\n` +
      `*Items:*\n` +
      order.orderItems.map(item => `- ${item.product.name} (x${item.quantity}): ₹${item.quantity * item.priceAtTime}`).join('\n') +
      `\n\n*Total Amount: ₹${order.totalAmount}*\n\n` +
      `Thank you for shopping with Poppik! Visit us at poppiklifestyle.com`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  if (currentScreen === 'login') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-6">
        <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-10">
              <div className="w-28 h-28 rounded-2xl overflow-hidden flex items-center justify-center mb-4">
                 <img src="/logo.png" alt="Poppik Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-3xl font-black text-slate-800">Poppik SFA</h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">{isRegistering ? 'Create New Account' : 'Marketing Portal'}</p>
           </div>
           <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6">
              {isRegistering && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={loginForm.name}
                    onChange={e => setLoginForm({...loginForm, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white outline-none transition-all font-bold" 
                    placeholder="Enter full name"
                  />
                </div>
              )}
              <div>
                 <label className="block text-xs font-black text-slate-400 uppercase mb-2">Phone Number</label>
                 <input 
                   type="text" 
                   value={loginForm.phone}
                   onChange={e => setLoginForm({...loginForm, phone: e.target.value})}
                   className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white outline-none transition-all font-bold" 
                   placeholder="Enter phone"
                 />
              </div>
              <div>
                 <label className="block text-xs font-black text-slate-400 uppercase mb-2">Password</label>
                 <input 
                   type="password" 
                   value={loginForm.password}
                   onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                   className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white outline-none transition-all font-bold" 
                   placeholder="••••••••"
                 />
              </div>
              {isRegistering && (
                <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-2">Account Role</label>
                   <select 
                     value={loginForm.role}
                     onChange={e => setLoginForm({...loginForm, role: e.target.value})}
                     className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white outline-none transition-all font-bold appearance-none"
                   >
                     <option value="sales">Sales Associate</option>
                     <option value="admin">Admin Manager</option>
                   </select>
                </div>
              )}
              <button type="submit" className="w-full py-5 bg-poppik-green text-white font-black rounded-2xl shadow-xl shadow-green-900/20 hover:scale-[1.02] active:scale-95 transition-all">
                 {isRegistering ? 'Register Now' : 'Login to Account'}
              </button>
           </form>
           <div className="mt-8 text-center">
              <button onClick={() => setIsRegistering(!isRegistering)} className="text-poppik-green font-bold text-sm hover:underline">
                 {isRegistering ? 'Already have an account? Login' : 'Need an account? Register here'}
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className={`fixed inset-y-0 left-0 z-[1030] w-72 bg-slate-900 text-white transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="h-full flex flex-col p-8">
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center">
                    <img src="/logo.png" alt="Poppik Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-2xl font-black tracking-tighter">Poppik SFA</span>
               </div>
               <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
               {user?.role === 'admin' ? (
                 <>
                   <SidebarNavItem icon={<BarChart3 />} label="Admin Overview" screen="adminDashboard" current={currentScreen} onClick={setCurrentScreen} />
                   <SidebarNavItem icon={<Store />} label="Inventory Management" screen="inventory" current={currentScreen} onClick={setCurrentScreen} />
                   
                   <div className="pt-6 pb-2 px-4"><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Management</p></div>
                   
                   <SidebarNavItem icon={<User />} label="Team Members" screen="adminUsers" current={currentScreen} onClick={setCurrentScreen} />
                   <SidebarNavItem icon={<Calendar />} label="Leave Requests" screen="adminLeaves" current={currentScreen} onClick={setCurrentScreen} />
                   <SidebarNavItem icon={<BarChart3 />} label="Sales Performance" screen="adminReports" current={currentScreen} onClick={setCurrentScreen} />
                   
                   <div className="pt-6 pb-2 px-4"><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Personal</p></div>
                   <SidebarNavItem icon={<User />} label="Admin Profile" screen="profile" current={currentScreen} onClick={setCurrentScreen} />
                 </>
               ) : (
                 <>
                   <SidebarNavItem icon={<Home />} label="Home Dashboard" screen="dashboard" current={currentScreen} onClick={setCurrentScreen} />
                   
                   <div className="pt-6 pb-2 px-4"><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sales Operations</p></div>
                   
                   <SidebarNavItem icon={<Clock />} label="Attendance" screen="attendance" current={currentScreen} onClick={setCurrentScreen} />
                   <SidebarNavItem icon={<ShoppingCart />} label="Create Order" screen="createOrder" current={currentScreen} onClick={setCurrentScreen} />
                   <SidebarNavItem icon={<User />} label="Add Client" screen="addClient" current={currentScreen} onClick={setCurrentScreen} />
                   <SidebarNavItem icon={<BarChart3 />} label="Reports" screen="reports" current={currentScreen} onClick={setCurrentScreen} />
                   
                   <div className="pt-6 pb-2 px-4"><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Personal</p></div>
                   
                   <SidebarNavItem icon={<ShoppingCart />} label="Order History" screen="orders" current={currentScreen} onClick={setCurrentScreen} />
                   <SidebarNavItem icon={<User />} label="My Account" screen="profile" current={currentScreen} onClick={setCurrentScreen} />
                 </>
               )}
            </nav>
         </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
         <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-[1010] px-6 flex items-center justify-between">
            <span className="font-black text-xl text-slate-800">Poppik</span>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-xl"><Menu className="w-6 h-6 text-slate-600" /></button>
         </div>
         <div className="flex-1 overflow-y-auto pt-16 md:pt-0">
            {currentScreen === 'dashboard' && (
               <ScreenWrapper title="Dashboard" user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')} onViewAllNotifications={() => setCurrentScreen('notifications')} markAllRead={markAllRead}>
                 <div className="space-y-8">
                  <div className="bg-gradient-to-r from-poppik-green to-emerald-800 rounded-3xl p-8 text-white shadow-xl shadow-green-900/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-lg opacity-80 mb-1">Good morning,</h2>
                        <h1 className="text-3xl font-black mb-6">{user?.name || 'Valued User'}</h1>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button 
                            onClick={() => handlePunch(isPunchedIn ? 'OUT' : 'IN')}
                            className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center space-x-3 shadow-lg ${
                              isPunchedIn 
                              ? 'bg-red-500/20 text-white border border-red-500/30 backdrop-blur-sm hover:bg-red-500/30' 
                              : 'bg-white text-poppik-green hover:scale-[1.02]'
                            }`}
                          >
                            <Clock className="w-6 h-6" />
                            <span>{isPunchedIn ? 'Punch Out Now' : 'Punch In Now'}</span>
                          </button>
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                  </div>

                  {/* 4-Card Dashboard for Salesman */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <DashboardCard icon={<Clock />} title="Attendance" onClick={() => setCurrentScreen('attendance')} color="text-blue-600" />
                    <DashboardCard icon={<ShoppingCart />} title="Create Order" onClick={() => setCurrentScreen('createOrder')} color="text-orange-600" />
                    <DashboardCard icon={<User />} title="Add Client" onClick={() => setCurrentScreen('addClient')} color="text-poppik-gold" />
                    <DashboardCard icon={<BarChart3 />} title="Reports" onClick={() => setCurrentScreen('reports')} color="text-purple-600" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold mb-6 flex items-center"><Target className="w-6 h-6 mr-3 text-poppik-green" /> Quick Actions</h3>
                        <div className="grid grid-cols-1 gap-4">
                          <button onClick={() => setCurrentScreen('createOrder')} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-poppik-beige transition-all group border border-slate-100 hover:border-poppik-gold/30">
                              <div className="flex items-center space-x-4">
                                <div className="bg-white p-3 rounded-xl shadow-sm"><Store className="w-6 h-6 text-poppik-green" /></div>
                                <div className="text-left"><p className="font-bold text-slate-800">Start Field Visit</p><p className="text-sm text-slate-500">Check-in to shops & take orders</p></div>
                              </div>
                              <ChevronRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 transition-all" />
                          </button>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold mb-6">Recent Orders</h3>
                        <div className="space-y-4">
                           {orders.slice(0, 3).map(o => (
                             <div 
                               key={o.id} 
                               onClick={() => setViewingOrder(o)}
                               className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-poppik-green cursor-pointer transition-all group"
                             >
                                <div>
                                  <p className="font-bold text-slate-800 group-hover:text-poppik-green transition-colors">{o.outlet.name}</p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(o.createdAt).toLocaleDateString()} • {(o.orderItems?.length || o.items?.length || 0)} Products</p>
                                </div>
                                <p className="font-black text-poppik-green">₹{o.totalAmount.toLocaleString()}</p>
                             </div>
                           ))}
                           {orders.length === 0 && <p className="text-slate-400 text-sm italic text-center py-4">No orders placed yet</p>}
                        </div>
                    </div>
                  </div>

                  {/* Order Detail Modal */}
                  {viewingOrder && (
                    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                          <div>
                            <h3 className="text-2xl font-black text-slate-800">Order Details</h3>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Order #{viewingOrder.id} • {new Date(viewingOrder.createdAt).toLocaleDateString()}</p>
                          </div>
                          <button onClick={() => setViewingOrder(null)} className="p-3 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"><X size={24} /></button>
                        </div>
                        
                        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                          {/* Outlet Info */}
                          <div className="mb-8 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Customer Information</h4>
                            <div className="flex items-start space-x-4">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                                <Store className="w-6 h-6 text-poppik-green" />
                              </div>
                              <div>
                                <p className="font-black text-lg text-slate-800">{viewingOrder.outlet.name}</p>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">{viewingOrder.outlet.address}</p>
                                {viewingOrder.outlet.owner_no && <p className="text-sm text-slate-500 font-bold mt-2 flex items-center"><Phone className="w-3.5 h-3.5 mr-2" /> {viewingOrder.outlet.owner_no}</p>}
                                {viewingOrder.outlet.gstNumber && <p className="text-sm text-slate-500 font-bold mt-1 flex items-center"><ShieldCheck className="w-3.5 h-3.5 mr-2" /> GST: {viewingOrder.outlet.gstNumber}</p>}
                              </div>
                            </div>
                          </div>

                          {/* Items List */}
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Order Items</h4>
                            {viewingOrder.orderItems?.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                                <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-poppik-green text-xs">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800">{item.product.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.product.productCode || 'No Code'} • {item.product.boxSize || 'Standard'}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-slate-800">₹{item.priceAtTime} × {item.quantity}</p>
                                  <p className="text-xs font-black text-poppik-green mt-0.5">₹{(item.priceAtTime * item.quantity).toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Summary */}
                          <div className="mt-8 pt-8 border-t border-slate-100">
                            <div className="flex justify-between items-center">
                              <p className="text-lg font-bold text-slate-500">Grand Total</p>
                              <p className="text-3xl font-black text-poppik-green">₹{viewingOrder.totalAmount.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex gap-4">
                          <button 
                            onClick={() => { shareOnWhatsApp(viewingOrder); setViewingOrder(null); }}
                            className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl shadow-lg shadow-green-900/20 hover:bg-green-600 transition-all flex items-center justify-center space-x-2"
                          >
                            <MessageCircle size={20} />
                            <span>Share on WhatsApp</span>
                          </button>
                          <button 
                            onClick={() => { generateInvoice(viewingOrder); setViewingOrder(null); }}
                            className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center space-x-2"
                          >
                            <FileText size={20} />
                            <span>Download Invoice</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'notifications' && (
               <ScreenWrapper title="Notifications" showBack backAction={() => setCurrentScreen('dashboard')} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')} onViewAllNotifications={() => setCurrentScreen('notifications')} markAllRead={markAllRead}>
                 <NotificationsView notifications={notifications} markAllRead={markAllRead} />
               </ScreenWrapper>
             )}

             {currentScreen === 'addClient' && (
              <ScreenWrapper title="Add New Client" showBack backAction={() => setCurrentScreen('dashboard')} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')} onViewAllNotifications={() => setCurrentScreen('notifications')} markAllRead={markAllRead}>
                <div className="max-w-3xl mx-auto space-y-8">
                  {/* Form Header */}
                  <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex items-center space-x-6">
                    <div className="w-16 h-16 bg-poppik-green/10 rounded-2xl flex items-center justify-center">
                      <Plus className="w-8 h-8 text-poppik-green" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">Outlet Registration</h3>
                      <p className="text-slate-500 font-medium">Add a new partner to the Poppik network.</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddClient} className="space-y-8 pb-12">
                    {/* Section 1: Shop Information */}
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                      <div className="flex items-center space-x-3 mb-8">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-poppik-green" />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-wider">Shop Details</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Shop/Outlet Name</label>
                          <div className="relative">
                            <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                              type="text" 
                              value={outletForm.name} 
                              onChange={e => setOutletForm({...outletForm, name: e.target.value})} 
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white focus:border-poppik-green outline-none transition-all font-bold" 
                              placeholder="e.g. Modern Cosmetics" 
                              required 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Beat / Route Name</label>
                          <div className="relative">
                            <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                              type="text" 
                              value={outletForm.beat_name} 
                              onChange={e => setOutletForm({...outletForm, beat_name: e.target.value})} 
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white focus:border-poppik-green outline-none transition-all font-bold" 
                              placeholder="e.g. North Jaipur Route" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">GST Number</label>
                          <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                              type="text" 
                              value={outletForm.gstNumber} 
                              onChange={e => setOutletForm({...outletForm, gstNumber: e.target.value})} 
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white focus:border-poppik-green outline-none transition-all font-bold" 
                              placeholder="15-digit GSTIN" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Outlet Class</label>
                          <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                            <select 
                              value={outletForm.class} 
                              onChange={e => setOutletForm({...outletForm, class: e.target.value})} 
                              className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white focus:border-poppik-green outline-none transition-all font-bold appearance-none relative"
                            >
                               <option value="A_PLUS">A+ (Premium)</option>
                               <option value="A">A (High Potential)</option>
                               <option value="B_PLUS">B+ (Moderate Plus)</option>
                               <option value="B">B (Moderate)</option>
                               <option value="C_PLUS">C+ (Standard Plus)</option>
                               <option value="C">C (Standard)</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rotate-90" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Contact Person Details */}
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                      <div className="flex items-center space-x-3 mb-8">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-poppik-gold" />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-wider">Contact Person</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Owner / Manager Name</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                              type="text" 
                              value={outletForm.owner_name} 
                              onChange={e => setOutletForm({...outletForm, owner_name: e.target.value})} 
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white focus:border-poppik-green outline-none transition-all font-bold" 
                              placeholder="Full Name" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Mobile Number</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                              type="text" 
                              value={outletForm.owner_no} 
                              onChange={e => setOutletForm({...outletForm, owner_no: e.target.value})} 
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white focus:border-poppik-green outline-none transition-all font-bold" 
                              placeholder="10-digit mobile" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Location Details */}
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                      <div className="flex items-center space-x-3 mb-8">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-red-500" />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-wider">Location Info</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Area / Landmark</label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                              type="text" 
                              value={outletForm.area} 
                              onChange={e => setOutletForm({...outletForm, area: e.target.value})} 
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white focus:border-poppik-green outline-none transition-all font-bold" 
                              placeholder="Locality" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">City</label>
                          <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                              type="text" 
                              value={outletForm.city} 
                              onChange={e => setOutletForm({...outletForm, city: e.target.value})} 
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white focus:border-poppik-green outline-none transition-all font-bold" 
                              placeholder="e.g. Jaipur" 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Full Address</label>
                        <div className="relative">
                          <Pencil className="absolute left-4 top-5 w-5 h-5 text-slate-400" />
                          <textarea 
                            value={outletForm.address} 
                            onChange={e => setOutletForm({...outletForm, address: e.target.value})} 
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 focus:bg-white focus:border-poppik-green outline-none transition-all font-bold h-32 resize-none" 
                            placeholder="Complete shop address..." 
                            required
                          ></textarea>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-6 bg-poppik-green text-white text-xl font-black rounded-3xl shadow-2xl shadow-green-900/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3"
                    >
                      <CloudUpload className="w-6 h-6" />
                      <span>Register & Add Client</span>
                    </button>
                  </form>
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'createOrder' && (
              <ScreenWrapper title="Select Outlet" showBack backAction={() => setCurrentScreen('dashboard')} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')} onViewAllNotifications={() => setCurrentScreen('notifications')} markAllRead={markAllRead}>
                <div className="space-y-8">
                  <div className="relative max-w-4xl mx-auto w-full group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                    <input 
                      type="text" 
                      placeholder="Search by outlet name or area..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className="w-full pl-14 pr-6 py-5 text-lg bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-poppik-green/10 shadow-sm transition-all" 
                    />
                    
                    {/* Search Results Dropdown */}
                    {searchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-[32px] shadow-2xl z-[1020] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {outlets.filter(o => (o.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || (o.area?.toLowerCase() || '').includes(searchQuery.toLowerCase())).length > 0 ? (
                          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {outlets
                              .filter(o => (o.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || (o.area?.toLowerCase() || '').includes(searchQuery.toLowerCase()))
                              .map(outlet => (
                                <button 
                                  key={outlet.id} 
                                  onClick={() => { setActiveOutlet(outlet); setCurrentScreen('productCatalog'); setSearchQuery(''); }} 
                                  className="w-full text-left p-6 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-colors"
                                >
                                  <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-slate-100 rounded-xl text-slate-600 group-hover:bg-poppik-green group-hover:text-white transition-colors">
                                      <Store className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800 group-hover:text-poppik-green transition-colors">{outlet.name}</p>
                                      <p className="text-xs text-slate-500 font-medium">{outlet.area}, {outlet.city}</p>
                                    </div>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-all" />
                                </button>
                              ))
                            }
                            {/* Option to add even if results exist */}
                            <button 
                              onClick={() => { setCurrentScreen('addClient'); setSearchQuery(''); }}
                              className="w-full p-6 bg-slate-50 hover:bg-poppik-beige flex items-center justify-center space-x-2 text-poppik-green font-bold border-t border-slate-100 transition-colors"
                            >
                              <Plus className="w-5 h-5" />
                              <span>Don't see the client? Add New Client</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                              <Search className="w-10 h-10 text-slate-300" />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 mb-2">Client Not Found</h4>
                            <p className="text-slate-500 mb-8 max-w-xs mx-auto font-medium">We couldn't find any outlet matching "{searchQuery}". Would you like to add it?</p>
                            <button 
                              onClick={() => { setCurrentScreen('addClient'); setSearchQuery(''); }} 
                              className="px-10 py-4 bg-poppik-green text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-green-900/20 flex items-center justify-center space-x-2 mx-auto"
                            >
                              <Plus className="w-5 h-5" />
                              <span>Register New Client</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {outlets.filter(o => (o.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || (o.area?.toLowerCase() || '').includes(searchQuery.toLowerCase())).map(outlet => (
                      <div key={outlet.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:border-poppik-green hover:shadow-xl transition-all group flex flex-col h-full">
                        <div className="mb-8 flex-1">
                          <div className="flex items-center justify-between mb-4">
                              <div className="bg-slate-50 p-3 rounded-2xl text-poppik-green group-hover:bg-poppik-green group-hover:text-white transition-colors"><Store className="w-6 h-6" /></div>
                              <span className="text-xs font-black text-poppik-gold bg-poppik-gold/10 px-3 py-1.5 rounded-full uppercase">{outlet.class?.replace('_', '+')}</span>
                          </div>
                          <h3 className="text-xl font-black text-slate-800 mb-4 group-hover:text-poppik-green transition-colors">{outlet.name}</h3>
                          <p className="text-sm text-slate-500 flex items-center mb-2"><User className="w-4 h-4 mr-2 text-slate-400" /> {outlet.owner_name || 'Owner'}</p>
                          <p className="text-sm text-slate-500 flex items-center"><MapPin className="w-4 h-4 mr-2 text-slate-400" /> {outlet.area}, {outlet.city}</p>
                        </div>
                        <button 
                          onClick={() => { setActiveOutlet(outlet); setCurrentScreen('productCatalog'); }}
                          className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-poppik-green transition-all transform active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-black/10"
                        >
                          <span>Create Order</span><ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Empty State when no outlets exist for this user */}
                  {outlets.length === 0 && !searchQuery && (
                    <div className="flex flex-col items-center justify-center py-20 px-6 bg-white rounded-[40px] border border-slate-200 shadow-sm text-center">
                      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                        <Store className="w-12 h-12 text-slate-300" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-800 mb-3">No Outlets Registered Yet</h3>
                      <p className="text-slate-500 max-w-sm mx-auto font-medium mb-10">
                        It looks like you haven't added any clients to your route. Let's register your first outlet to start taking orders.
                      </p>
                      <button 
                        onClick={() => setCurrentScreen('addClient')} 
                        className="px-12 py-5 bg-poppik-green text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-green-900/20 flex items-center justify-center space-x-3"
                      >
                        <Plus className="w-6 h-6" />
                        <span>Register Your First Client</span>
                      </button>
                    </div>
                  )}
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'productCatalog' && (
              <ScreenWrapper title="Product Catalog" showBack backAction={() => setCurrentScreen('createOrder')} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')} onViewAllNotifications={() => setCurrentScreen('notifications')} markAllRead={markAllRead}>
                <div className="space-y-8 pb-32">
                  {/* Header Info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="p-4 bg-poppik-beige rounded-2xl"><Store className="w-8 h-8 text-poppik-black" /></div>
                      <div>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Billing for Outlet</p>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{activeOutlet?.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items in Cart</p>
                          <p className="text-xl font-black text-slate-800">{cartCount}</p>
                        </div>
                        <div className="h-10 w-[1px] bg-slate-100"></div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
                          <p className="text-2xl font-black text-poppik-green">₹{totalAmount.toLocaleString()}</p>
                        </div>
                    </div>
                  </div>

                  {/* Product Search */}
                  <div className="relative max-w-4xl mx-auto w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                    <input 
                      type="text" 
                      placeholder="Search items by name or category..." 
                      value={productSearchQuery} 
                      onChange={(e) => setProductSearchQuery(e.target.value)} 
                      className="w-full pl-14 pr-6 py-5 text-lg bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-poppik-green/10 shadow-sm transition-all" 
                    />
                  </div>

                  {/* Compact Product List (MyBillBook Style) */}
                  <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Details</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Category</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {products
                            .filter(p => 
                              p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || 
                              p.category.toLowerCase().includes(productSearchQuery.toLowerCase())
                            )
                            .map(product => (
                            <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-8 py-6">
                                <p className="font-bold text-slate-800 text-lg group-hover:text-poppik-green transition-colors">{product.name}</p>
                                <p className="text-xs text-slate-400 font-medium">SKU: POP-{product.id.toString().padStart(4, '0')}</p>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                  {product.category}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <p className="font-black text-lg text-slate-800">₹{product.price}</p>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center justify-center">
                                  {cart[product.id] > 0 ? (
                                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                                      <button 
                                        onClick={() => removeFromCart(product.id)} 
                                        className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                                      >
                                        <Minus className="w-4 h-4" />
                                      </button>
                                      <span className="font-black text-slate-800 w-10 text-center text-lg">{cart[product.id]}</span>
                                      <button 
                                        onClick={() => addToCart(product.id)} 
                                        className="p-2 text-slate-600 hover:bg-green-50 hover:text-poppik-green rounded-xl transition-all"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => addToCart(product.id)} 
                                      className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-poppik-green transition-all shadow-md text-sm flex items-center space-x-2"
                                    >
                                      <Plus className="w-4 h-4" />
                                      <span>Add</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {products.filter(p => 
                        p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || 
                        p.category.toLowerCase().includes(productSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="p-20 text-center">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-slate-300" />
                          </div>
                          <h4 className="text-xl font-black text-slate-800 mb-2">No Items Found</h4>
                          <p className="text-slate-500 font-medium">Try searching with a different keyword</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Order Floating Bar */}
                  {cartCount > 0 && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-[1030]">
                        <button 
                          onClick={() => { setCurrentScreen('cart'); setProductSearchQuery(''); }} 
                          className="w-full bg-poppik-black text-white p-6 rounded-[32px] flex items-center justify-between shadow-2xl hover:scale-[1.02] transition-all border border-white/10 group"
                        >
                          <div className="flex items-center space-x-6">
                              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md relative group-hover:bg-poppik-green transition-colors">
                                <ShoppingCart className="w-6 h-6" />
                                <span className="absolute -top-1 -right-1 bg-poppik-green text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-poppik-black font-black">{cartCount}</span>
                              </div>
                              <div className="text-left">
                                <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest mb-0.5">Review Billing</p>
                                <p className="text-2xl font-black tracking-tight">₹{totalAmount.toLocaleString()}</p>
                              </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-bold text-lg">Continue to Invoice</span>
                            <div className="p-2 bg-white/10 rounded-xl group-hover:translate-x-1 transition-transform">
                              <ChevronRight className="w-6 h-6 text-poppik-green" />
                            </div>
                          </div>
                        </button>
                    </div>
                  )}
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'cart' && (
              <ScreenWrapper title="Review Cart" showBack backAction={() => setCurrentScreen('productCatalog')} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')} onViewAllNotifications={() => setCurrentScreen('notifications')} markAllRead={markAllRead}>
                <div className="max-w-4xl mx-auto space-y-8 pb-32">
                  <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-slate-100">
                      <div className="bg-poppik-beige p-4 rounded-2xl"><Store className="w-8 h-8 text-poppik-black" /></div>
                      <div>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Order for Outlet</p>
                        <h3 className="text-2xl font-black text-slate-800">{activeOutlet?.name}</h3>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {products.filter(p => cart[p.id] > 0).map(product => (
                        <div key={product.id} className="flex items-center justify-between group p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100">
                          <div className="flex items-center space-x-6">
                            <div className="bg-slate-100 p-3 rounded-xl text-slate-400 group-hover:bg-poppik-green group-hover:text-white transition-colors">
                              <ShoppingCart className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-lg tracking-tight">{product.name}</h4>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{product.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-8">
                            <div className="text-right">
                              <p className="text-xs text-slate-400 font-black uppercase mb-0.5">Price</p>
                              <p className="text-lg font-black text-slate-800">₹{product.price}</p>
                            </div>
                            <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200 shadow-inner">
                              <button onClick={() => removeFromCart(product.id)} className="p-2 hover:bg-white text-slate-600 rounded-xl transition-all"><Minus className="w-4 h-4" /></button>
                              <span className="w-12 text-center font-black text-lg">{cart[product.id]}</span>
                              <button onClick={() => addToCart(product.id)} className="p-2 hover:bg-white text-slate-600 rounded-xl transition-all"><Plus className="w-4 h-4" /></button>
                            </div>
                            <div className="text-right min-w-[100px]">
                              <p className="text-xs text-slate-400 font-black uppercase mb-0.5">Total</p>
                              <p className="text-xl font-black text-poppik-green">₹{(product.price * cart[product.id]).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setCart(prev => {const n={...prev}; delete n[product.id]; return n;})} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                              <X className="w-6 h-6" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 space-y-4">
                      <div className="flex justify-between text-slate-500 font-bold"><p>Subtotal</p><p>₹{totalAmount.toLocaleString()}</p></div>
                      <div className="flex justify-between items-center pt-4"><p className="text-2xl font-black text-slate-800">Grand Total</p><p className="text-3xl font-black text-poppik-green">₹{totalAmount.toLocaleString()}</p></div>
                    </div>
                  </div>

                  <div className="sticky bottom-6 mt-12 w-full max-w-4xl mx-auto z-50">
                    <button onClick={submitOrder} className="w-full bg-poppik-green text-white p-6 rounded-[32px] flex items-center justify-between shadow-2xl hover:scale-[1.02] active:scale-95 transition-all border border-white/20">
                      <div className="flex items-center space-x-6">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md"><ShoppingCart className="w-6 h-6" /></div>
                        <div className="text-left"><p className="text-[10px] font-bold uppercase opacity-80">Confirm & Place</p><p className="text-2xl font-black tracking-tight">Final Order</p></div>
                      </div>
                      <div className="flex items-center space-x-2"><span className="font-bold text-lg">Submit & Generate Invoice</span><ChevronRight className="w-6 h-6" /></div>
                    </button>
                  </div>
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'reports' && (
              <ScreenWrapper title="Business Reports" showBack backAction={() => setCurrentScreen('dashboard')} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')} onViewAllNotifications={() => setCurrentScreen('notifications')} markAllRead={markAllRead}>
                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center"><Calendar className="w-6 h-6 mr-3 text-poppik-green" /> Day-wise Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                         <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Attendance</p>
                         <p className="text-2xl font-black text-blue-800">{dayWiseReport?.totalAttendance || 0}</p>
                      </div>
                      <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
                         <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Total Sales Value</p>
                         <p className="text-2xl font-black text-green-800">₹{(dayWiseReport?.totalSalesValue || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center"><Store className="w-6 h-6 mr-3 text-poppik-green" /> Party-wise History</h2>
                    <div className="space-y-4">
                      {partyWiseReport && Object.entries(partyWiseReport).map(([outletName, data]) => (
                        <div key={outletName} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h3 className="font-black text-slate-800 text-lg">{outletName}</h3><p className="text-sm text-slate-500 font-bold">{data.totalOrders} Orders Placed</p></div>
                            <div className="text-right"><p className="text-xl font-black text-poppik-green">₹{data.totalAmount.toLocaleString()}</p><p className="text-[10px] font-black text-slate-400 uppercase">Life-time Value</p></div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.orders.map(order => (
                              <button 
                                key={order.id} 
                                onClick={() => setViewingOrder(order)}
                                className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-poppik-green hover:shadow-lg transition-all text-left group"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Order #{order.id}</span>
                                  <span className="text-[10px] font-black text-poppik-green uppercase">{new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                  <div>
                                    <p className="font-black text-slate-800">₹{order.totalAmount.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{(order.orderItems?.length || order.items?.length || 0)} Products</p>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-poppik-green group-hover:translate-x-1 transition-all" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {(!partyWiseReport || Object.keys(partyWiseReport).length === 0) && (
                        <p className="text-slate-400 text-sm italic text-center py-4">No party data available yet</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center"><MapPin className="w-6 h-6 mr-3 text-poppik-green" /> Location-wise History</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {locationWiseReport && Object.entries(locationWiseReport).map(([location, data]) => (
                        <div key={location} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                           <div>
                              <h3 className="font-black text-slate-800 text-lg mb-1">{location}</h3>
                              <div className="flex justify-between items-center mb-4">
                                <p className="text-xs text-slate-500 font-bold uppercase">{data.uniquePartiesCount} Parties</p>
                                <p className="text-xs text-slate-500 font-bold uppercase">{data.totalOrders} Orders</p>
                              </div>
                           </div>
                           <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Total Sales</p>
                              <p className="text-xl font-black text-poppik-green">₹{data.totalAmount.toLocaleString()}</p>
                           </div>
                        </div>
                      ))}
                      {(!locationWiseReport || Object.keys(locationWiseReport).length === 0) && (
                        <p className="text-slate-400 text-sm italic text-center py-4 col-span-full">No location data available yet</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center"><Package className="w-6 h-6 mr-3 text-poppik-green" /> Product-wise History</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="pb-4 font-black text-slate-400 uppercase text-xs">Product</th>
                            <th className="pb-4 font-black text-slate-400 uppercase text-xs">Category</th>
                            <th className="pb-4 font-black text-slate-400 uppercase text-xs text-center">Qty Sold</th>
                            <th className="pb-4 font-black text-slate-400 uppercase text-xs text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {productWiseReport && Object.entries(productWiseReport).map(([productName, data]) => (
                            <tr key={productName} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-4">
                                <p className="font-bold text-slate-800">{productName}</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{data.productCode || 'N/A'}</p>
                              </td>
                              <td className="py-4">
                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">{data.category}</span>
                              </td>
                              <td className="py-4 text-center font-black text-slate-700">{data.totalQuantity}</td>
                              <td className="py-4 text-right font-black text-poppik-green">₹{data.totalRevenue.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(!productWiseReport || Object.keys(productWiseReport).length === 0) && (
                        <p className="text-slate-400 text-sm italic text-center py-8">No product data available yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'orders' && (
              <ScreenWrapper title="Order History" user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')} onViewAllNotifications={() => setCurrentScreen('notifications')} markAllRead={markAllRead}>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {orders.map(order => (
                        <div key={order.id} onClick={() => setViewingOrder(order)} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
                            <div className="flex justify-between items-start mb-6">
                                <div><p className="font-black text-xl text-slate-800 mb-1 group-hover:text-poppik-green transition-colors">#{order.id}</p><p className="text-sm text-slate-500 font-bold">{order.outlet.name}</p></div>
                                <div className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest ${order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.status}</div>
                            </div>
                            <div className="space-y-3 mb-8">
                              <p className="text-sm text-slate-500 flex items-center"><Calendar className="w-4 h-4 mr-3 text-slate-400" />{new Date(order.createdAt).toLocaleDateString()}</p>
                              <p className="text-sm text-slate-500 flex items-center"><ShoppingCart className="w-4 h-4 mr-3 text-slate-400" />{(order.orderItems?.length || order.items?.length || 0)} Items</p>
                            </div>
                            <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                                <p className="font-black text-2xl text-slate-800">₹{order.totalAmount.toLocaleString()}</p>
                                <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => shareOnWhatsApp(order)} className="p-4 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-all shadow-sm">
                                      <MessageCircle className="w-6 h-6" />
                                  </button>
                                  <button onClick={() => generateInvoice(order)} className="p-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-poppik-beige hover:text-poppik-black transition-all shadow-sm">
                                      <FileText className="w-6 h-6" />
                                  </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {orders.length === 0 && <p className="col-span-full text-slate-400 text-sm italic text-center py-12">No orders found in your history</p>}
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'profile' && (
              <ScreenWrapper title="My Profile" user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')} onViewAllNotifications={() => setCurrentScreen('notifications')} markAllRead={markAllRead}>
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col items-center text-center">
                      <div className="w-32 h-32 md:w-40 md:h-40 bg-poppik-beige rounded-full flex items-center justify-center border-8 border-slate-50 shadow-inner mb-6 relative">
                          <User className="text-poppik-black w-16 h-16 md:w-20 md:h-20" />
                          <div className="absolute bottom-1 right-1 bg-poppik-green w-8 h-8 rounded-full border-4 border-white"></div>
                      </div>
                      <h1 className="text-3xl font-black text-slate-800">{user?.name || 'Valued User'}</h1>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-8">{user?.role || 'Sales'} Associate • ID: #{user?.id || '000'}</p>
                      
                      <div className="w-full max-w-md bg-slate-50 rounded-3xl p-6 space-y-4 mb-8 text-left border border-slate-100">
                        <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Phone Number</span>
                           <span className="font-bold text-slate-700">{user?.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Account Status</span>
                           <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest">Active</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Joined On</span>
                           <span className="font-bold text-slate-700">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>

                      <button onClick={handleLogout} className="px-8 py-3 bg-red-50 text-red-600 font-black rounded-xl hover:bg-red-100 transition-colors flex items-center space-x-2">
                        <LogOut className="w-5 h-5" /><span className="text-sm">Logout Session</span>
                      </button>
                  </div>
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'attendance' && (
              <ScreenWrapper title="Attendance & Leaves" user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')} onViewAllNotifications={() => setCurrentScreen('notifications')} markAllRead={markAllRead}>
                <AttendanceView user={user} isPunchedIn={isPunchedIn} onPunch={handlePunch} api={api} />
              </ScreenWrapper>
            )}

            {currentScreen === 'inventory' && (
              <ScreenWrapper title="Inventory Management" user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')}>
                <div className="space-y-8">
                  <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                      <div>
                        <h2 className="text-3xl font-black text-slate-800">Product List</h2>
                        <p className="text-slate-500 font-medium">Upload Excel to update your product catalog</p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={async () => {
                            if (window.confirm("Are you sure you want to delete ALL products? This cannot be undone.")) {
                              try {
                                const res = await api.delete('/admin/products-clear-all');
                                alert(res.data.message);
                                fetchProducts();
                              } catch (err: any) {
                                alert(err.response?.data?.error || "Error clearing products");
                              }
                            }
                          }}
                          className="px-8 py-4 bg-red-50 text-red-600 font-black rounded-2xl border border-red-100 hover:bg-red-100 transition-all flex items-center"
                        >
                          <X className="w-6 h-6 mr-3" />
                          <span>Clear Catalog</span>
                        </button>
                        <label className="px-8 py-4 bg-poppik-green text-white font-black rounded-2xl shadow-xl shadow-green-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center cursor-pointer">
                          <CloudUpload className="w-6 h-6 mr-3" />
                          <span>Upload Excel (.xlsx)</span>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".xlsx, .xls" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async (evt) => {
                                try {
                                  const bstr = evt.target?.result;
                                  const wb = XLSX.read(bstr, { type: 'binary' });
                                  const wsname = wb.SheetNames[0];
                                  const ws = wb.Sheets[wsname];
                                  
                                  // Use header: 1 to get raw rows, then find the header row
                                  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                                  if (!rows || rows.length === 0) {
                                    alert("Excel file is empty!");
                                    return;
                                  }

                                  // Find the row that contains the most header keywords (Scoring System)
                                  let headerRowIndex = -1;
                                  let maxScore = 0;
                                  const possibleHeaders = ['PRODUCT NAME', 'ITEM NAME', 'NAME', 'HSN', 'PRODUCT CODE', 'CODE', 'RATE', 'MRP', 'QTY', 'CATEGORY'];
                                  
                                  for (let i = 0; i < Math.min(rows.length, 50); i++) {
                                    if (!rows[i]) continue;
                                    let score = 0;
                                    rows[i].forEach(cell => {
                                      if (!cell) return;
                                      const val = cell.toString().toUpperCase();
                                      if (possibleHeaders.some(h => val === h || val.includes(h))) score++;
                                    });
                                    if (score > maxScore) {
                                      maxScore = score;
                                      headerRowIndex = i;
                                    }
                                  }

                                  if (headerRowIndex === -1 || maxScore < 2) {
                                    alert("Could not find a valid header row. Please ensure your Excel has columns like 'PRODUCT NAME', 'RATE', etc.");
                                    return;
                                  }

                                  // Get data starting from the row after header
                                  const headers = rows[headerRowIndex].map(h => h?.toString().trim().toUpperCase() || '');
                                  const dataRows = rows.slice(headerRowIndex + 1);
                                  
                                  const formatted = dataRows
                                    .filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== '')) 
                                    .map((row: any[]) => {
                                      const getRawVal = (possibleNames: string[]) => {
                                        for (const name of possibleNames) {
                                          const idx = headers.findIndex(h => h && (h === name || h.includes(name)));
                                          if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) return row[idx];
                                        }
                                        return null;
                                      };

                                      const nameVal = getRawVal(['PRODUCT NAME', 'NAME', 'ITEM', 'DESCRIPTION']);
                                      if (!nameVal) return null; 

                                      const nameStr = nameVal.toString().trim();
                                      // Skip if the name is just a header name
                                      if (possibleHeaders.includes(nameStr.toUpperCase())) return null;

                                      // Clean number helper
                                      const cleanNum = (val: any) => {
                                        if (val === null || val === undefined || val === '') return 0;
                                        if (typeof val === 'number') return val;
                                        const cleaned = val.toString().replace(/[₹%,]/g, '').trim();
                                        const parsed = parseFloat(cleaned);
                                        return isNaN(parsed) ? 0 : parsed;
                                      };

                                      return {
                                        name: nameStr,
                                        productCode: (getRawVal(['PRODUCT CODE', 'CODE', 'SKU', 'ITEM CODE', 'PRODUCTCODE']) || '').toString().trim(),
                                        price: cleanNum(getRawVal(['RATE', 'PRICE', 'SELLING PRICE', 'UNIT PRICE', 'MRP'])), // Fallback to MRP if RATE not found
                                        category: (getRawVal(['CATEGORY', 'TYPE', 'GROUP', 'CAT']) || 'General').toString().trim(),
                                        stock: cleanNum(getRawVal(['QTY', 'STOCK', 'QUANTITY', 'QTY IN STOCK'])) || 100,
                                        boxSize: (getRawVal(['BOX SIZE', 'PACK SIZE', 'UOM', 'PACKING']) || '').toString().trim(),
                                        hsn: (getRawVal(['HSN', 'HSN CODE', 'HSN/SAC', 'HSNSAC']) || '').toString().trim(),
                                        gst: cleanNum(getRawVal(['GST', 'TAX', 'GST %', 'TAX RATE'])),
                                        mrp: cleanNum(getRawVal(['MRP', 'MAX PRICE', 'LIST PRICE'])),
                                        image: (getRawVal(['IMAGE', 'PHOTO', 'URL', 'PIC']) || '').toString().trim()
                                      };
                                    })
                                    .filter(item => item !== null && item.name && !possibleHeaders.includes(item.name.toUpperCase())); 

                                  if (formatted.length === 0) {
                                    alert("No valid products found after parsing.");
                                    return;
                                  }

                                  if (window.confirm(`Found ${formatted.length} products. Replace current catalog?`)) {
                                    const res = await api.post('/admin/upload-products', { products: formatted });
                                    alert(res.data.message);
                                    fetchProducts();
                                  }
                                } catch (err: any) {
                                  const errorMsg = err.response?.data?.error || err.message || "Unknown error during upload";
                                  alert(`Upload Failed: ${errorMsg}`);
                                  console.error("Upload error details:", err);
                                }
                              };
                              reader.readAsBinaryString(file);
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product & Code</th>
                            <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Category</th>
                            <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">HSN</th>
                            <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Box Size</th>
                            <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">MRP</th>
                            <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Rate</th>
                            <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">GST %</th>
                            <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">QTY</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {products.map(product => (
                            <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-8 py-6">
                                <p className="font-bold text-slate-800">{product.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{product.productCode || 'No Code'}</p>
                              </td>
                              <td className="px-4 py-6 text-center">
                                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">{product.category}</span>
                              </td>
                              <td className="px-4 py-6 text-center text-sm font-bold text-slate-600">{product.hsn || '-'}</td>
                              <td className="px-4 py-6 text-center text-sm font-bold text-slate-600">{product.boxSize || '-'}</td>
                              <td className="px-4 py-6 text-right font-black text-slate-800">₹{product.mrp || 0}</td>
                              <td className="px-4 py-6 text-right font-black text-poppik-green">₹{product.price}</td>
                              <td className="px-4 py-6 text-center font-bold text-slate-600">{product.gst || 0}%</td>
                              <td className="px-4 py-6 text-center font-bold text-slate-500">{product.stock}</td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <button 
                                    onClick={() => setEditingProduct(product)}
                                    className="p-2 text-slate-400 hover:text-poppik-green hover:bg-green-50 rounded-lg transition-all"
                                  >
                                    <Pencil className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (window.confirm(`Delete ${product.name}?`)) {
                                        try {
                                          await api.delete(`/admin/products/${product.id}`);
                                          fetchProducts();
                                        } catch (err) { alert("Delete failed"); }
                                      }
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'adminDashboard' && (
              <ScreenWrapper title="Admin Dashboard" user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')}>
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard icon={<User className="text-blue-600" />} value={adminStats?.userCount?.toString() || '0'} label="Total Users" sub="Admin & Sales" trend="System" />
                        <StatCard icon={<ShoppingCart className="text-orange-600" />} value={adminStats?.orderCount?.toString() || '0'} label="Total Orders" sub="All time" trend="System" />
                        <StatCard icon={<Store className="text-poppik-gold" />} value={adminStats?.outletCount?.toString() || '0'} label="Total Shops" sub="In network" trend="System" />
                    </div>

                    <AdminDashboardView token={token} />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                          <h3 className="text-xl font-bold mb-6 flex items-center"><Target className="w-6 h-6 mr-3 text-poppik-green" /> Quick Admin Actions</h3>
                          <div className="grid grid-cols-1 gap-4">
                            <button onClick={() => setCurrentScreen('adminUsers')} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-poppik-beige transition-all group border border-slate-100">
                                <div className="flex items-center space-x-4">
                                  <div className="bg-white p-3 rounded-xl shadow-sm"><User className="w-6 h-6 text-poppik-green" /></div>
                                  <div className="text-left"><p className="font-bold text-slate-800">Manage Team</p><p className="text-sm text-slate-500">View and edit team members</p></div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 transition-all" />
                            </button>
                            <button onClick={() => setCurrentScreen('adminReports')} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-poppik-beige transition-all group border border-slate-100">
                                <div className="flex items-center space-x-4">
                                  <div className="bg-white p-3 rounded-xl shadow-sm"><BarChart3 className="w-6 h-6 text-poppik-green" /></div>
                                  <div className="text-left"><p className="font-bold text-slate-800">Sales Reports</p><p className="text-sm text-slate-500">Deep analysis of salesmen performance</p></div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 transition-all" />
                            </button>
                            <button onClick={() => setCurrentScreen('adminLeaves')} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-poppik-beige transition-all group border border-slate-100">
                                <div className="flex items-center space-x-4">
                                  <div className="bg-white p-3 rounded-xl shadow-sm"><Calendar className="w-6 h-6 text-poppik-green" /></div>
                                  <div className="text-left"><p className="font-bold text-slate-800">Leave Requests</p><p className="text-sm text-slate-500">Approve or reject leave applications</p></div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 transition-all" />
                            </button>
                          </div>
                      </div>
                    </div>
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'adminReports' && (
              <ScreenWrapper title="Sales Performance Analysis" showBack backAction={() => setCurrentScreen('adminDashboard')} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')}>
                <div className="space-y-8">
                   {adminReports.map(salesman => (
                     <div key={salesman.id} className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                           <div className="flex items-center space-x-4">
                              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100"><User className="w-8 h-8 text-poppik-green" /></div>
                              <div><h3 className="text-2xl font-black text-slate-800">{salesman.name}</h3><p className="text-slate-500 font-bold">{salesman.phone}</p></div>
                           </div>
                           <div className="flex gap-4">
                              <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm text-center"><p className="text-[10px] font-black text-slate-400 uppercase">Total Revenue</p><p className="text-xl font-black text-poppik-green">₹{salesman.totalRevenue.toLocaleString()}</p></div>
                              <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm text-center"><p className="text-[10px] font-black text-slate-400 uppercase">Outlets Covered</p><p className="text-xl font-black text-slate-800">{salesman.uniqueOutlets}</p></div>
                           </div>
                        </div>
                        <div className="p-8">
                           <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Recent Outlet Orders & Activity</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {salesman.recentOrders.map(order => (
                                <div key={order.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                                   <div><p className="font-bold text-slate-800">{order.outletName}</p><p className="text-xs text-slate-400">{new Date(order.date).toLocaleDateString()}</p></div>
                                   <div className="text-right"><p className="font-black text-slate-800">₹{order.amount}</p><p className="text-[10px] font-bold text-poppik-green uppercase">Success</p></div>
                                </div>
                              ))}
                              {salesman.recentOrders.length === 0 && <p className="col-span-full text-slate-400 text-sm italic text-center py-4">No activity recorded yet</p>}
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'adminLeaves' && (
              <ScreenWrapper title="Leave Requests Management" showBack backAction={() => setCurrentScreen('adminDashboard')} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')}>
                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="pb-4 font-black text-slate-400 uppercase text-xs">Salesman</th>
                            <th className="pb-4 font-black text-slate-400 uppercase text-xs">Duration</th>
                            <th className="pb-4 font-black text-slate-400 uppercase text-xs">Reason</th>
                            <th className="pb-4 font-black text-slate-400 uppercase text-xs">Status</th>
                            <th className="pb-4 font-black text-slate-400 uppercase text-xs">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {adminLeaves.map(leave => (
                            <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-6 font-bold text-slate-800">{leave.user?.name}</td>
                              <td className="py-6">
                                <p className="font-bold text-slate-700 text-sm">{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Leave Duration</p>
                              </td>
                              <td className="py-6 text-sm text-slate-600 max-w-xs truncate">{leave.reason}</td>
                              <td className="py-6">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                  leave.status === 'Approved' ? 'bg-green-100 text-poppik-green' :
                                  leave.status === 'Rejected' ? 'bg-red-100 text-red-500' :
                                  'bg-orange-100 text-orange-500'
                                }`}>
                                  {leave.status}
                                </span>
                              </td>
                              <td className="py-6">
                                {leave.status === 'Pending' && (
                                  <div className="flex items-center space-x-2">
                                    <button 
                                      onClick={async () => {
                                        try {
                                          await api.put(`/admin/leaves/${leave.id}`, { status: 'Approved' });
                                          fetchAdminLeaves();
                                        } catch (err) { alert("Failed to approve"); }
                                      }}
                                      className="p-2 bg-green-50 text-poppik-green rounded-xl hover:bg-green-100 transition-all"
                                    >
                                      <ShieldCheck size={20} />
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        try {
                                          await api.put(`/admin/leaves/${leave.id}`, { status: 'Rejected' });
                                          fetchAdminLeaves();
                                        } catch (err) { alert("Failed to reject"); }
                                      }}
                                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                                    >
                                      <X size={20} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                          {adminLeaves.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-slate-400 font-bold italic">No leave applications to manage</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'adminUsers' && (
              <ScreenWrapper title="User Management" showBack backAction={() => setCurrentScreen('adminDashboard')} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')}>
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-800">Team Members</h3>
                            <button onClick={() => { setLoginForm({ phone: '', password: '', name: '', role: 'sales' }); setCurrentScreen('adminAddUser'); }} className="px-6 py-3 bg-poppik-green text-white font-bold rounded-xl flex items-center space-x-2 hover:scale-105 transition-all shadow-lg shadow-green-900/10">
                                <Plus className="w-5 h-5" /><span>Add Member</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="pb-4 font-black text-slate-400 uppercase text-xs">Name</th>
                                        <th className="pb-4 font-black text-slate-400 uppercase text-xs">Phone</th>
                                        <th className="pb-4 font-black text-slate-400 uppercase text-xs">Role</th>
                                        <th className="pb-4 font-black text-slate-400 uppercase text-xs">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {adminUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 font-bold text-slate-700">{u.name}</td>
                                            <td className="py-4 text-slate-500 font-medium">{u.phone}</td>
                                            <td className="py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center space-x-2">
                                                  <button onClick={() => { setEditingUser(u); setCurrentScreen('adminEditUser'); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                                                    <Pencil className="w-5 h-5" />
                                                  </button>
                                                  {u.id !== user?.id && (
                                                    <button onClick={() => deleteUser(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                                      <X className="w-5 h-5" />
                                                    </button>
                                                  )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'adminAddUser' && (
              <ScreenWrapper title="Add New Member" showBack backAction={() => setCurrentScreen('adminUsers')} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api} onProfileClick={() => setCurrentScreen('profile')}>
                <div className="max-w-2xl mx-auto bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                  <form onSubmit={handleRegister} className="space-y-6">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Full Name</label>
                        <input 
                          type="text" 
                          value={loginForm.name}
                          onChange={e => setLoginForm({...loginForm, name: e.target.value})}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" 
                          placeholder="Enter full name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Phone Number</label>
                        <input 
                          type="text" 
                          value={loginForm.phone}
                          onChange={e => setLoginForm({...loginForm, phone: e.target.value})}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" 
                          placeholder="Enter phone"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Password</label>
                        <input 
                          type="password" 
                          value={loginForm.password}
                          onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" 
                          placeholder="Set initial password"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Account Role</label>
                        <select 
                          value={loginForm.role}
                          onChange={e => setLoginForm({...loginForm, role: e.target.value})}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold appearance-none"
                        >
                          <option value="sales">Sales Associate</option>
                          <option value="admin">Admin Manager</option>
                        </select>
                      </div>
                      <button type="submit" className="w-full py-5 bg-poppik-green text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                        Create Member Account
                      </button>
                  </form>
                </div>
              </ScreenWrapper>
            )}

            {currentScreen === 'adminEditUser' && (
              <ScreenWrapper title="Edit Member" showBack backAction={() => setCurrentScreen('adminUsers')} user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isOnline={isOnline} pendingSyncCount={pendingOrders.length} notifications={notifications} setNotifications={setNotifications} onSync={syncOrders} api={api}>
                <div className="max-w-2xl mx-auto bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                  <form onSubmit={handleUpdateUser} className="space-y-6">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Full Name</label>
                        <input 
                          type="text" 
                          value={editingUser?.name || ''}
                          onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" 
                          placeholder="Enter full name"
                          required
                        />
                      </div>
                      <div>
                 <label className="block text-xs font-black text-slate-400 uppercase mb-2">Phone Number</label>
                 <input 
                   type="text" 
                   value={editingUser?.phone || ''}
                   onChange={e => setEditingUser({...editingUser, phone: e.target.value})}
                   className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" 
                   placeholder="Enter phone"
                   required
                 />
              </div>
              <div>
                 <label className="block text-xs font-black text-slate-400 uppercase mb-2">New Password (Leave blank to keep same)</label>
                 <input 
                   type="password" 
                   value={editingUser?.password || ''}
                   onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                   className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" 
                   placeholder="••••••••"
                 />
              </div>
              <div>
                 <label className="block text-xs font-black text-slate-400 uppercase mb-2">Account Role</label>
                        <select 
                          value={editingUser?.role || 'sales'}
                          onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold appearance-none"
                        >
                          <option value="sales">Sales Associate</option>
                          <option value="admin">Admin Manager</option>
                        </select>
                      </div>
                      <button type="submit" className="w-full py-5 bg-poppik-green text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                        Update Member Details
                      </button>
                  </form>
                </div>
              </ScreenWrapper>
            )}
         </div>
      </div>

      <div className="h-20 bg-white border-t border-slate-200 flex items-center justify-around px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] sticky bottom-0 z-[1030] md:hidden">
        {user?.role === 'admin' ? (
          <>
            <BottomNavItem icon={<BarChart3 />} label="Admin" screen="adminDashboard" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
            <BottomNavItem icon={<User />} label="Users" screen="adminUsers" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
            <BottomNavItem icon={<Calendar />} label="Leaves" screen="adminLeaves" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
            <BottomNavItem icon={<BarChart3 />} label="Stats" screen="adminReports" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
          </>
        ) : (
          <>
            <BottomNavItem icon={<Home />} label="Home" screen="dashboard" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
            <BottomNavItem icon={<Clock />} label="Attend" screen="attendance" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
            <BottomNavItem icon={<ShoppingCart />} label="Visit" screen="createOrder" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
            <BottomNavItem icon={<BarChart3 />} label="Reports" screen="reports" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
          </>
        )}
        <BottomNavItem icon={<User />} label="Profile" screen="profile" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
      </div>

      {/* Order Detail Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Order Details</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Order #{viewingOrder.id} • {new Date(viewingOrder.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setViewingOrder(null)} className="p-3 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Outlet Info */}
              <div className="mb-8 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Customer Information</h4>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                    <Store className="w-6 h-6 text-poppik-green" />
                  </div>
                  <div>
                    <p className="font-black text-lg text-slate-800">{viewingOrder.outlet.name}</p>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{viewingOrder.outlet.address}</p>
                    {viewingOrder.outlet.owner_no && <p className="text-sm text-slate-500 font-bold mt-2 flex items-center"><Phone className="w-3.5 h-3.5 mr-2" /> {viewingOrder.outlet.owner_no}</p>}
                    {viewingOrder.outlet.gstNumber && <p className="text-sm text-slate-500 font-bold mt-1 flex items-center"><ShieldCheck className="w-3.5 h-3.5 mr-2" /> GST: {viewingOrder.outlet.gstNumber}</p>}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Order Items</h4>
                {viewingOrder.orderItems?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-poppik-green text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{item.product?.name || 'Unknown Product'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.product?.productCode || 'No Code'} • {item.product?.boxSize || 'Standard'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-800">₹{item.priceAtTime} × {item.quantity}</p>
                      <p className="text-xs font-black text-poppik-green mt-0.5">₹{(item.priceAtTime * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-8 pt-8 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold text-slate-500">Grand Total</p>
                  <p className="text-3xl font-black text-poppik-green">₹{viewingOrder.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); shareOnWhatsApp(viewingOrder); setViewingOrder(null); }}
                className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl shadow-lg shadow-green-900/20 hover:bg-green-600 transition-all flex items-center justify-center space-x-2"
              >
                <MessageCircle size={20} />
                <span>Share on WhatsApp</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); generateInvoice(viewingOrder); setViewingOrder(null); }}
                className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center space-x-2"
              >
                <FileText size={20} />
                <span>Download Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800">Edit Product</h3>
              <button onClick={() => setEditingProduct(null)} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
            </div>
            <form className="space-y-6" onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.put(`/admin/products/${editingProduct.id}`, editingProduct);
                alert("Product updated successfully!");
                setEditingProduct(null);
                fetchProducts();
              } catch (err) { alert("Update failed"); }
            }}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Product Name</label>
                  <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" required />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Product Code</label>
                  <input type="text" value={editingProduct.productCode || ''} onChange={e => setEditingProduct({...editingProduct, productCode: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Category</label>
                  <input type="text" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" required />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Box Size</label>
                  <input type="text" value={editingProduct.boxSize || ''} onChange={e => setEditingProduct({...editingProduct, boxSize: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">MRP (₹)</label>
                  <input type="number" value={editingProduct.mrp || 0} onChange={e => setEditingProduct({...editingProduct, mrp: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Rate (₹)</label>
                  <input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" required />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Stock</label>
                  <input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">HSN Code</label>
                  <input type="text" value={editingProduct.hsn || ''} onChange={e => setEditingProduct({...editingProduct, hsn: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">GST (%)</label>
                  <input type="number" value={editingProduct.gst || 0} onChange={e => setEditingProduct({...editingProduct, gst: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-poppik-green/10 outline-none transition-all font-bold" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-poppik-green text-white font-black rounded-2xl shadow-xl shadow-green-900/20 hover:scale-[1.02] active:scale-95 transition-all">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoppikSFA;
