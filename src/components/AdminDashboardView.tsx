import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AlertTriangle, Map as MapIcon, BarChart3, Package, Clock } from 'lucide-react';
import axios from 'axios';

// Fix Leaflet marker icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const API_BASE = '/api';

interface AdminDashboardViewProps {
  token: string | null;
}

const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ token }) => {
  const [liveUsers, setLiveUsers] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const api = React.useMemo(() => axios.create({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const fetchData = async () => {
    try {
      // Use individual try-catch or settled promises to prevent one failure from blocking all data
      const results = await Promise.allSettled([
        api.get(`${API_BASE}/admin/live-map`),
        api.get(`${API_BASE}/admin/sales-analytics`),
        api.get(`${API_BASE}/admin/inventory-alerts`)
      ]);

      if (results[0].status === 'fulfilled') setLiveUsers(results[0].value.data);
      if (results[1].status === 'fulfilled') setSalesData(results[1].value.data);
      if (results[2].status === 'fulfilled') setInventoryAlerts(results[2].value.data);
      
    } catch (err) {
      console.error("Error fetching admin view data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [token]);

  const chartData = {
    labels: (salesData || []).map(d => d.name || 'Unknown'),
    datasets: [
      {
        label: 'Units Sold',
        data: (salesData || []).map(d => d.totalSold || 0),
        backgroundColor: 'rgba(45, 90, 39, 0.7)',
        borderColor: 'rgba(45, 90, 39, 1)',
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poppik-green"></div></div>;

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center">
            <MapIcon className="w-6 h-6 mr-3 text-poppik-green" /> Live Field Map
          </h3>
          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
            Live • {liveUsers.length} Active
          </span>
        </div>
        <div className="h-[400px] rounded-2xl overflow-hidden border border-slate-100 shadow-inner z-0">
          <MapContainer center={[26.9124, 75.7873]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {liveUsers.map(user => (
              user.latitude && user.longitude && (
                <Marker key={user.id} position={[user.latitude, user.longitude]}>
                  <Popup>
                    <div className="p-2">
                      <p className="font-black text-slate-800 text-lg">{user.name}</p>
                      <p className="text-sm text-slate-500 font-bold">{user.phone}</p>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center text-xs text-poppik-green font-black">
                        <Clock className="w-3 h-3 mr-1" /> Punched In: {new Date(user.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Analytics Chart */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center">
            <BarChart3 className="w-6 h-6 mr-3 text-poppik-green" /> Top Selling Products
          </h3>
          <div className="h-64">
            {salesData.length > 0 ? (
              <Bar 
                data={chartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
                }} 
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">No sales data yet</div>
            )}
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center">
            <Package className="w-6 h-6 mr-3 text-poppik-green" /> Inventory Alerts
          </h3>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {inventoryAlerts.length > 0 ? inventoryAlerts.map(product => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100 group hover:bg-red-100 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-xl text-red-500 shadow-sm group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-slate-800">{product.name}</p>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Low Stock Warning</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-red-600">{product.stock}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Remaining</p>
                </div>
              </div>
            )) : (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Package className="w-12 h-12 mb-2 opacity-20" />
                <p className="font-bold">All products in stock</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardView;
