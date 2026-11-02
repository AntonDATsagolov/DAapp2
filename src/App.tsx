import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './lib/supabase';

// ============================================================
// ТИПЫ И КОНСТАНТЫ
// ============================================================
type AppType = 'select' | 'client' | 'driver' | 'business';
const SHIELI: [number, number] = [44.1676, 66.7369];

// ============================================================
// ЭКРАН ВЫБОРА ПРИЛОЖЕНИЯ
// ============================================================
function AppSelector({ onSelect }: { onSelect: (app: AppType) => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-3xl font-bold mb-4 shadow-lg shadow-emerald-500/20">DA</div>
      <h1 className="text-2xl font-bold mb-1">DAapp</h1>
      <p className="text-sm text-slate-400 mb-8 text-center">Цифровая экосистема посёлка Шиели</p>

      <div className="w-full max-w-sm space-y-3">
        <button onClick={() => onSelect('client')} className="w-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-2xl p-5 text-left active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-4">
            <span className="text-4xl">📱</span>
            <div>
              <h2 className="text-base font-bold text-blue-300">Для жителей и гостей</h2>
              <p className="text-xs text-slate-400 mt-0.5">Карта, такси, магазины, салоны, отели</p>
            </div>
          </div>
        </button>

        <button onClick={() => onSelect('driver')} className="w-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-5 text-left active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🚗</span>
            <div>
              <h2 className="text-base font-bold text-yellow-300">Для таксистов</h2>
              <p className="text-xs text-slate-400 mt-0.5">Приём заказов, выбор маршрутов</p>
            </div>
          </div>
        </button>

        <button onClick={() => onSelect('business')} className="w-full bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-2xl p-5 text-left active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🏪</span>
            <div>
              <h2 className="text-base font-bold text-pink-300">Для бизнеса</h2>
              <p className="text-xs text-slate-400 mt-0.5">Товары, заказы, доставка</p>
            </div>
          </div>
        </button>
      </div>

      <p className="text-[10px] text-slate-600 mt-8">v1.0 • Шиели, Кызылординская обл.</p>
    </div>
  );
}

// ============================================================
// ОБЩИЙ КОМПОНЕНТ РЕГИСТРАЦИИ
// ============================================================
function AuthScreen({ appType, onAuth }: { appType: 'client' | 'driver' | 'business'; onAuth: (userId: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('passenger');
  const [businessType, setBusinessType] = useState('cafe');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const titles = { client: '📱 Клиент', driver: '🚗 Таксист', business: '🏪 Бизнес' };
  const colors = { client: 'from-blue-500 to-indigo-600', driver: 'from-yellow-500 to-orange-600', business: 'from-pink-500 to-rose-600' };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        const role = appType === 'client' ? 'client' : appType === 'driver' ? 'driver' : 'business_owner';
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone_number: phone,
              role,
              vehicle_type: appType === 'driver' ? vehicleType : null,
              business_type: appType === 'business' ? businessType : null,
              business_name: appType === 'business' ? businessName : null,
            },
          },
        });
        if (authError) throw authError;

        // Обновляем профиль
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: name,
            phone_number: phone,
            role,
            driver_vehicle_type: appType === 'driver' ? vehicleType : null,
          });

          // Если бизнес — создаём запись
          if (appType === 'business' && businessName) {
            await supabase.from('businesses').insert({
              owner_id: data.user.id,
              name: businessName,
              business_type: businessType,
              address: 'Шиели',
              whatsapp_number: phone,
              latitude: SHIELI[0] + (Math.random() - 0.5) * 0.01,
              longitude: SHIELI[1] + (Math.random() - 0.5) * 0.01,
              is_open: true,
            });
          }

          onAuth(data.user.id);
        }
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        if (data.user) onAuth(data.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      <div className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[appType]} flex items-center justify-center text-sm font-bold`}>DA</div>
        <div>
          <h1 className="text-sm font-bold">{titles[appType]}</h1>
          <p className="text-[10px] text-slate-400">{mode === 'login' ? 'Вход' : 'Регистрация'}</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
        {/* Переключатель */}
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
          <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-md text-xs font-medium ${mode === 'login' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>Вход</button>
          <button onClick={() => setMode('register')} className={`flex-1 py-2 rounded-md text-xs font-medium ${mode === 'register' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>Регистрация</button>
        </div>

        {mode === 'register' && (
          <>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Имя</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Телефон</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 701 123 45 67" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500" />
            </div>
          </>
        )}

        <div>
          <label className="text-[10px] text-slate-400 mb-1 block">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500" />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 mb-1 block">Пароль</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500" />
        </div>

        {/* Специфичные поля */}
        {mode === 'register' && appType === 'driver' && (
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">Тип транспорта</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ t: 'passenger', i: '🚗', l: 'Легковой' }, { t: 'minivan', i: '🚐', l: 'Минивэн' }, { t: 'cargo', i: '🚚', l: 'Грузовой' }].map(v => (
                <button key={v.t} onClick={() => setVehicleType(v.t)} className={`p-2 rounded-lg border-2 text-center ${vehicleType === v.t ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}`}>
                  <div className="text-xl">{v.i}</div><div className="text-[10px]">{v.l}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'register' && appType === 'business' && (
          <>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Название бизнеса</label>
              <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Например: Кафе Дастархан" className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">Тип бизнеса</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[{ t: 'cafe', i: '☕', l: 'Кафе' }, { t: 'shop', i: '🛒', l: 'Магазин' }, { t: 'beauty', i: '💇', l: 'Салон' }, { t: 'hotel', i: '🏨', l: 'Отель' }].map(b => (
                  <button key={b.t} onClick={() => setBusinessType(b.t)} className={`p-2 rounded-lg border-2 text-center ${businessType === b.t ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}`}>
                    <div className="text-lg">{b.i}</div><div className="text-[9px]">{b.l}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">{error}</div>}

        <button onClick={handleSubmit} disabled={loading} className={`w-full py-3 bg-gradient-to-r ${colors[appType]} rounded-xl text-sm font-bold disabled:opacity-50`}>
          {loading ? '⏳' : mode === 'login' ? '🔑 Войти' : '✅ Зарегистрироваться'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 📱 КЛИЕНТСКОЕ ПРИЛОЖЕНИЕ
// ============================================================
function ClientApp({ userId, onLogout }: { userId: string; onLogout: () => void }) {
  const [screen, setScreen] = useState<'home' | 'map' | 'taxi' | 'shops' | 'booking' | 'rideshare'>('home');
  const [businesses, setBusinesses] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('businesses').select('*').eq('is_open', true).then(({ data }) => setBusinesses(data || []));
  }, []);

  if (screen === 'map') return <ClientMap businesses={businesses} onBack={() => setScreen('home')} />;
  if (screen === 'taxi') return <ClientTaxi userId={userId} onBack={() => setScreen('home')} />;
  if (screen === 'shops') return <ClientShops businesses={businesses.filter(b => ['cafe', 'shop'].includes(b.business_type))} onBack={() => setScreen('home')} />;
  if (screen === 'booking') return <ClientBooking businesses={businesses.filter(b => ['beauty', 'hotel'].includes(b.business_type))} onBack={() => setScreen('home')} />;
  if (screen === 'rideshare') return <ClientRideshare userId={userId} onBack={() => setScreen('home')} />;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      {/* Шапка */}
      <div className="bg-slate-900 px-3 py-2 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-xs font-bold">DA</div>
            <div><div className="text-xs font-bold">DAapp</div><div className="text-[10px] text-slate-400">📍 Шиели</div></div>
          </div>
          <button onClick={onLogout} className="text-[10px] text-slate-500">Выйти</button>
        </div>
      </div>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-16">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setScreen('map')} className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-3 text-left active:scale-95 transition-transform">
            <div className="text-2xl mb-1">🗺️</div><div className="text-xs font-bold">Карта</div><div className="text-[9px] opacity-70">{businesses.length} мест</div>
          </button>
          <button onClick={() => setScreen('taxi')} className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-3 text-left active:scale-95 transition-transform">
            <div className="text-2xl mb-1">🚕</div><div className="text-xs font-bold">Такси</div><div className="text-[9px] opacity-70">Заказать</div>
          </button>
          <button onClick={() => setScreen('shops')} className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-3 text-left active:scale-95 transition-transform">
            <div className="text-2xl mb-1">🛒</div><div className="text-xs font-bold">Магазины</div><div className="text-[9px] opacity-70">Витрины</div>
          </button>
          <button onClick={() => setScreen('booking')} className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-3 text-left active:scale-95 transition-transform">
            <div className="text-2xl mb-1">📅</div><div className="text-xs font-bold">Запись</div><div className="text-[9px] opacity-70">Салоны, отели</div>
          </button>
          <button onClick={() => setScreen('rideshare')} className="bg-gradient-to-br from-teal-500 to-green-600 rounded-xl p-3 text-left active:scale-95 transition-transform col-span-2">
            <div className="text-2xl mb-1">🚌</div><div className="text-xs font-bold">Попутчики</div><div className="text-[9px] opacity-70">Межгород</div>
          </button>
        </div>
      </div>

      {/* Нижняя навигация */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700/50 flex justify-around py-1.5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button onClick={() => setScreen('home')} className="flex flex-col items-center gap-0.5 flex-1 text-blue-400"><span className="text-lg">🏠</span><span className="text-[9px]">Главная</span></button>
        <button onClick={() => setScreen('map')} className="flex flex-col items-center gap-0.5 flex-1 text-slate-500"><span className="text-lg">🗺️</span><span className="text-[9px]">Карта</span></button>
        <button onClick={() => setScreen('taxi')} className="flex flex-col items-center gap-0.5 flex-1"><div className="w-10 h-10 -mt-5 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg"><span className="text-lg">🚕</span></div><span className="text-[9px]">Такси</span></button>
        <button onClick={() => setScreen('shops')} className="flex flex-col items-center gap-0.5 flex-1 text-slate-500"><span className="text-lg">🛒</span><span className="text-[9px]">Магазины</span></button>
      </nav>
    </div>
  );
}

// --- Карта клиента ---
function ClientMap({ businesses, onBack }: { businesses: any[]; onBack: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState('all');
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'driver').eq('is_on_shift', true).then(({ data }) => setDrivers(data || []));
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { center: SHIELI, zoom: 14, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const cats: any = { cafe: { i: '☕', c: '#f59e0b' }, shop: { i: '🛒', c: '#10b981' }, beauty: { i: '💇', c: '#ec4899' }, hotel: { i: '🏨', c: '#3b82f6' } };
    const filtered = filter === 'all' ? businesses : businesses.filter(b => b.business_type === filter);

    filtered.forEach((b: any) => {
      if (!b.latitude || !b.longitude) return;
      const cat = cats[b.business_type] || { i: '📍', c: '#6b7280' };
      const icon = L.divIcon({
        html: `<div style="width:32px;height:38px"><svg width="32" height="38"><path d="M16 0C7 0 0 7 0 16c0 12 16 22 16 22s16-10 16-22C32 7 25 0 16 0z" fill="${cat.c}" stroke="white" stroke-width="1.5"/><circle cx="16" cy="15" r="9" fill="white"/><text x="16" y="19" text-anchor="middle" font-size="11">${cat.i}</text></svg></div>`,
        className: '', iconSize: [32, 38], iconAnchor: [16, 38], popupAnchor: [0, -38],
      });
      const wa = b.whatsapp_number ? `<a href="https://wa.me/${b.whatsapp_number?.replace(/[^0-9]/g, '')}" target="_blank" style="display:inline-block;padding:4px 8px;background:#25d366;color:white;border-radius:4px;text-decoration:none;font-size:11px;margin-right:4px">💬 WhatsApp</a>` : '';
      L.marker([b.latitude, b.longitude], { icon }).bindPopup(`<b>${b.name}</b><br/><small>${b.address}</small><br/>${wa}<a href="tel:${b.whatsapp_number}" style="display:inline-block;padding:4px 8px;background:#3b82f6;color:white;border-radius:4px;text-decoration:none;font-size:11px">📞 Звонок</a>`).addTo(map);
    });

    // Маркеры водителей "на смене"
    drivers.forEach((d: any) => {
      if (!d.current_location) return;
      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:#eab308;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🚗</div>`,
        className: '', iconSize: [28, 28], iconAnchor: [14, 14],
      });
      L.marker([SHIELI[0] + (Math.random() - 0.5) * 0.01, SHIELI[1] + (Math.random() - 0.5) * 0.01], { icon }).bindPopup(`🚗 Свободный водитель<br/><small>${d.current_location}</small>`).addTo(map);
    });

    return () => { map.remove(); };
  }, [businesses, filter, drivers]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900">
      <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 border-b border-slate-700 z-[1000]">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm">←</button>
        <span className="text-xs font-bold text-white">🗺️ Карта Шиели</span>
        {drivers.length > 0 && <span className="text-[10px] text-yellow-300 ml-auto">🚗 {drivers.length} на линии</span>}
      </div>
      <div ref={mapRef} className="flex-1" />
      <div className="bg-slate-900 px-2 py-2 border-t border-slate-700 flex gap-1 overflow-x-auto" style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}>
        {[{ id: 'all', i: '🗺️', l: 'Все' }, { id: 'cafe', i: '☕', l: 'Кафе' }, { id: 'shop', i: '🛒', l: 'Магазины' }, { id: 'beauty', i: '💇', l: 'Салоны' }, { id: 'hotel', i: '🏨', l: 'Отели' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium ${filter === f.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
            <span>{f.i}</span><span>{f.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Такси клиента ---
function ClientTaxi({ userId, onBack }: { userId: string; onBack: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'searching' | 'offers' | 'done'>('idle');
  const [vehicle, setVehicle] = useState('passenger');
  const [pickup, setPickup] = useState('');
  const [price, setPrice] = useState(500);
  const [offers, setOffers] = useState<any[]>([]);

  const vehicles = [{ t: 'passenger', i: '🚗', l: 'Легковой', p: 500 }, { t: 'minivan', i: '🚐', l: 'Минивэн', p: 800 }, { t: 'cargo', i: '🚚', l: 'Грузовой', p: 1200 }];

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { center: SHIELI, zoom: 14 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      setPickup(`${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
      L.marker(e.latlng).addTo(map);
    });
    return () => { map.remove(); };
  }, []);

  const order = async () => {
    if (!pickup) return alert('Кликните по карте для адреса подачи');
    setStatus('searching');
    await supabase.from('taxi_orders').insert({
      client_id: userId, pickup_address: pickup, dropoff_address: 'Центр Шиели',
      required_vehicle_type: vehicle, price, status: 'searching',
      pickup_lat: SHIELI[0], pickup_lng: SHIELI[1], dropoff_lat: SHIELI[0] + 0.005, dropoff_lng: SHIELI[1] + 0.005,
    });
    setTimeout(() => {
      setStatus('offers');
      setOffers([{ name: 'Асан К.', price: price - 50 }, { name: 'Болат М.', price }, { name: 'Ерлан Т.', price: price + 100 }]);
    }, 2000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 border-b border-slate-700">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm">←</button>
        <span className="text-xs font-bold">🚕 Такси</span>
      </div>
      <div ref={mapRef} className="h-36" />
      {status === 'idle' && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          <input readOnly value={pickup} placeholder="📍 Кликните по карте" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white" />
          <div className="grid grid-cols-3 gap-1.5">
            {vehicles.map(v => (
              <button key={v.t} onClick={() => { setVehicle(v.t); setPrice(v.p); }} className={`p-2 rounded-lg border-2 text-center ${vehicle === v.t ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}`}>
                <div className="text-lg">{v.i}</div><div className="text-[9px]">{v.l}</div>
              </button>
            ))}
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/30 flex justify-between"><span className="text-xs">Примерно</span><span className="text-base font-bold text-emerald-300">{price} ₸</span></div>
          <button onClick={order} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl text-sm font-bold">🚕 Заказать</button>
        </div>
      )}
      {status === 'searching' && <div className="flex-1 flex items-center justify-center"><div className="text-center"><div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="text-xs text-slate-400 mt-2">Поиск водителя...</p></div></div>}
      {status === 'offers' && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          <div className="text-center text-xs text-yellow-300 mb-2">🎉 Водители предлагают цену!</div>
          {offers.map((o, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex items-center justify-between">
              <div><div className="text-xs font-bold">{o.name}</div></div>
              <div className="flex items-center gap-2"><span className="text-sm font-bold text-emerald-300">{o.price} ₸</span><button onClick={() => setStatus('done')} className="px-3 py-1 bg-emerald-500 rounded text-[10px] font-bold">✅</button></div>
            </div>
          ))}
        </div>
      )}
      {status === 'done' && <div className="flex-1 flex items-center justify-center"><div className="text-center"><div className="text-3xl mb-2">✅</div><p className="text-xs mb-3">Водитель в пути!</p><button onClick={() => { setStatus('idle'); setPickup(''); }} className="px-4 py-2 bg-emerald-500 rounded-lg text-xs font-bold">Новый заказ</button></div></div>}
    </div>
  );
}

// --- Магазины клиента ---
function ClientShops({ businesses, onBack }: { businesses: any[]; onBack: () => void }) {
  const [selected, setSelected] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);

  const select = async (b: any) => {
    setSelected(b);
    const { data } = await supabase.from('catalog_items').select('*').eq('business_id', b.id).eq('is_available', true);
    setCatalog(data || []);
  };

  const addCart = (item: any) => {
    setCart(p => { const e = p.find(i => i.id === item.id); return e ? p.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) : [...p, { ...item, qty: 1 }]; });
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const orderWA = () => {
    if (!selected) return;
    const text = `Заказ DAapp:\n${selected.name}\n\n${cart.map(i => `• ${i.title} x${i.qty} = ${i.price * i.qty}₸`).join('\n')}\n\nИтого: ${total}₸`;
    const phone = selected.whatsapp_number?.replace(/[^0-9]/g, '');
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    setCart([]);
  };

  if (!selected) {
    return (
      <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
        <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 border-b border-slate-700">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm">←</button>
          <span className="text-xs font-bold">🛒 Магазины и кафе</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {businesses.map(b => (
            <button key={b.id} onClick={() => select(b)} className="w-full bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-left flex items-center gap-3">
              <span className="text-2xl">{b.business_type === 'cafe' ? '☕' : '🛒'}</span>
              <div><div className="text-xs font-bold">{b.name}</div><div className="text-[10px] text-slate-400">{b.address}</div></div>
            </button>
          ))}
          {businesses.length === 0 && <div className="text-center py-8 text-xs text-slate-400">Нет доступных магазинов</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm">←</button>
          <div><div className="text-xs font-bold">{selected.name}</div><div className="text-[10px] text-slate-400">{selected.address}</div></div>
        </div>
        {cart.length > 0 && <button onClick={orderWA} className="px-2 py-1 bg-emerald-500 rounded text-[10px] font-bold">🛒 {cart.reduce((s, i) => s + i.qty, 0)} → {total}₸</button>}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {catalog.map(item => (
          <div key={item.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 flex justify-between items-center">
            <div><div className="text-xs font-bold">{item.title}</div><div className="text-sm text-emerald-300 font-bold">{item.price} ₸</div></div>
            <button onClick={() => addCart(item)} className="px-3 py-1.5 bg-emerald-500 rounded text-[10px] font-bold">+</button>
          </div>
        ))}
        {catalog.length === 0 && <div className="text-center py-8 text-xs text-slate-400">Каталог пуст</div>}
      </div>
    </div>
  );
}

// --- Бронирование клиента ---
function ClientBooking({ businesses, onBack }: { businesses: any[]; onBack: () => void }) {
  const book = (b: any) => {
    const type = b.business_type === 'beauty' ? 'Запись' : 'Бронирование';
    const phone = b.whatsapp_number?.replace(/[^0-9]/g, '');
    const text = `${type} в ${b.name} через DAapp. Связжитесь со мной!`;
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 border-b border-slate-700">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm">←</button>
        <span className="text-xs font-bold">📅 Запись и бронирование</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {businesses.map(b => (
          <div key={b.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{b.business_type === 'beauty' ? '💇' : '🏨'}</span>
              <div><div className="text-xs font-bold">{b.name}</div><div className="text-[10px] text-slate-400">{b.address}</div></div>
            </div>
            <button onClick={() => book(b)} className="w-full py-2 bg-emerald-500 rounded text-[10px] font-bold">{b.business_type === 'beauty' ? '📅 Записаться' : '🏨 Забронировать'}</button>
          </div>
        ))}
        {businesses.length === 0 && <div className="text-center py-8 text-xs text-slate-400">Нет доступных заведений</div>}
      </div>
    </div>
  );
}

// --- Попутчики клиента ---
function ClientRideshare({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_name: '', user_phone: '', post_type: 'looking' as 'looking' | 'offering', from_city: 'Шиели', to_city: '', travel_date: '', price: 0 });

  const load = async () => { const { data } = await supabase.from('rideshare_posts').select('*').eq('is_active', true).order('travel_date'); setPosts(data || []); };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.to_city || !form.travel_date) return alert('Заполните поля');
    await supabase.from('rideshare_posts').insert({ user_id: userId, ...form, seats_available: 3, is_active: true });
    setShowForm(false); setForm({ user_name: '', user_phone: '', post_type: 'looking', from_city: 'Шиели', to_city: '', travel_date: '', price: 0 });
    load();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2"><button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm">←</button><span className="text-xs font-bold">🚌 Попутчики</span></div>
        <button onClick={() => setShowForm(!showForm)} className="px-2 py-1 bg-emerald-500 rounded text-[10px] font-bold">+ Создать</button>
      </div>
      {showForm && (
        <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700 space-y-1.5">
          <input value={form.user_name} onChange={e => setForm({ ...form, user_name: e.target.value })} placeholder="Имя" className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
          <input value={form.user_phone} onChange={e => setForm({ ...form, user_phone: e.target.value })} placeholder="Телефон" className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
          <input value={form.to_city} onChange={e => setForm({ ...form, to_city: e.target.value })} placeholder="Куда" className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
          <input type="date" value={form.travel_date} onChange={e => setForm({ ...form, travel_date: e.target.value })} className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
          <div className="flex gap-2">
            <button onClick={() => setForm({ ...form, post_type: 'offering' })} className={`flex-1 py-1 rounded text-[10px] ${form.post_type === 'offering' ? 'bg-blue-500' : 'bg-slate-700'}`}>🚗 Предлагаю</button>
            <button onClick={() => setForm({ ...form, post_type: 'looking' })} className={`flex-1 py-1 rounded text-[10px] ${form.post_type === 'looking' ? 'bg-orange-500' : 'bg-slate-700'}`}>🔍 Ищу</button>
          </div>
          <button onClick={create} className="w-full py-1.5 bg-emerald-500 rounded text-xs font-bold">✅ Опубликовать</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {posts.map(p => (
          <div key={p.id} className={`bg-slate-800/50 rounded-xl p-3 border ${p.post_type === 'offering' ? 'border-blue-500/30' : 'border-orange-500/30'}`}>
            <div className="flex justify-between mb-1"><span className="text-xs font-bold">{p.user_name}</span>{p.price_per_person > 0 && <span className="text-xs text-emerald-300 font-bold">{p.price_per_person}₸</span>}</div>
            <div className="text-[10px] text-slate-400 mb-2">{p.from_city} → {p.to_city} • {new Date(p.travel_date).toLocaleDateString('ru-RU')}</div>
            <div className="flex gap-2">
              <a href={`https://wa.me/${p.user_phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex-1 py-1 bg-green-500/10 border border-green-500/30 rounded text-[10px] text-center text-green-300">💬 WhatsApp</a>
              <a href={`tel:${p.user_phone}`} className="flex-1 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] text-center text-blue-300">📞 Звонок</a>
            </div>
          </div>
        ))}
        {posts.length === 0 && <div className="text-center py-8 text-xs text-slate-400">Нет объявлений</div>}
      </div>
    </div>
  );
}

// ============================================================
// 🚗 ПРИЛОЖЕНИЕ ВОДИТЕЛЯ
// ============================================================
function DriverApp({ userId, onLogout }: { userId: string; onLogout: () => void }) {
  const [onShift, setOnShift] = useState(false);
  const [spot, setSpot] = useState('');
  const [tab, setTab] = useState('passenger');
  const [orders, setOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const spots = [{ id: 'station', n: 'Вокзал', i: '🚉' }, { id: 'market', n: 'Базар', i: '🏪' }, { id: 'center', n: 'Центр', i: '🏛️' }, { id: 'hospital', n: 'Больница', i: '🏥' }, { id: 'school', n: 'Школа', i: '🏫' }, { id: 'custom', n: 'Другое', i: '📍' }];
  const tabs = [{ t: 'passenger', i: '🚗', l: 'Легковые' }, { t: 'minivan', i: '🚐', l: 'Минивэны' }, { t: 'cargo', i: '🚚', l: 'Грузовые' }];

  const loadOrders = async () => {
    const { data } = await supabase.from('taxi_orders').select('*').eq('status', 'searching').order('created_at', { ascending: false });
    setOrders(data || []);
  };

  useEffect(() => {
    if (!onShift) return;
    loadOrders();
    const i = setInterval(loadOrders, 5000);
    return () => clearInterval(i);
  }, [onShift]);

  const toggleShift = async () => {
    if (!onShift && !spot) return alert('Выберите стоянку');
    const newState = !onShift;
    setOnShift(newState);
    const s = spots.find(s => s.id === spot);
    await supabase.from('profiles').update({ is_on_shift: newState, current_location: newState ? s?.n || '' : '' }).eq('id', userId);
  };

  const accept = async (order: any) => {
    await supabase.from('taxi_orders').update({ driver_id: userId, status: 'accepted' }).eq('id', order.id);
    setActiveOrder(order);
    setOrders(p => p.filter(o => o.id !== order.id));
  };

  const complete = async () => {
    if (!activeOrder) return;
    await supabase.from('taxi_orders').update({ status: 'completed' }).eq('id', activeOrder.id);
    setActiveOrder(null);
  };

  const filtered = orders.filter(o => o.required_vehicle_type === tab);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold">🚗</div>
          <div><div className="text-xs font-bold">Таксист</div><div className="text-[10px] text-slate-400">{onShift ? '🟢 На смене' : '⚪ Не на смене'}</div></div>
        </div>
        <button onClick={onLogout} className="text-[10px] text-slate-500">Выйти</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Переключатель смены */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="flex justify-between items-center mb-2">
            <div><div className="text-xs font-bold">Режим работы</div><div className="text-[10px] text-slate-400">{onShift ? 'Вас видят клиенты' : 'Включите чтобы получать заказы'}</div></div>
            <button onClick={toggleShift} className={`w-12 h-6 rounded-full relative transition-colors ${onShift ? 'bg-emerald-500' : 'bg-slate-700'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${onShift ? 'left-6' : 'left-0.5'}`}></div>
            </button>
          </div>
          {onShift && (
            <div>
              <div className="text-[10px] text-slate-400 mb-1">📍 Стоянка</div>
              <div className="grid grid-cols-3 gap-1">
                {spots.map(s => (
                  <button key={s.id} onClick={() => setSpot(s.id)} className={`p-1.5 rounded-lg border text-center ${spot === s.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
                    <div className="text-base">{s.i}</div><div className="text-[9px]">{s.n}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Активный заказ */}
        {activeOrder && (
          <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/30">
            <div className="text-xs font-bold text-emerald-300 mb-2">🚗 Активный заказ</div>
            <div className="text-[10px] space-y-1 mb-2"><div>📍 {activeOrder.pickup_address}</div><div>🎯 {activeOrder.dropoff_address}</div><div className="text-emerald-300 font-bold">{activeOrder.price} ₸</div></div>
            <div className="flex gap-2">
              <button onClick={complete} className="flex-1 py-2 bg-emerald-500 rounded text-[10px] font-bold">✅ Завершить</button>
              <a href={`tel:${activeOrder.client_phone || ''}`} className="px-3 py-2 bg-blue-500 rounded text-[10px] font-bold">📞</a>
            </div>
          </div>
        )}

        {/* Биржа */}
        {onShift && !activeOrder && (
          <>
            <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
              {tabs.map(t => (
                <button key={t.t} onClick={() => setTab(t.t)} className={`flex-1 py-1.5 rounded text-[10px] font-medium ${tab === t.t ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>{t.i} {t.l}</button>
              ))}
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-400">Заказы ({filtered.length})</div>
              {filtered.length === 0 ? <div className="text-center py-6"><div className="text-2xl mb-1">🔍</div><p className="text-[10px] text-slate-400">Нет заказов</p></div> :
                filtered.map(o => (
                  <div key={o.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <div className="flex justify-between mb-1"><span className="text-[10px] text-slate-400">{new Date(o.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span><span className="text-sm font-bold text-emerald-300">{o.price} ₸</span></div>
                    <div className="text-[10px] space-y-0.5 mb-2"><div>📍 {o.pickup_address}</div><div>🎯 {o.dropoff_address}</div></div>
                    <button onClick={() => accept(o)} className="w-full py-2 bg-emerald-500 rounded text-[10px] font-bold">✅ Принять</button>
                  </div>
                ))}
            </div>
          </>
        )}

        {!onShift && <div className="text-center py-8"><div className="text-3xl mb-2">💤</div><p className="text-xs text-slate-400">Включите "На смене"</p></div>}
      </div>
    </div>
  );
}

// ============================================================
// 🏪 ПРИЛОЖЕНИЕ БИЗНЕСА
// ============================================================
function BusinessApp({ userId, onLogout }: { userId: string; onLogout: () => void }) {
  const [screen, setScreen] = useState<'dash' | 'catalog' | 'orders'>('dash');
  const [business, setBusiness] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', price: 0, description: '' });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('businesses').select('*').eq('owner_id', userId).single();
      setBusiness(data);
      if (data) {
        const { data: items } = await supabase.from('catalog_items').select('*').eq('business_id', data.id);
        setCatalog(items || []);
      }
    };
    load();
  }, [userId]);

  const addItem = async () => {
    if (!newItem.title || !business) return;
    await supabase.from('catalog_items').insert({ business_id: business.id, title: newItem.title, price: newItem.price, description: newItem.description, is_available: true });
    setNewItem({ title: '', price: 0, description: '' }); setShowAdd(false);
    const { data } = await supabase.from('catalog_items').select('*').eq('business_id', business.id);
    setCatalog(data || []);
  };

  const deleteItem = async (id: string) => {
    await supabase.from('catalog_items').delete().eq('id', id);
    const { data } = await supabase.from('catalog_items').select('*').eq('business_id', business.id);
    setCatalog(data || []);
  };

  const callCourier = async () => {
    const addr = prompt('Адрес доставки клиенту:');
    if (!addr) return;
    await supabase.from('taxi_orders').insert({
      client_id: userId, pickup_address: business?.address || 'Мой бизнес', dropoff_address: addr,
      required_vehicle_type: 'passenger', price: 800, status: 'searching',
      pickup_lat: business?.latitude || SHIELI[0], pickup_lng: business?.longitude || SHIELI[1],
      dropoff_lat: SHIELI[0], dropoff_lng: SHIELI[1],
      notes: `Курьер от ${business?.name}`,
    });
    alert('🚕 Курьер вызван! Заказ создан в системе такси.');
  };

  const icons: any = { cafe: '☕', shop: '🛒', beauty: '💇', hotel: '🏨' };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-sm">{business ? icons[business.business_type] : '🏪'}</div>
          <div><div className="text-xs font-bold">{business?.name || 'Бизнес'}</div><div className="text-[10px] text-slate-400">{business?.address || 'Шиели'}</div></div>
        </div>
        <button onClick={onLogout} className="text-[10px] text-slate-500">Выйти</button>
      </div>

      {/* Табы */}
      <div className="px-3 py-2 flex gap-1 border-b border-slate-700/50">
        {[{ id: 'dash', l: '📊 Главная' }, { id: 'catalog', l: '📦 Каталог' }, { id: 'orders', l: '📋 Заказы' }].map(t => (
          <button key={t.id} onClick={() => setScreen(t.id as any)} className={`flex-1 py-1.5 rounded text-[10px] font-medium ${screen === t.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{t.l}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {screen === 'dash' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30 text-center"><div className="text-xl font-bold text-blue-300">{catalog.length}</div><div className="text-[10px] text-slate-400">Товаров</div></div>
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30 text-center"><div className="text-xl font-bold text-green-300">{catalog.filter(c => c.is_available).length}</div><div className="text-[10px] text-slate-400">Доступно</div></div>
            </div>
            <button onClick={callCourier} className="w-full flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <span className="text-2xl">🚕</span>
              <div className="flex-1 text-left"><div className="text-xs font-bold">Вызвать курьера</div><div className="text-[10px] text-slate-400">Доставка заказа клиенту через такси</div></div>
              <span className="text-slate-500">→</span>
            </button>
            <button onClick={() => setScreen('catalog')} className="w-full flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl">
              <span className="text-2xl">📦</span>
              <div className="flex-1 text-left"><div className="text-xs font-bold">Управление каталогом</div><div className="text-[10px] text-slate-400">Добавить/удалить товары</div></div>
              <span className="text-slate-500">→</span>
            </button>
          </div>
        )}

        {screen === 'catalog' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold">Каталог ({catalog.length})</span>
              <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-1 bg-emerald-500 rounded text-[10px] font-bold">+ Добавить</button>
            </div>
            {showAdd && (
              <div className="bg-slate-800 rounded-lg p-3 space-y-2 border border-emerald-500/30">
                <input value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} placeholder="Название" className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
                <input type="number" value={newItem.price || ''} onChange={e => setNewItem({ ...newItem, price: +e.target.value })} placeholder="Цена ₸" className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
                <input value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder="Описание" className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
                <div className="flex gap-2"><button onClick={addItem} className="flex-1 py-1.5 bg-emerald-500 rounded text-xs font-bold">✅ Добавить</button><button onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-slate-700 rounded text-xs">✕</button></div>
              </div>
            )}
            {catalog.map(item => (
              <div key={item.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex justify-between items-start">
                  <div><div className="text-xs font-bold">{item.title}</div><div className="text-sm text-emerald-300 font-bold">{item.price} ₸</div>{item.description && <div className="text-[10px] text-slate-400 mt-0.5">{item.description}</div>}</div>
                  <button onClick={() => deleteItem(item.id)} className="text-red-400 text-[10px]">🗑️</button>
                </div>
              </div>
            ))}
            {catalog.length === 0 && !showAdd && <div className="text-center py-6 text-xs text-slate-400">Каталог пуст. Добавьте первый товар.</div>}
          </div>
        )}

        {screen === 'orders' && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-xs text-slate-400">Заказы от клиентов появятся здесь</p>
            <p className="text-[10px] text-slate-500 mt-1">Когда клиент оформит заказ через приложение</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ГЛАВНЫЙ APP
// ============================================================
export default function App() {
  const [appType, setAppType] = useState<AppType>('select');
  const [userId, setUserId] = useState<string | null>(null);

  // Если приложение не выбрано — показываем выбор
  if (appType === 'select') return <AppSelector onSelect={setAppType} />;

  // Если не авторизован — показываем регистрацию
  if (!userId) return <AuthScreen appType={appType} onAuth={setUserId} />;

  // Авторизован — показываем приложение
  const logout = () => { setUserId(null); setAppType('select'); supabase.auth.signOut(); };

  switch (appType) {
    case 'client': return <ClientApp userId={userId} onLogout={logout} />;
    case 'driver': return <DriverApp userId={userId} onLogout={logout} />;
    case 'business': return <BusinessApp userId={userId} onLogout={logout} />;
    default: return <AppSelector onSelect={setAppType} />;
  }
}
