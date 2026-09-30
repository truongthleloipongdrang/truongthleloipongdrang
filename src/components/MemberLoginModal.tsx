import React, { useState } from 'react';
import { X, Mail, User, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { MemberUser } from '../types';

interface MemberLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (member: MemberUser) => void;
}

export const MemberLoginModal: React.FC<MemberLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  if (!isOpen) return null;

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Giáo viên' | 'Phụ huynh' | 'Học sinh' | 'Cán bộ'>('Phụ huynh');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Vui lòng nhập đúng định dạng địa chỉ Gmail/Email hợp lệ.');
      return;
    }

    const newMember: MemberUser = {
      id: 'mem-' + Date.now(),
      email: email.trim().toLowerCase(),
      name: name.trim() || email.split('@')[0],
      role,
      loginAt: new Date().toLocaleString('vi-VN'),
    };

    onLoginSuccess(newMember);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold block">
                CỔNG THÀNH VIÊN
              </span>
              <h3 className="text-base font-bold text-white">
                Đăng Nhập Thành Viên (Gmail)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
            <p className="font-semibold flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1 text-emerald-700" />
              Quyền hạn thành viên:
            </p>
            <p className="mt-1 text-emerald-800">
              Đăng nhập bằng Gmail giúp quý phụ huynh, học sinh và thầy cô có quyền{' '}
              <strong>Tải tài liệu về máy</strong> và <strong>Đóng góp học liệu lên kho</strong>. Thông tin người tải/tải lên được lưu trữ minh bạch để quản trị viên theo dõi.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Địa chỉ Gmail / Email của bạn
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="vidu: phuhuynh@gmail.com"
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg pl-9 pr-3.5 py-2.5 text-sm font-medium text-slate-900"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Họ và tên người dùng
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-slate-900"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Bạn là:
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3.5 py-2.5 text-sm text-slate-900 font-medium"
            >
              <option value="Phụ huynh">Phụ huynh học sinh</option>
              <option value="Giáo viên">Giáo viên trường Lê Lợi</option>
              <option value="Học sinh">Học sinh</option>
              <option value="Cán bộ">Cán bộ / Khách mời</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Xác Nhận & Đăng Nhập</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
