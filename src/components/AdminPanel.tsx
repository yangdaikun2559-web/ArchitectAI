import React, { useState, useEffect } from 'react';
import { 
  Building, Cpu, ToggleLeft, ToggleRight, Trash2, 
  Plus, ShieldCheck, FileText, CheckCircle2, AlertCircle, UserCheck, Activity, RotateCcw,
  Users
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { api } from '../lib/api';
import { DEFAULT_MCUS, DEFAULT_COMPONENTS, MCU, ComponentItem } from '../data/defaultHardware';

interface AuditLog {
  id: string;
  email: string;
  projectName: string;
  platform: string;
  action: 'CREATE' | 'DOWNLOAD' | 'OPTIMIZE' | 'AUTH';
  timestamp: string;
  status: 'success' | 'failed' | 'warning';
  ip: string;
  details: string;
}

export const AdminPanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'mcus' | 'components' | 'rules' | 'templates' | 'audits' | 'users'>('mcus');
  const [loading, setLoading] = useState(false);

  const [mcus, setMcus] = useState<MCU[]>([]);
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', displayName: '', email: '', role: 'user', password: '' });

  async function loadUsers() {
    setLoading(true);
    try {
      const loadedUsers = await api.admin.listUsers();
      setUsers(loadedUsers);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeSubTab === 'users') {
      loadUsers();
    }
  }, [activeSubTab]);

  const deleteUser = async (id: string) => {
    if (confirm(lang === 'zh' ? "确定要删除该用户吗？该操作不可逆。" : "Are you sure you want to delete this user? This action is irreversible.")) {
      try {
        await api.admin.deleteUser(id);
        setUsers(prev => prev.filter(u => u.userId !== id));
      } catch (err) {
        console.error("Failed to delete user:", err);
      }
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    try {
      const response = await api.admin.saveUser(newUser);
      if (response.status === 'ok') {
        setUsers(prev => [...prev, response.user]);
        setNewUser({ username: '', displayName: '', email: '', role: 'user', password: '' });
        setShowUserForm(false);
      }
    } catch (err: any) {
      alert(err.message || (lang === 'zh' ? "保存用户失败。" : "Failed to save user."));
    }
  };

  const handleRoleChange = async (user: any, newRole: string) => {
    try {
      const updated = { ...user, role: newRole };
      const response = await api.admin.saveUser(updated);
      if (response.status === 'ok') {
        setUsers(prev => prev.map(u => u.userId === user.userId ? { ...u, role: newRole } : u));
      }
    } catch (err: any) {
      alert(err.message || (lang === 'zh' ? "更新角色失败。" : "Failed to update role."));
    }
  };

  useEffect(() => {
    async function loadHardware() {
      setLoading(true);
      try {
        const loadedMcus = await api.admin.listMcus();
        const loadedComps = await api.admin.listComponents();
        
        if (loadedMcus.length === 0 && loadedComps.length === 0) {
          setMcus(DEFAULT_MCUS);
          setComponents(DEFAULT_COMPONENTS);
        } else {
          setMcus(loadedMcus.length > 0 ? loadedMcus : DEFAULT_MCUS);
          setComponents(loadedComps.length > 0 ? loadedComps : DEFAULT_COMPONENTS);
        }
      } catch (err) {
        console.error("Local hardware load error, using default fallback data:", err);
        setMcus(DEFAULT_MCUS);
        setComponents(DEFAULT_COMPONENTS);
      } finally {
        setLoading(false);
      }
    }
    loadHardware();
  }, []);

  const handleInitializeDefaults = async () => {
    setLoading(true);
    try {
      for (const mcu of DEFAULT_MCUS) {
        await api.admin.saveMcu(mcu);
      }
      for (const comp of DEFAULT_COMPONENTS) {
        await api.admin.saveComponent(comp);
      }
      setMcus(DEFAULT_MCUS);
      setComponents(DEFAULT_COMPONENTS);
      alert(lang === 'zh' ? "默认硬件字典成功重置并写入本地数据库！" : "Default hardware dictionary successfully reset and written to local database!");
    } catch (err) {
      console.error("Failed to initialize default database values:", err);
      alert(lang === 'zh' ? "重置本地字典失败。" : "Resetting local dictionary failed.");
    } finally {
      setLoading(false);
    }
  };

  const [auditLogs] = useState<AuditLog[]>([
    { id: 'log_1', email: 'yangdaikun2559@gmail.com', projectName: '生鲜冷库冷链预警系统', platform: 'ESP32', action: 'DOWNLOAD', timestamp: '2026-05-30 17:40:12', status: 'success', ip: '114.112.90.35', details: '打包成果成功。Zip哈希：c8ef3a.. 耗时：210ms' },
    { id: 'log_2', email: 'yangdaikun2559@gmail.com', projectName: '大棚作物自动灌溉控制箱', platform: 'ESP32', action: 'CREATE', timestamp: '2026-05-30 17:38:05', status: 'success', ip: '114.112.90.35', details: '电路CAD编组接线和 firmware/main.cpp 编译全部圆满通过' },
    { id: 'log_3', email: 'guest_user391@cloud.com', projectName: 'STM32 无线多波段数据采集网关', platform: 'STM32', action: 'CREATE', timestamp: '2026-05-30 17:15:33', status: 'failed', ip: '14.22.181.109', details: 'API端口被拒绝（API Key过期或超限异常阻断）' },
    { id: 'log_4', email: 'developer@iot-expert.cn', projectName: '智慧停车车位红外检测板', platform: 'STM32', action: 'OPTIMIZE', timestamp: '2026-05-30 16:51:24', status: 'success', ip: '112.80.203.44', details: '需求“车位上有车时指示灯变红，无车时闪绿”成功校正提示词大纲' },
    { id: 'log_5', email: 'yangdaikun2559@gmail.com', projectName: '未命名项目', platform: 'ESP32', action: 'AUTH', timestamp: '2026-05-30 15:30:19', status: 'success', ip: '114.112.90.35', details: 'Google Oauth 证书登录校验授权通过：yangdaikun2559@gmail.com' },
    { id: 'log_6', email: 'yangdaikun2559@gmail.com', projectName: '空气净化检测仪', platform: 'ESP32', action: 'CREATE', timestamp: '2026-05-30 14:12:08', status: 'warning', ip: '114.112.90.35', details: 'I2C多设备可能导致电流不足：发现 SSD1306 + AHT20 接在同一个主线，引发警告' }
  ]);

  const [newMcu, setNewMcu] = useState<Partial<MCU>>({ name: '', family: 'ESP32', sdaPin: '', sclPin: '', rxPin: '', txPin: '', voltage: '3.3V', rom: '4MB' });
  const [showMcuForm, setShowMcuForm] = useState(false);

  const [newComp, setNewComp] = useState<Partial<ComponentItem>>({ name: '', type: 'Digital', category: 'Sensor', pinsUsed: 1, voltage: '3.3V', description: '' });
  const [showCompForm, setShowCompForm] = useState(false);

  const toggleMcuActive = async (id: string) => {
    const updated = mcus.map(m => m.id === id ? { ...m, active: !m.active } : m);
    setMcus(updated);
    const target = updated.find(m => m.id === id);
    if (target) {
      try {
        await api.admin.saveMcu(target);
      } catch (err) {
        console.error("Failed to update MCU locally:", err);
      }
    }
  };

  const toggleCompActive = async (id: string) => {
    const updated = components.map(c => c.id === id ? { ...c, active: !c.active } : c);
    setComponents(updated);
    const target = updated.find(c => c.id === id);
    if (target) {
      try {
        await api.admin.saveComponent(target);
      } catch (err) {
        console.error("Failed to update component locally:", err);
      }
    }
  };

  const handleAddMcu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcu.name) return;
    const item: MCU = {
      id: 'mcu_' + Date.now(),
      name: newMcu.name,
      family: newMcu.family as MCU['family'],
      sdaPin: newMcu.sdaPin || 'GP21',
      sclPin: newMcu.sclPin || 'GP22',
      rxPin: newMcu.rxPin || 'GP03',
      txPin: newMcu.txPin || 'GP01',
      voltage: newMcu.voltage || '3.3V',
      rom: newMcu.rom || '4MB',
      active: true
    };
    setMcus(prev => [...prev, item]);
    try {
      await api.admin.saveMcu(item);
    } catch (err) {
      console.error("Failed to write new MCU locally:", err);
    }
    setNewMcu({ name: '', family: 'ESP32', sdaPin: '', sclPin: '', rxPin: '', txPin: '', voltage: '3.3V', rom: '4MB' });
    setShowMcuForm(false);
  };

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComp.name) return;
    const item: ComponentItem = {
      id: 'comp_' + Date.now(),
      name: newComp.name,
      type: newComp.type as ComponentItem['type'],
      category: newComp.category as ComponentItem['category'],
      pinsUsed: Number(newComp.pinsUsed) || 1,
      voltage: (newComp.voltage === 'Both' ? 'Both' : newComp.voltage) as ComponentItem['voltage'],
      active: true,
      description: newComp.description || ''
    };
    setComponents(prev => [...prev, item]);
    try {
      await api.admin.saveComponent(item);
    } catch (err) {
      console.error("Failed to write new component locally:", err);
    }
    setNewComp({ name: '', type: 'Digital', category: 'Sensor', pinsUsed: 1, voltage: '3.3V', description: '' });
    setShowCompForm(false);
  };

  const deleteMcu = async (id: string) => {
    setMcus(prev => prev.filter(m => m.id !== id));
    try {
      await api.admin.deleteMcu(id);
    } catch (err) {
      console.error("Failed to delete MCU locally:", err);
    }
  };

  const deleteComponent = async (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    try {
      await api.admin.deleteComponent(id);
    } catch (err) {
      console.error("Failed to delete component locally:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="border-b border-neutral-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-lg text-neutral-900 tracking-tight">{t('adminTitle')}</h2>
          <p className="text-neutral-500 text-xs text-left mt-1">
            {t('adminDesc')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleInitializeDefaults}
            disabled={loading}
            className="px-3 py-1.5 border border-neutral-250 hover:border-neutral-850 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-950 font-sans text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title={lang === 'zh' ? '从系统内置的默认硬件配置重新覆盖写入本地数据库' : 'Override database dictionary with default presets'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '重置本地字典' : 'Reset Local Presets'}</span>
          </button>

          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-150 border border-neutral-200 text-neutral-700 font-mono text-[10px] font-bold uppercase rounded-lg">
            <Activity className="w-3.5 h-3.5 text-neutral-800 animate-pulse" />
            {t('demoEnvironment')}
          </span>
        </div>
      </div>

      {/* Sub Tabs Bar */}
      <div className="flex border-b border-neutral-200 gap-2">
        <button
          onClick={() => setActiveSubTab('mcus')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeSubTab === 'mcus'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-850'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4" />
            {t('tabMcus').replace(' ({mcus.length})', '')} ({mcus.length})
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('components')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeSubTab === 'components'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-850'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Building className="w-4 h-4" />
            {t('tabComponents').replace(' ({components.length})', '')} ({components.length})
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('rules')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeSubTab === 'rules'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-850'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            {t('tabRules')}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeSubTab === 'templates'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-850'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            {t('tabTemplates')}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('audits')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeSubTab === 'audits'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-850'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4" />
            {t('tabAudits').replace(' ({auditLogs.length})', '')} ({auditLogs.length})
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeSubTab === 'users'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-850'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {t('tabUsers')} ({users.length})
          </span>
        </button>
      </div>

      {/* Main Content Areas based on activeSubTab */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
        
        {/* Sub-tab 1: MCUs Admin */}
        {activeSubTab === 'mcus' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <p className="text-[11px] text-neutral-500 leading-normal">
                {t('mcuDbNotice')}
              </p>
              <button
                onClick={() => setShowMcuForm(!showMcuForm)}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-xs animate-none active:scale-95"
              >
                <Plus className="w-4 h-4" />
                {t('addMcuBtn')}
              </button>
            </div>

            {showMcuForm && (
              <form onSubmit={handleAddMcu} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/50 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('mcuNameLabel')}</label>
                  <input
                    type="text"
                    required
                    placeholder="例如: ESP32-S3-DevKitC-1"
                    value={newMcu.name}
                    onChange={e => setNewMcu({ ...newMcu, name: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('mcuFamilyLabel')}</label>
                  <select
                    value={newMcu.family}
                    onChange={e => setNewMcu({ ...newMcu, family: e.target.value as MCU['family'] })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="ESP32">{lang === 'zh' ? 'ESP32 家族' : 'ESP32 Family'}</option>
                    <option value="STM32">{lang === 'zh' ? 'STM32 家族' : 'STM32 Family'}</option>
                    <option value="Arduino">Arduino AVR</option>
                    <option value="Other">Other Cortex-M</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('mcuSdaLabel')}</label>
                  <input
                    type="text"
                    placeholder="GP18"
                    value={newMcu.sdaPin}
                    onChange={e => setNewMcu({ ...newMcu, sdaPin: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('mcuSclLabel')}</label>
                  <input
                    type="text"
                    placeholder="GP19"
                    value={newMcu.sclPin}
                    onChange={e => setNewMcu({ ...newMcu, sclPin: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('mcuRomLabel')}</label>
                  <input
                    type="text"
                    placeholder="8MB"
                    value={newMcu.rom}
                    onChange={e => setNewMcu({ ...newMcu, rom: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('mcuVoltageLabel')}</label>
                  <select
                    value={newMcu.voltage}
                    onChange={e => setNewMcu({ ...newMcu, voltage: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="3.3V">{lang === 'zh' ? '3.3V (主推荐)' : '3.3V (Recommended)'}</option>
                    <option value="5V">{lang === 'zh' ? '5V (标准老器件)' : '5V (Standard)'}</option>
                  </select>
                </div>
                <div className="sm:col-span-4 flex justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button type="button" onClick={() => setShowMcuForm(false)} className="px-3 py-1.5 border border-neutral-200 text-xs rounded-lg hover:border-neutral-600 font-semibold">{t('mcuFormCancel')}</button>
                  <button type="submit" className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold">{t('mcuFormSubmit')}</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto ring-1 ring-neutral-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] text-neutral-500 font-mono font-bold uppercase tracking-wider">
                    <th className="p-3">{t('mcuTableColName')}</th>
                    <th className="p-3">{t('mcuTableColFamily')}</th>
                    <th className="p-3">{t('mcuTableColPins')}</th>
                    <th className="p-3">{t('mcuTableColRom')}</th>
                    <th className="p-3">{t('mcuTableColVoltage')}</th>
                    <th className="p-3 text-center">{t('mcuTableColRecom')}</th>
                    <th className="p-3 text-right">{t('mcuTableColAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {mcus.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50/50 transition">
                      <td className="p-3 font-semibold text-neutral-850">{m.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                          m.family === 'ESP32' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : 
                          m.family === 'STM32' ? 'bg-sky-50 text-sky-700 border border-sky-150' : 'bg-neutral-50 text-neutral-600'
                        }`}>
                          {m.family}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px]">{m.sdaPin} • {m.sclPin}</td>
                      <td className="p-3 font-mono text-[11px] text-neutral-500">{m.rom}</td>
                      <td className="p-3 font-semibold text-neutral-600">{m.voltage}</td>
                      <td className="p-3 text-center">
                        <button type="button" onClick={() => toggleMcuActive(m.id)} className="focus:outline-none select-none inline-block">
                          {m.active ? (
                            <span className="text-emerald-600 font-bold flex items-center justify-center gap-1 hover:opacity-80">
                              <ToggleRight className="w-6 h-6 mt-0.5" />
                              <span className="text-[10px] font-bold">{t('mcuActive')}</span>
                            </span>
                          ) : (
                            <span className="text-neutral-400 flex items-center justify-center gap-1 hover:opacity-80">
                              <ToggleLeft className="w-6 h-6 mt-0.5" />
                              <span className="text-[10px] font-medium">{t('mcuInactive')}</span>
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => deleteMcu(m.id)}
                          className="p-1 px-2 border border-neutral-200 hover:border-rose-450 hover:text-rose-600 rounded-lg transition"
                          title={t('deleteMcuTitle')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sub-tab 2: Sensor Component Dictionary */}
        {activeSubTab === 'components' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <p className="text-[11px] text-neutral-500 leading-normal">
                {t('compDbNotice')}
              </p>
              <button
                onClick={() => setShowCompForm(!showCompForm)}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                {t('addComponentBtn')}
              </button>
            </div>

            {showCompForm && (
              <form onSubmit={handleAddComponent} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/50 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('compNameLabel')}</label>
                  <input
                    type="text"
                    required
                    placeholder="例如: SGP30 气体浓度传感器"
                    value={newComp.name}
                    onChange={e => setNewComp({ ...newComp, name: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('compTypeLabel')}</label>
                  <select
                    value={newComp.type}
                    onChange={e => setNewComp({ ...newComp, type: e.target.value as ComponentItem['type'] })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="I2C">{lang === 'zh' ? 'I2C 协议' : 'I2C Bus'}</option>
                    <option value="SPI">{lang === 'zh' ? 'SPI 协议' : 'SPI Bus'}</option>
                    <option value="Analog">{lang === 'zh' ? '模拟 (Analog)' : 'Analog'}</option>
                    <option value="Digital">{lang === 'zh' ? '单总线/数字 (Digital)' : 'Digital'}</option>
                    <option value="PWM">{lang === 'zh' ? 'PWM 控制' : 'PWM Control'}</option>
                    <option value="UART">{lang === 'zh' ? 'UART 串口' : 'UART Serial'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('compCategoryLabel')}</label>
                  <select
                    value={newComp.category}
                    onChange={e => setNewComp({ ...newComp, category: e.target.value as ComponentItem['category'] })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="Sensor">{lang === 'zh' ? '传感器 (Sensor)' : 'Sensor'}</option>
                    <option value="Display">{lang === 'zh' ? '显示器 (Display)' : 'Display'}</option>
                    <option value="Alert">{lang === 'zh' ? '蜂鸣报警器 (Alert)' : 'Buzzer/Alert'}</option>
                    <option value="Actuator">{lang === 'zh' ? '执行机构/舵机 (Actuator)' : 'Actuator'}</option>
                    <option value="Other">{lang === 'zh' ? '其它/通信模块 (Other)' : 'Other/Comm'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('compPinsLabel')}</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={newComp.pinsUsed}
                    onChange={e => setNewComp({ ...newComp, pinsUsed: Number(e.target.value) })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('compVoltageLabel')}</label>
                  <select
                    value={newComp.voltage}
                    onChange={e => setNewComp({ ...newComp, voltage: e.target.value as ComponentItem['voltage'] })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="3.3V">{lang === 'zh' ? '3.3V (如ESP专用)' : '3.3V (ESP Special)'}</option>
                    <option value="5V">{lang === 'zh' ? '5V (如经典开发板)' : '5V (Standard)'}</option>
                    <option value="Both">{lang === 'zh' ? '两者均兼容' : 'Both compatible'}</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{t('compDescLabel')}</label>
                  <input
                    type="text"
                    placeholder="输入该设备的驱动要求..."
                    value={newComp.description}
                    onChange={e => setNewComp({ ...newComp, description: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-4 flex justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button type="button" onClick={() => setShowCompForm(false)} className="px-3 py-1.5 border border-neutral-200 text-xs rounded-lg hover:border-neutral-600 font-semibold">{t('mcuFormCancel')}</button>
                  <button type="submit" className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold">{t('compFormSubmit')}</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto ring-1 ring-neutral-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] text-neutral-500 font-mono font-bold uppercase tracking-wider">
                    <th className="p-3">{t('compTableColName')}</th>
                    <th className="p-3">{t('compTableColCategory')}</th>
                    <th className="p-3">{t('compTableColType')}</th>
                    <th className="p-3">{t('compTableColPins')}</th>
                    <th className="p-3">{t('compTableColVoltage')}</th>
                    <th className="p-3">{t('compTableColDesc')}</th>
                    <th className="p-3 text-center">{t('compTableColStatus')}</th>
                    <th className="p-3 text-right">{t('compTableColAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {components.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50/50 transition">
                      <td className="p-3 font-semibold text-neutral-850">{c.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                          c.category === 'Sensor' ? 'bg-green-50 text-green-850 border border-green-200' :
                          c.category === 'Display' ? 'bg-amber-50 text-amber-850 border border-amber-200' : 'bg-red-50 text-red-800'
                        }`}>
                          {c.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-neutral-600">{c.type}</td>
                      <td className="p-3 font-mono text-center text-neutral-500 font-bold">{c.pinsUsed} Pin</td>
                      <td className="p-3 font-semibold text-neutral-600">{c.voltage}</td>
                      <td className="p-3 text-neutral-550 max-w-xs truncate" title={c.description}>{c.description}</td>
                      <td className="p-3 text-center">
                        <button type="button" onClick={() => toggleCompActive(c.id)} className="focus:outline-none select-none inline-block">
                          {c.active ? (
                            <span className="text-emerald-700 font-bold flex items-center justify-center gap-1 hover:opacity-85">
                              <ToggleRight className="w-6 h-6 mt-0.5" />
                              <span className="text-[10px] font-bold">{t('compActive')}</span>
                            </span>
                          ) : (
                            <span className="text-neutral-400 flex items-center justify-center gap-1 hover:opacity-85">
                              <ToggleLeft className="w-6 h-6 mt-0.5" />
                              <span className="text-[10px] font-medium">{t('compInactive')}</span>
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => deleteComponent(c.id)}
                          className="p-1 px-2 border border-neutral-200 hover:border-rose-450 hover:text-rose-600 rounded-lg transition"
                          title={t('deleteCompTitle')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sub-tab 3: Wiring rules */}
        {activeSubTab === 'rules' && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 flex gap-3 text-emerald-950">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-semibold text-xs">{t('rulesNoticeTitle')}</h4>
                <p className="text-[11px] text-emerald-750 font-sans leading-relaxed mt-1">
                  {t('rulesNoticeDesc')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="border border-neutral-200 p-5 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-neutral-900 border-b border-neutral-100 pb-2 flex gap-1 items-center">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  {t('rulesEspTitle')}
                </h4>
                <p className="text-[11px] text-neutral-500 leading-normal">
                  {t('rulesEspDesc')}
                </p>
                <div className="bg-neutral-50 p-3 rounded-lg font-mono text-[10px] text-neutral-600 uppercase space-y-1 whitespace-pre-line leading-relaxed">
                  {t('rulesEspList')}
                </div>
              </div>

              <div className="border border-neutral-200 p-5 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-neutral-900 border-b border-neutral-100 pb-2 flex gap-1 items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {t('rulesI2cTitle')}
                </h4>
                <p className="text-[11px] text-neutral-500 leading-normal">
                  {t('rulesI2cDesc')}
                </p>
                <div className="bg-neutral-50 p-3 rounded-lg font-mono text-[10px] text-neutral-600 uppercase space-y-1 whitespace-pre-line leading-relaxed">
                  {t('rulesI2cList')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 4: Generation templates */}
        {activeSubTab === 'templates' && (
          <div className="space-y-6">
            <h4 className="font-display font-semibold text-xs text-neutral-900 uppercase">{t('templateTitle')}</h4>
            <p className="text-[11px] text-neutral-500 leading-normal">
              {t('templateDesc')}
            </p>

            <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-neutral-900 px-4 py-2 border-b border-neutral-850 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-neutral-400">config/pins.h (固件引脚微模板)</span>
                <span className="bg-neutral-800 text-neutral-450 px-1.5 py-0.5 rounded text-[9px] font-mono">C++ Header</span>
              </div>
              <pre className="p-4 bg-neutral-950 font-mono text-[11px] text-neutral-300 overflow-x-auto text-left leading-relaxed">
{`#ifndef PINS_H
#define PINS_H

// --- 实时编译器自动配置 - {{PLATFORM}} ARCHITECTURE ---
#define WIRE_SDA {{SDA_PIN}}
#define WIRE_SCL {{SCL_PIN}}

// --- 感知器件与传感器 GPIO 引脚映射 ---
{{#each SENSORS}}
#define PIN_{{NAME}} {{PIN}} // {{DESCRIPTION}}
{{/each}}

// --- 告警与触动执行器引脚配置 ---
{{#each ALERTS}}
#define PIN_{{NAME}} {{PIN}}
{{/each}}

#endif // PINS_H`}
              </pre>
            </div>
          </div>
        )}

        {/* Sub-tab 5: Audits Logs */}
        {activeSubTab === 'audits' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <p className="text-[11px] text-neutral-500 leading-normal">
                {t('auditsNotice')}
              </p>
            </div>

            <div className="overflow-x-auto ring-1 ring-neutral-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] text-neutral-500 font-mono font-bold uppercase tracking-wider">
                    <th className="p-3">{t('auditsTableColUser')}</th>
                    <th className="p-3">{t('auditsTableColAction')}</th>
                    <th className="p-3">{t('auditsTableColProj')}</th>
                    <th className="p-3">{t('auditsTableColPlatform')}</th>
                    <th className="p-3">{t('auditsTableColIp')}</th>
                    <th className="p-3">{t('auditsTableColTime')}</th>
                    <th className="p-3">{t('auditsTableColDetail')}</th>
                    <th className="p-3 text-right">{t('auditsTableColStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50/50 transition leading-normal">
                      <td className="p-3 max-w-[130px] font-semibold truncate text-neutral-800">{log.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wide ${
                          log.action === 'DOWNLOAD' ? 'bg-indigo-50 text-indigo-750' :
                          log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-50 text-neutral-600'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-neutral-700 max-w-[120px] truncate">{log.projectName}</td>
                      <td className="p-3 font-mono text-[10px] text-neutral-500">{log.platform}</td>
                      <td className="p-3 font-mono text-[11px] text-neutral-500">{log.ip}</td>
                      <td className="p-3 text-neutral-450 font-mono text-[10px]">{log.timestamp}</td>
                      <td className="p-3 text-neutral-550 max-w-xs truncate text-[11px]">{log.details}</td>
                      <td className="p-3 text-right font-semibold">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-500' :
                          log.status === 'warning' ? 'bg-amber-450' : 'bg-rose-500'
                        }`} title={log.status.toUpperCase()} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sub-tab 6: Users Management */}
        {activeSubTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <p className="text-[11px] text-neutral-500 leading-normal text-left">
                {lang === 'zh' ? '管理物联网平台的所有注册账户。您可以新增用户、调整权限角色（普通用户/教师/管理员）或移出账户。' : 'Manage all registered accounts. You can add users, adjust roles (user/teacher/admin) or delete accounts.'}
              </p>
              <button
                onClick={() => setShowUserForm(!showUserForm)}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-xs active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {lang === 'zh' ? '新增系统用户' : 'Add User'}
              </button>
            </div>

            {showUserForm && (
              <form onSubmit={handleAddUser} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/50 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{lang === 'zh' ? '用户名 *' : 'Username *'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Young Dylen"
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{lang === 'zh' ? '显示名称' : 'Display Name'}</label>
                  <input
                    type="text"
                    placeholder="e.g. 戴伦"
                    value={newUser.displayName}
                    onChange={e => setNewUser({ ...newUser, displayName: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. youngdylen@example.com"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{lang === 'zh' ? '初始密码 *' : 'Password *'}</label>
                  <input
                    type="password"
                    required
                    placeholder="请输入密码"
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 block uppercase">{lang === 'zh' ? '用户角色' : 'Role'}</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full border border-neutral-250 p-2 text-xs rounded-lg bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="user">{lang === 'zh' ? '普通用户 (User)' : 'User'}</option>
                    <option value="teacher">{lang === 'zh' ? '教师 (Teacher)' : 'Teacher'}</option>
                    <option value="admin">{lang === 'zh' ? '管理员 (Admin)' : 'Admin'}</option>
                    <option value="superadmin">{lang === 'zh' ? '超级管理员 (Super Admin)' : 'Super Admin'}</option>
                  </select>
                </div>
                <div className="sm:col-span-4 flex justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button type="button" onClick={() => setShowUserForm(false)} className="px-3 py-1.5 border border-neutral-200 text-xs rounded-lg hover:border-neutral-600 font-semibold">{t('mcuFormCancel')}</button>
                  <button type="submit" className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold">{t('mcuFormSubmit')}</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto ring-1 ring-neutral-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] text-neutral-500 font-mono font-bold uppercase tracking-wider">
                    <th className="p-3">{lang === 'zh' ? '用户名' : 'Username'}</th>
                    <th className="p-3">{lang === 'zh' ? '显示名称' : 'Display Name'}</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">{lang === 'zh' ? '用户角色' : 'Role'}</th>
                    <th className="p-3">{lang === 'zh' ? '注册时间' : 'Created At'}</th>
                    <th className="p-3 text-right">{t('mcuTableColAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {users.map((u) => (
                    <tr key={u.userId} className="hover:bg-neutral-50/50 transition">
                      <td className="p-3 font-semibold text-neutral-850">{u.username}</td>
                      <td className="p-3 text-neutral-600">{u.displayName || '-'}</td>
                      <td className="p-3 text-neutral-500 font-mono text-[11px]">{u.email || '-'}</td>
                      <td className="p-3">
                        <select
                          value={u.role || 'user'}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border bg-white focus:outline-none cursor-pointer ${
                            u.role === 'admin' ? 'text-rose-700 border-rose-200 bg-rose-50/50' : 
                            u.role === 'superadmin' ? 'text-purple-750 border-purple-200 bg-purple-50/50' : 
                            u.role === 'teacher' ? 'text-emerald-700 border-emerald-200 bg-emerald-50/50' :
                            'text-indigo-700 border-indigo-150 bg-indigo-50/50'
                          }`}
                        >
                          <option value="user">User</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      </td>
                      <td className="p-3 text-neutral-450 font-mono text-[10px]">
                        {new Date(u.createdAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => deleteUser(u.userId)}
                          className="p-1 px-2 border border-neutral-200 hover:border-rose-450 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title={lang === 'zh' ? '删除用户' : 'Delete User'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
