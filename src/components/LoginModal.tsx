import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { X, User, Lock, Mail, FileText, Loader2, Sparkles } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { registerLocal, loginLocal } = useAuth();
  const { t } = useLanguage();
  
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('账号和密码不能为空。');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致。');
          setLoading(false);
          return;
        }
        await registerLocal(cleanUsername, email.trim(), password, displayName.trim());
      } else {
        await loginLocal(cleanUsername, password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '认证操作失败。');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-neutral-100 shadow-2xl p-8 overflow-hidden space-y-6">
        
        {/* Subtle grid pattern background for modern look */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 rounded-full transition hover:bg-neutral-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center space-y-1.5 relative">
          <div className="w-10 h-10 bg-neutral-900 text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-display font-extrabold text-neutral-900 tracking-tight">
            {isRegister ? '创建系统账户' : '系统用户登录'}
          </h2>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-700 font-sans text-left">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div className="space-y-3 text-left">
            
            {/* Username */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-450 uppercase tracking-wider mb-1">
                账号
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入您的账号 (如 admin)"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-xl text-xs font-semibold text-neutral-800 transition duration-150"
                  required
                />
              </div>
            </div>

            {/* Additional Fields for Register */}
            {isRegister && (
              <>
                {/* Display Name */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-450 uppercase tracking-wider mb-1">
                    真实姓名 / 昵称
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="例如：张三"
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-xl text-xs font-semibold text-neutral-800 transition duration-150"
                      required
                    />
                  </div>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-450 uppercase tracking-wider mb-1">
                    邮箱地址 <span className="text-neutral-400 lowercase">(选填)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="developer@iot-expert.cn"
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-xl text-xs font-semibold text-neutral-800 transition duration-150"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-450 uppercase tracking-wider mb-1">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入登录密码"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-xl text-xs font-semibold text-neutral-800 transition duration-150"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            {isRegister && (
              <div>
                <label className="block text-[10px] font-bold text-neutral-450 uppercase tracking-wider mb-1">
                  确认密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入以确认密码"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-xl text-xs font-semibold text-neutral-800 transition duration-150"
                    required
                  />
                </div>
              </div>
            )}

          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRegister ? '正在创建账号...' : '正在登录...'}
              </>
            ) : (
              isRegister ? '确认注册并登录' : '登 录'
            )}
          </button>
        </form>

        {/* Switch Link */}
        <div className="text-center text-xs font-medium font-sans">
          <span className="text-neutral-400">
            {isRegister ? '已有账户？' : '还没有账号？'}
          </span>
          <button 
            onClick={toggleMode}
            className="ml-1.5 text-neutral-900 hover:underline font-bold transition"
          >
            {isRegister ? '立即登录' : '立即注册账号'}
          </button>
        </div>

      </div>
    </div>
  );
};
