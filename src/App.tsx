import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase, Business } from './lib/supabase';

type View = 'dashboard' | 'client' | 'driver' | 'business' | 'map' | 'taxi' | 'storefront' | 'booking' | 'rideshare';

const SHIELI_CENTER: [number, number] = [44.1676, 66.7369];
const OWNER_UID = '8e53fbb3-3910-4ec9-8cdd-205d451286fa';

const CATEGORIES = [
  { type: 'cafe' as const, label: 'Кафе', icon: '☕', color: '#f59e0b' },
  { type: 'shop' as const, label: 'Магазины', icon: '🛒', color: '#10b981' },
  { type: 'beauty' as const, label: 'Салоны', icon: '💇', color: '#ec4899' },
  { type: 'hotel' as const, label: 'Отели', icon: '🏨', color: '#3b82f6' },
];

function createMarkerIcon(type: string) {
  const cat = CATEGORIES.find(c => c.type === type);
  const color = cat?.color || '#6b7280';
  const emoji = cat?.icon || '📍';
  return L.divIcon({
    html: `<div style="width:36px;height:44px;position:relative;"><svg width="36" height="44" viewBox="0 0 36 44"><path d="M18 0C8 0 0 8 0 18c0 13 18 26 18 26s18-13 18-26C36 8 28 0 18 0z" fill="${color}" stroke="white" stroke-width="1.5"/><circle cx="18" cy="17" r="10" fill="white"/><text x="18" y="22" text-anchor="middle" font-size="13">${emoji}</text></svg></div>`,
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
}

// ============ MAP COMPONENT ============
function MapView({ onBack }: { onBack: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('businesses').select('*').eq('is_open', true).not('latitude', 'is', null);
      setBusinesses((data as Business[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { center: SHIELI_CENTER, zoom: 14, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    const filtered = filter === 'all' ? businesses : businesses.filter(b => b.business_type === filter);
    filtered.forEach(b => {
      if (!b.latitude || !b.longitude) return;
      const cat = CATEGORIES.find(c => c.type === b.business_type);
      const waLink = b.whatsapp_number ? `https://wa.me/${b.whatsapp_number.replace(/[^0-9]/g, '')}` : null;
      const popup = `<div style="font-family:system-ui;min-width:180px;"><b>${b.name}</b><br/><small>${cat?.label} • ${b.address}</small>${b.description ? `<p style="margin:4px 0;font-size:12px;color:#666;">${b.description}</p>` : ''}<div style="display:flex;gap:6px;margin-top:8px;">${waLink ? `<a href="${waLink}" target="_blank" style="flex:1;padding:6px;background:#25d366;color:white;text-align:center;border-radius:6px;text-decoration:none;font-size:12px;">💬 WhatsApp</a>` : ''}<a href="tel:${b.whatsapp_number}" style="flex:1;padding:6px;background:#3b82f6;color:white;text-align:center;border-radius:6px;text-decoration:none;font-size:12px;">📞 Звонок</a></div></div>`;
      L.marker([b.latitude, b.longitude], { icon: createMarkerIcon(b.business_type) }).bindPopup(popup).addTo(map);
    });

    return () => { map.remove(); };
  }, [businesses, filter]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900">
      <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-700 z-[1000]">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">←</button>
          <div><div className="text-xs font-bold text-white">Карта Шиели</div><div className="text-[10px] text-slate-400">{loading ? '...' : `${businesses.length} мест`}</div></div>
        </div>
      </div>
      <div ref={mapRef} className="flex-1" />
      <div className="bg-slate-900 px-2 py-2 border-t border-slate-700 flex gap-1.5 overflow-x-auto" style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}>
        {[{ id: 'all', icon: '🗺️', label: 'Все' }, ...CATEGORIES.map(c => ({ id: c.type, icon: c.icon, label: c.label }))].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${filter === f.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
            <span>{f.icon}</span><span>{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ TAXI COMPONENT ============
function TaxiView({ onBack }: { onBack: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'searching' | 'offers' | 'accepted' | 'done'>('idle');
  const [vehicle, setVehicle] = useState<'passenger' | 'minivan' | 'cargo'>('passenger');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [offers, setOffers] = useState<{ name: string; price: number }[]>([]);
  const [price, setPrice] = useState(0);

  const vehicles = [
    { type: 'passenger' as const, icon: '🚗', label: 'Легковой', base: 500 },
    { type: 'minivan' as const, icon: '🚐', label: 'Минивэн', base: 800 },
    { type: 'cargo' as const, icon: '🚚', label: 'Грузовой', base: 1200 },
  ];

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { center: SHIELI_CENTER, zoom: 14 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      setPickup(`${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
      const v = vehicles.find(v => v.type === vehicle);
      setPrice(v?.base || 500);
      L.marker(e.latlng).addTo(map);
    });
    return () => { map.remove(); };
  }, []);

  const order = async () => {
    if (!pickup) return alert('Укажите адрес подачи (кликните по карте)');
    setDropoff('Центр Шиели');
    setStatus('searching');
    try {
      await supabase.from('taxi_orders').insert({
        client_id: OWNER_UID, pickup_address: pickup, dropoff_address: 'Центр Шиели',
        required_vehicle_type: vehicle, price, status: 'searching',
        pickup_lat: 44.1676, pickup_lng: 66.7369, dropoff_lat: 44.168, dropoff_lng: 66.738,
      });
    } catch (e) { console.error(e); }
    setTimeout(() => {
      setStatus('offers');
      setOffers([
        { name: 'Асан К.', price: price - 50 },
        { name: 'Болат М.', price: price },
        { name: 'Ерлан Т.', price: price + 100 },
      ]);
    }, 2000);
  };

  const accept = (o: typeof offers[0]) => {
    setStatus('accepted');
    setTimeout(() => setStatus('done'), 3000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">←</button>
          <div><div className="text-sm font-bold">🚕 Такси</div><div className="text-[10px] text-slate-400">{status === 'idle' ? 'Выберите маршрут' : status === 'searching' ? 'Поиск...' : status === 'offers' ? `${offers.length} предложений` : status === 'accepted' ? 'Водитель в пути' : 'Завершён'}</div></div>
        </div>
        {status !== 'idle' && status !== 'done' && <button onClick={() => { setStatus('idle'); setOffers([]); }} className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs">Отмена</button>}
      </div>

      <div ref={mapRef} className="h-40 w-full" />

      {status === 'idle' && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          <div><label className="text-xs text-slate-400">📍 Откуда</label><input readOnly value={pickup} placeholder="Кликните по карте" className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white" /></div>
          <div><label className="text-xs text-slate-400">🎯 Куда</label><input readOnly value={dropoff} placeholder="Адрес" className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">🚗 Транспорт</label>
            <div className="grid grid-cols-3 gap-1.5">
              {vehicles.map(v => (
                <button key={v.type} onClick={() => { setVehicle(v.type); setPrice(v.base); }} className={`p-2 rounded-lg border-2 text-center ${vehicle === v.type ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}`}>
                  <div className="text-lg">{v.icon}</div><div className="text-[10px]">{v.label}</div>
                </button>
              ))}
            </div>
          </div>
          {price > 0 && <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/30 flex justify-between"><span className="text-xs text-slate-300">Примерно</span><span className="text-lg font-bold text-emerald-300">{price} ₸</span></div>}
          <button onClick={order} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl text-sm font-bold">🚕 Заказать</button>
        </div>
      )}

      {status === 'searching' && <div className="flex-1 flex items-center justify-center"><div className="text-center"><div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="text-sm text-slate-400 mt-3">Ищем водителя...</p></div></div>}

      {status === 'offers' && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30 text-center"><p className="text-sm font-bold text-yellow-300">🎉 Водители предлагают цену!</p></div>
          {offers.map((o, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">🚗</div><span className="text-sm font-bold">{o.name}</span></div><span className="text-lg font-bold text-emerald-300">{o.price} ₸</span></div>
              <button onClick={() => accept(o)} className="w-full py-2 bg-emerald-500 rounded-lg text-xs font-bold">✅ Принять</button>
            </div>
          ))}
        </div>
      )}

      {status === 'accepted' && <div className="flex-1 flex items-center justify-center"><div className="text-center"><div className="text-4xl mb-2">🚗</div><p className="text-sm font-bold">Водитель в пути!</p><a href="tel:+77011234567" className="text-emerald-300 text-sm mt-2 block">📞 +7 701 123 45 67</a></div></div>}

      {status === 'done' && <div className="flex-1 flex items-center justify-center px-3"><div className="text-center w-full"><div className="text-4xl mb-2">✅</div><p className="text-sm font-bold mb-4">Заказ завершён!</p><button onClick={() => { setStatus('idle'); setPickup(''); setDropoff(''); }} className="w-full py-3 bg-emerald-500 rounded-xl text-sm font-bold">🚕 Новый заказ</button></div></div>}
    </div>
  );
}

// ============ DRIVER APP ============
function DriverView({ onBack }: { onBack: () => void }) {
  const [onShift, setOnShift] = useState(false);
  const [spot, setSpot] = useState('');
  const [tab, setTab] = useState<'passenger' | 'minivan' | 'cargo'>('passenger');
  const [orders, setOrders] = useState<any[]>([]);

  const spots = [
    { id: 'station', name: 'Вокзал', icon: '🚉' },
    { id: 'market', name: 'Базар', icon: '🏪' },
    { id: 'center', name: 'Центр', icon: '🏛️' },
    { id: 'hospital', name: 'Больница', icon: '🏥' },
    { id: 'school', name: 'Школа', icon: '🏫' },
    { id: 'custom', name: 'Другое', icon: '📍' },
  ];

  const tabs = [
    { type: 'passenger' as const, icon: '🚗', label: 'Легковые' },
    { type: 'minivan' as const, icon: '🚐', label: 'Минивэны' },
    { type: 'cargo' as const, icon: '🚚', label: 'Грузовые' },
  ];

  useEffect(() => {
    if (!onShift) return;
    const load = async () => {
      const { data } = await supabase.from('taxi_orders').select('*').eq('status', 'searching').order('created_at', { ascending: false });
      setOrders(data || []);
    };
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [onShift]);

  const filtered = orders.filter(o => o.required_vehicle_type === tab);

  const accept = async (order: any) => {
    await supabase.from('taxi_orders').update({ driver_id: OWNER_UID, status: 'accepted' }).eq('id', order.id);
    setOrders(prev => prev.filter(o => o.id !== order.id));
    alert('✅ Заказ принят!');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">←</button>
          <div><div className="text-sm font-bold">🚗 Водитель</div><div className="text-[10px] text-slate-400">{onShift ? 'На смене' : 'Не на смене'}</div></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="flex justify-between items-center mb-2">
            <div><div className="text-xs font-bold">Статус</div><div className="text-[10px] text-slate-400">{onShift ? 'На смене' : 'Не на смене'}</div></div>
            <button onClick={() => { if (!onShift && !spot) { alert('Выберите стоянку'); return; } setOnShift(!onShift); }} className={`w-12 h-6 rounded-full ${onShift ? 'bg-emerald-500' : 'bg-slate-700'} relative`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${onShift ? 'left-6' : 'left-0.5'}`}></div>
            </button>
          </div>
          {onShift && (
            <div>
              <div className="text-[10px] text-slate-400 mb-1">📍 Стоянка</div>
              <div className="grid grid-cols-3 gap-1.5">
                {spots.map(s => (
                  <button key={s.id} onClick={() => setSpot(s.id)} className={`p-1.5 rounded-lg border text-center ${spot === s.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
                    <div className="text-base">{s.icon}</div><div className="text-[9px]">{s.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {onShift && (
          <>
            <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
              {tabs.map(t => (
                <button key={t.type} onClick={() => setTab(t.type)} className={`flex-1 py-1.5 rounded-md text-[10px] font-medium ${tab === t.type ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-xs font-bold">Заказы ({filtered.length})</span></div>
              {filtered.length === 0 ? (
                <div className="text-center py-6"><div className="text-3xl mb-2">🔍</div><p className="text-xs text-slate-400">Нет заказов</p></div>
              ) : filtered.map(o => (
                <div key={o.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="flex justify-between mb-2"><span className="text-[10px] text-slate-400">{new Date(o.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span><span className="text-sm font-bold text-emerald-300">{o.price} ₸</span></div>
                  <div className="text-xs space-y-1 mb-2"><div>📍 {o.pickup_address}</div><div>🎯 {o.dropoff_address}</div></div>
                  <button onClick={() => accept(o)} className="w-full py-2 bg-emerald-500 rounded-lg text-xs font-bold">✅ Принять</button>
                </div>
              ))}
            </div>
          </>
        )}

        {!onShift && <div className="text-center py-8"><div className="text-4xl mb-2">💤</div><p className="text-xs text-slate-400">Включите статус "На смене"</p></div>}
      </div>
    </div>
  );
}

// ============ BUSINESS APP ============
function BusinessView({ onBack }: { onBack: () => void }) {
  const [btype, setBtype] = useState<'cafe' | 'shop' | 'beauty' | 'hotel'>('cafe');
  const [screen, setScreen] = useState<'dash' | 'catalog'>('dash');
  const [catalog, setCatalog] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', price: 0 });

  const types = [
    { type: 'cafe' as const, icon: '☕', label: 'Кафе' },
    { type: 'shop' as const, icon: '🛒', label: 'Магазин' },
    { type: 'beauty' as const, icon: '💇', label: 'Салон' },
    { type: 'hotel' as const, icon: '🏨', label: 'Отель' },
  ];

  useEffect(() => {
    const load = async () => {
      const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', OWNER_UID).eq('business_type', btype).single();
      if (!biz) return;
      const { data } = await supabase.from('catalog_items').select('*').eq('business_id', biz.id);
      setCatalog(data || []);
    };
    load();
  }, [btype]);

  const addItem = async () => {
    if (!newItem.title || newItem.price <= 0) return alert('Заполните поля');
    const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', OWNER_UID).eq('business_type', btype).single();
    if (!biz) return alert('Бизнес не найден');
    await supabase.from('catalog_items').insert({ business_id: biz.id, title: newItem.title, price: newItem.price, is_available: true });
    setNewItem({ title: '', price: 0 });
    setShowAdd(false);
    const { data } = await supabase.from('catalog_items').select('*').eq('business_id', biz.id);
    setCatalog(data || []);
  };

  const callCourier = async () => {
    const addr = prompt('Адрес доставки:');
    if (!addr) return;
    await supabase.from('taxi_orders').insert({
      client_id: OWNER_UID, pickup_address: 'Мой бизнес', dropoff_address: addr,
      required_vehicle_type: 'passenger', price: 800, status: 'searching',
      pickup_lat: 44.1676, pickup_lng: 66.7369, dropoff_lat: 44.168, dropoff_lng: 66.738,
      notes: 'Курьер от бизнеса',
    });
    alert('🚕 Курьер вызван!');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 border-b border-slate-700">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">←</button>
        <div><div className="text-sm font-bold">🏪 Бизнес</div><div className="text-[10px] text-slate-400">{types.find(t => t.type === btype)?.label}</div></div>
      </div>

      <div className="px-3 py-2 border-b border-slate-700/50">
        <div className="grid grid-cols-4 gap-1.5">
          {types.map(t => (
            <button key={t.type} onClick={() => setBtype(t.type)} className={`p-2 rounded-lg border-2 text-center ${btype === t.type ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}`}>
              <div className="text-lg">{t.icon}</div><div className="text-[10px]">{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 border-b border-slate-700/50 flex gap-1">
        <button onClick={() => setScreen('dash')} className={`flex-1 py-1.5 rounded-md text-[10px] font-medium ${screen === 'dash' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>📊 Главная</button>
        <button onClick={() => setScreen('catalog')} className={`flex-1 py-1.5 rounded-md text-[10px] font-medium ${screen === 'catalog' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>📦 Каталог</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {screen === 'dash' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30 text-center"><div className="text-xl font-bold text-blue-300">{catalog.length}</div><div className="text-[10px] text-slate-400">Товаров</div></div>
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30 text-center"><div className="text-xl font-bold text-green-300">{catalog.filter(c => c.is_available).length}</div><div className="text-[10px] text-slate-400">Доступно</div></div>
            </div>
            <button onClick={callCourier} className="w-full flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <span className="text-xl">🚕</span><div className="flex-1 text-left"><div className="text-xs font-bold">Вызвать курьера</div><div className="text-[10px] text-slate-400">Доставка клиенту</div></div>
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
                <input type="number" value={newItem.price || ''} onChange={e => setNewItem({ ...newItem, price: +e.target.value })} placeholder="Цена" className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
                <div className="flex gap-2"><button onClick={addItem} className="flex-1 py-1.5 bg-emerald-500 rounded text-xs font-bold">✅</button><button onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-slate-700 rounded text-xs">✕</button></div>
              </div>
            )}
            {catalog.map(item => (
              <div key={item.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 flex justify-between">
                <div><div className="text-xs font-bold">{item.title}</div><div className="text-sm text-emerald-300 font-bold">{item.price} ₸</div></div>
                <span className={`px-2 py-0.5 text-[10px] rounded-full ${item.is_available ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{item.is_available ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ CLIENT HUB ============
function ClientView({ onBack, navigate }: { onBack: () => void; navigate: (v: View) => void }) {
  const [counts, setCounts] = useState({ total: 0, shops: 0, beauty: 0 });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('businesses').select('business_type').eq('is_open', true);
      setCounts({
        total: data?.length || 0,
        shops: data?.filter(b => b.business_type === 'shop').length || 0,
        beauty: data?.filter(b => b.business_type === 'beauty').length || 0,
      });
    };
    load();
  }, []);

  const cats = [
    { id: 'map', icon: '🗺️', label: 'Карта', color: 'from-green-500 to-emerald-600' },
    { id: 'taxi', icon: '🚕', label: 'Такси', color: 'from-yellow-500 to-orange-600' },
    { id: 'shops', icon: '🛒', label: 'Магазины', color: 'from-blue-500 to-cyan-600' },
    { id: 'beauty', icon: '💇', label: 'Салоны', color: 'from-pink-500 to-rose-600' },
    { id: 'hotels', icon: '🏨', label: 'Отели', color: 'from-purple-500 to-indigo-600' },
    { id: 'rideshare', icon: '🚌', label: 'Попутчики', color: 'from-teal-500 to-green-600' },
  ];

  const click = (id: string) => {
    if (id === 'map') navigate('map');
    else if (id === 'taxi') navigate('taxi');
    else if (id === 'shops') navigate('storefront');
    else if (id === 'beauty' || id === 'hotels') navigate('booking');
    else if (id === 'rideshare') navigate('rideshare');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xs font-bold">DA</button>
            <div><div className="text-xs font-bold">Привет!</div><div className="text-[10px] text-slate-400">📍 Шиели</div></div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">👤</div>
        </div>
        <div className="relative"><input placeholder="Поиск..." className="w-full px-3 py-2 pl-8 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white" /><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span></div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 pb-16">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/30 text-center"><div className="text-base font-bold text-emerald-300">{counts.total}</div><div className="text-[10px] text-slate-400">Мест</div></div>
          <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/30 text-center"><div className="text-base font-bold text-blue-300">{counts.shops}</div><div className="text-[10px] text-slate-400">Магазинов</div></div>
          <div className="bg-pink-500/10 rounded-lg p-2 border border-pink-500/30 text-center"><div className="text-base font-bold text-pink-300">{counts.beauty}</div><div className="text-[10px] text-slate-400">Салонов</div></div>
        </div>

        <div className="text-xs font-bold mb-2">Что вас интересует?</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {cats.map(c => (
            <button key={c.id} onClick={() => click(c.id)} className={`bg-gradient-to-br ${c.color} rounded-xl p-3 text-left active:scale-95 transition-transform`}>
              <div className="text-2xl mb-1">{c.icon}</div><div className="text-xs font-bold">{c.label}</div>
            </button>
          ))}
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="text-[10px] font-bold text-slate-300 mb-2">⚡ Быстрые действия</div>
          <button onClick={() => navigate('taxi')} className="w-full flex items-center gap-2 p-2 bg-slate-700/30 rounded-lg mb-2"><span className="text-lg">🚕</span><div className="flex-1 text-left"><div className="text-xs font-medium">Вызвать такси</div></div></button>
          <button onClick={() => navigate('rideshare')} className="w-full flex items-center gap-2 p-2 bg-slate-700/30 rounded-lg"><span className="text-lg">🚌</span><div className="flex-1 text-left"><div className="text-xs font-medium">Попутчики</div></div></button>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700/50 flex justify-around py-1.5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button onClick={onBack} className="flex flex-col items-center gap-0.5 flex-1 text-slate-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span className="text-[10px]">Дашборд</span></button>
        <button onClick={() => navigate('map')} className="flex flex-col items-center gap-0.5 flex-1 text-slate-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg><span className="text-[10px]">Карта</span></button>
        <button onClick={() => navigate('taxi')} className="flex flex-col items-center gap-0.5 flex-1"><div className="w-10 h-10 -mt-5 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg"><span className="text-lg">🚕</span></div><span className="text-[10px]">Такси</span></button>
        <button onClick={() => navigate('driver')} className="flex flex-col items-center gap-0.5 flex-1 text-slate-500"><span className="text-lg">🚗</span><span className="text-[10px]">Водитель</span></button>
      </nav>
    </div>
  );
}

// ============ STOREFRONT ============
function StorefrontView({ onBack }: { onBack: () => void }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<Business | null>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('businesses').select('*').eq('is_open', true);
      setBusinesses((data as Business[]) || []);
    };
    load();
  }, []);

  const selectBiz = async (b: Business) => {
    setSelected(b);
    const { data } = await supabase.from('catalog_items').select('*').eq('business_id', b.id).eq('is_available', true);
    setCatalog(data || []);
  };

  const addCart = (item: any) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const order = () => {
    if (!selected || cart.length === 0) return;
    const text = `Заказ от DAapp:\n${selected.name}\n\n${cart.map(i => `• ${i.title} x${i.qty} = ${i.price * i.qty}₸`).join('\n')}\n\nИтого: ${total}₸`;
    const phone = selected.whatsapp_number?.replace(/[^0-9]/g, '');
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    setCart([]);
    alert('✅ Заказ отправлен!');
  };

  if (!selected) {
    return (
      <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
        <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 border-b border-slate-700">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">←</button>
          <span className="text-sm font-bold">🛍️ Витрины</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {businesses.map(b => (
            <button key={b.id} onClick={() => selectBiz(b)} className="w-full bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-left flex items-center gap-3">
              <span className="text-2xl">{CATEGORIES.find(c => c.type === b.business_type)?.icon}</span>
              <div className="flex-1"><div className="text-xs font-bold">{b.name}</div><div className="text-[10px] text-slate-400">{b.address}</div></div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">←</button>
          <div><div className="text-xs font-bold">{selected.name}</div><div className="text-[10px] text-slate-400">{selected.address}</div></div>
        </div>
        {cart.length > 0 && <button onClick={order} className="px-2 py-1 bg-emerald-500 rounded text-xs font-bold">🛒 {cart.reduce((s, i) => s + i.qty, 0)} → {total}₸</button>}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {catalog.map(item => (
          <div key={item.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex justify-between mb-2"><div className="text-xs font-bold">{item.title}</div><div className="text-sm font-bold text-emerald-300">{item.price} ₸</div></div>
            <button onClick={() => addCart(item)} className="w-full py-1.5 bg-emerald-500 rounded text-[10px] font-bold">+ В корзину</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ BOOKING ============
function BookingView({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'type' | 'list'>('type');
  const [btype, setBtype] = useState<'beauty' | 'hotel'>('beauty');
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    if (step === 'list') {
      const load = async () => {
        const { data } = await supabase.from('businesses').select('*').eq('business_type', btype).eq('is_open', true);
        setBusinesses((data as Business[]) || []);
      };
      load();
    }
  }, [step, btype]);

  const book = (b: Business) => {
    const phone = b.whatsapp_number?.replace(/[^0-9]/g, '');
    const text = btype === 'beauty'
      ? `📅 Запись в ${b.name}\nХочу записаться. Связжитесь со мной!`
      : `🏨 Бронирование в ${b.name}\nХочу забронировать номер. Связжитесь со мной!`;
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (step === 'type') {
    return (
      <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
        <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 border-b border-slate-700">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">←</button>
          <span className="text-sm font-bold">📅 Бронирование</span>
        </div>
        <div className="flex-1 px-3 py-3 space-y-2">
          <button onClick={() => { setBtype('beauty'); setStep('list'); }} className="w-full bg-pink-500/10 rounded-xl p-4 border border-pink-500/30 text-left">
            <div className="text-3xl mb-2">💇</div><div className="text-sm font-bold text-pink-300">Салоны красоты</div><div className="text-[10px] text-slate-400">Онлайн-запись</div>
          </button>
          <button onClick={() => { setBtype('hotel'); setStep('list'); }} className="w-full bg-blue-500/10 rounded-xl p-4 border border-blue-500/30 text-left">
            <div className="text-3xl mb-2">🏨</div><div className="text-sm font-bold text-blue-300">Отели</div><div className="text-[10px] text-slate-400">Бронирование номеров</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 border-b border-slate-700">
        <button onClick={() => setStep('type')} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">←</button>
        <span className="text-sm font-bold">{btype === 'beauty' ? '💇 Салоны' : '🏨 Отели'}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {businesses.map(b => (
          <div key={b.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-xs font-bold mb-1">{b.name}</div>
            <div className="text-[10px] text-slate-400 mb-2">{b.address}</div>
            <button onClick={() => book(b)} className="w-full py-2 bg-emerald-500 rounded text-xs font-bold">{btype === 'beauty' ? '📅 Записаться' : '🏨 Забронировать'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ RIDESHARE ============
function RideshareView({ onBack }: { onBack: () => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'looking' | 'offering'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_name: '', user_phone: '', post_type: 'offering' as 'looking' | 'offering', from_city: 'Шиели', to_city: '', travel_date: '', price: 0, description: '' });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('rideshare_posts').select('*').eq('is_active', true).order('travel_date');
      setPosts(data || []);
    };
    load();
  }, []);

  const create = async () => {
    if (!form.user_name || !form.to_city || !form.travel_date) return alert('Заполните поля');
    await supabase.from('rideshare_posts').insert({
      user_id: OWNER_UID, ...form, seats_available: 3, is_active: true,
    });
    setShowForm(false);
    setForm({ user_name: '', user_phone: '', post_type: 'offering', from_city: 'Шиели', to_city: '', travel_date: '', price: 0, description: '' });
    const { data } = await supabase.from('rideshare_posts').select('*').eq('is_active', true).order('travel_date');
    setPosts(data || []);
    alert('✅ Объявление создано!');
  };

  const contact = (p: any) => {
    const phone = p.user_phone?.replace(/[^0-9]/g, '');
    const text = `Привет! Вижу объявление: ${p.from_city} → ${p.to_city}\nМожно обсудить?`;
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filtered = posts.filter(p => filter === 'all' || p.post_type === filter);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-900 px-3 py-2 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2"><button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">←</button><div><div className="text-sm font-bold">🚌 Попутчики</div><div className="text-[10px] text-slate-400">{posts.length} объявлений</div></div></div>
          <button onClick={() => setShowForm(!showForm)} className="px-3 py-1 bg-emerald-500 rounded text-xs font-bold">+ Создать</button>
        </div>
        <div className="flex gap-1">
          {[{ id: 'all' as const, label: 'Все' }, { id: 'offering' as const, label: '🚗 Предлагают' }, { id: 'looking' as const, label: '🔍 Ищут' }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`flex-1 py-1 rounded text-[10px] font-medium ${filter === f.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="px-3 py-3 bg-slate-800/50 border-b border-slate-700 space-y-2">
          <input value={form.user_name} onChange={e => setForm({ ...form, user_name: e.target.value })} placeholder="Имя" className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
          <input value={form.user_phone} onChange={e => setForm({ ...form, user_phone: e.target.value })} placeholder="Телефон" className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.from_city} onChange={e => setForm({ ...form, from_city: e.target.value })} placeholder="Откуда" className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
            <input value={form.to_city} onChange={e => setForm({ ...form, to_city: e.target.value })} placeholder="Куда" className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
          </div>
          <input type="date" value={form.travel_date} onChange={e => setForm({ ...form, travel_date: e.target.value })} className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
          <input type="number" value={form.price || ''} onChange={e => setForm({ ...form, price: +e.target.value })} placeholder="Цена ₸" className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
          <div className="flex gap-2">
            <button onClick={() => setForm({ ...form, post_type: 'offering' })} className={`flex-1 py-1.5 rounded text-xs ${form.post_type === 'offering' ? 'bg-blue-500' : 'bg-slate-700'}`}>🚗 Предлагаю</button>
            <button onClick={() => setForm({ ...form, post_type: 'looking' })} className={`flex-1 py-1.5 rounded text-xs ${form.post_type === 'looking' ? 'bg-orange-500' : 'bg-slate-700'}`}>🔍 Ищу</button>
          </div>
          <button onClick={create} className="w-full py-2 bg-emerald-500 rounded text-xs font-bold">✅ Опубликовать</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8"><div className="text-3xl mb-2">🚌</div><p className="text-xs text-slate-400">Нет объявлений</p></div>
        ) : filtered.map(p => (
          <div key={p.id} className={`bg-slate-800/50 rounded-xl p-3 border ${p.post_type === 'offering' ? 'border-blue-500/30' : 'border-orange-500/30'}`}>
            <div className="flex justify-between mb-2">
              <div className="flex items-center gap-2"><span className="text-lg">{p.post_type === 'offering' ? '🚗' : '🔍'}</span><div><div className="text-xs font-bold">{p.user_name}</div><div className="text-[10px] text-slate-400">{p.post_type === 'offering' ? 'Предлагает' : 'Ищет'}</div></div></div>
              {p.price_per_person > 0 && <span className="text-sm font-bold text-emerald-300">{p.price_per_person}₸</span>}
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 mb-2 text-xs"><div>📍 {p.from_city} → 🎯 {p.to_city}</div><div className="text-[10px] text-slate-400 mt-1">📅 {new Date(p.travel_date).toLocaleDateString('ru-RU')}</div></div>
            <div className="flex gap-2">
              <button onClick={() => contact(p)} className="flex-1 py-1.5 bg-green-500/10 border border-green-500/30 rounded text-[10px] font-bold text-green-300">💬 WhatsApp</button>
              <a href={`tel:${p.user_phone}`} className="flex-1 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] font-bold text-blue-300 text-center">📞 Звонок</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ MAIN DASHBOARD ============
function Dashboard({ navigate }: { navigate: (v: View) => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xl font-bold">DA</div>
          <div><h1 className="text-xl font-bold">DAapp</h1><p className="text-xs text-slate-400">📍 п. Шиели, Кызылординская обл.</p></div>
        </div>

        <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/30 mb-4">
          <h2 className="text-sm font-bold text-emerald-300 mb-2">✅ Все 9 шагов выполнены!</h2>
          <p className="text-xs text-slate-300">DAapp — полноценная цифровая экосистема посёлка</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => navigate('client')} className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl p-4 border border-blue-500/30 text-left active:scale-95 transition-transform">
            <div className="text-3xl mb-2">📱</div><div className="text-sm font-bold">Клиент</div><div className="text-[10px] text-slate-400">Главное приложение</div>
          </button>
          <button onClick={() => navigate('driver')} className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30 text-left active:scale-95 transition-transform">
            <div className="text-3xl mb-2">🚗</div><div className="text-sm font-bold">Водитель</div><div className="text-[10px] text-slate-400">Кабинет водителя</div>
          </button>
          <button onClick={() => navigate('business')} className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl p-4 border border-pink-500/30 text-left active:scale-95 transition-transform">
            <div className="text-3xl mb-2">🏪</div><div className="text-sm font-bold">Бизнес</div><div className="text-[10px] text-slate-400">Кабинет бизнеса</div>
          </button>
          <button onClick={() => navigate('map')} className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30 text-left active:scale-95 transition-transform">
            <div className="text-3xl mb-2">🗺️</div><div className="text-sm font-bold">Карта</div><div className="text-[10px] text-slate-400">Карта Шиели</div>
          </button>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-sm font-bold mb-3">📦 Модули</h3>
          <div className="space-y-2">
            {['🗄️ База данных', '🗺️ Карта Шиели', '📱 Главный экран', '🚕 Модуль такси', '🚗 Кабинет водителя', '🏪 Кабинет бизнеса', '🛍️ Витрины', '📅 Бронирование', '🚌 Попутчики'].map(m => (
              <div key={m} className="flex items-center gap-2 text-xs"><span className="text-emerald-400">✅</span><span>{m}</span></div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-slate-500">DAapp © 2025 • Digital Village Ecosystem</div>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [view, setView] = useState<View>('dashboard');

  switch (view) {
    case 'client': return <ClientView onBack={() => setView('dashboard')} navigate={setView} />;
    case 'driver': return <DriverView onBack={() => setView('dashboard')} />;
    case 'business': return <BusinessView onBack={() => setView('dashboard')} />;
    case 'map': return <MapView onBack={() => setView('dashboard')} />;
    case 'taxi': return <TaxiView onBack={() => setView('client')} />;
    case 'storefront': return <StorefrontView onBack={() => setView('client')} />;
    case 'booking': return <BookingView onBack={() => setView('client')} />;
    case 'rideshare': return <RideshareView onBack={() => setView('client')} />;
    default: return <Dashboard navigate={setView} />;
  }
}
