'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  LogIn,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { GoogleIcon } from '@/components/BrandIcons';
import { PRESET_AVATARS } from '@/lib/security';

type AuthMode = 'login' | 'register' | 'reset';
type StrengthTier = 'empty' | 'short' | 'medium' | 'strong' | 'very-strong';

function getPasswordStrength(password: string): { tier: StrengthTier; label: string } {
  let score = 0;
  if (password.length >= 8) score += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 25;
  if (/\d/.test(password)) score += 25;
  if (/[^a-zA-Z0-9]/.test(password)) score += 25;

  if (password.length === 0) return { tier: 'empty', label: '' };
  if (password.length < 8) return { tier: 'short', label: 'Çok kısa (en az 8 karakter)' };
  if (score <= 50) return { tier: 'medium', label: 'Orta' };
  if (score <= 75) return { tier: 'strong', label: 'Güçlü' };
  return { tier: 'very-strong', label: 'Çok Güçlü' };
}

export function AuthClient() {
  const router = useRouter();
  const { user, loading, loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword } =
    useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<AuthMode>('login');
  const [busy, setBusy] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  const [username, setUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(PRESET_AVATARS[0].url);

  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.replace('/profile');
    }
  }, [loading, user, router]);

  const strength = getPasswordStrength(regPassword);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await loginWithEmail(loginEmail, loginPassword);
      showToast('Hoş geldiniz! Oturumunuz açıldı.', 'success');
      router.push('/');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Giriş yapılamadı.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword.length < 8) {
      showToast('Şifreniz en az 8 karakter uzunluğunda olmalıdır.', 'error');
      return;
    }
    setBusy(true);
    try {
      await registerWithEmail({
        email: regEmail,
        password: regPassword,
        username,
        photoURL: selectedAvatar,
      });
      showToast(
        'Hesabınız oluşturuldu! E-posta doğrulama bağlantısı adresinize gönderildi.',
        'success'
      );
      router.push('/');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Kayıt tamamlanamadı.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setBusy(true);
    try {
      await loginWithGoogle();
      showToast('Google hesabınızla giriş yapıldı!', 'success');
      router.push('/');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google ile giriş yapılamadı.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await resetPassword(resetEmail);
      showToast(
        'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Gelen kutunuzu kontrol edin.',
        'success'
      );
      setMode('login');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sıfırlama e-postası gönderilemedi.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-24">
          <div className="brand-logo flex-center mb-8 text-2xl">
            <span className="brand-logo-mark" aria-hidden="true">
              <Image
                src="/img/logo-mark.png"
                alt=""
                width={38}
                height={38}
                className="brand-logo-mark-img"
              />
            </span>
            <span>
              Ai<span className="brand-logo-accent">Flix</span> Pass
            </span>
          </div>
          <p className="m-0 text-secondary text-base">
            {mode === 'login' && 'Kişisel listelerin ve sinema topluluğuna erişmek için giriş yap'}
            {mode === 'register' && 'Ücretsiz hesabını oluştur, favorilerini kaydet ve tartışmalara katıl'}
            {mode === 'reset' && 'E-posta adresine şifre sıfırlama bağlantısı gönderelim'}
          </p>
        </div>

        {mode !== 'reset' && (
          <div className="mode-switch" role="tablist" aria-label="Hesap işlemi seçimi">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`mode-switch-btn${mode === 'login' ? ' is-active' : ''}`}
              onClick={() => setMode('login')}
            >
              <LogIn size={15} aria-hidden="true" /> Giriş Yap
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`mode-switch-btn${mode === 'register' ? ' is-active' : ''}`}
              onClick={() => setMode('register')}
            >
              <UserPlus size={15} aria-hidden="true" /> Kayıt Ol
            </button>
          </div>
        )}

        {mode !== 'reset' && (
          <>
            <button
              type="button"
              className="btn btn-secondary w-full"
              disabled={busy}
              onClick={handleGoogleLogin}
            >
              <GoogleIcon size={18} />
              <span>Google ile Devam Et</span>
            </button>
            <div className="divider-or">veya e-posta ile</div>
          </>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-field">
              <label htmlFor="login-email" className="form-label">
                E-posta Adresi
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="ornek@eposta.com"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <div className="flex-between">
                <label htmlFor="login-password" className="form-label">
                  Şifre
                </label>
                <button
                  type="button"
                  className="forgot-link-btn"
                  onClick={() => {
                    setResetEmail(loginEmail);
                    setMode('reset');
                  }}
                >
                  Şifremi Unuttum
                </button>
              </div>
              <div className="input-password-wrap">
                <input
                  id="login-password"
                  type={showLoginPass ? 'text' : 'password'}
                  className="form-input input-with-eye"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-eye-btn"
                  aria-label={showLoginPass ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  onClick={() => setShowLoginPass((v) => !v)}
                >
                  {showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full mt-8"
              disabled={busy}
            >
              <LogIn size={17} aria-hidden="true" />
              {busy ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-field">
              <label htmlFor="register-username" className="form-label">
                Kullanıcı Adı
              </label>
              <input
                id="register-username"
                type="text"
                className="form-input"
                placeholder="Sinemasever"
                minLength={2}
                maxLength={40}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="register-email" className="form-label">
                E-posta Adresi
              </label>
              <input
                id="register-email"
                type="email"
                className="form-input"
                placeholder="ornek@eposta.com"
                autoComplete="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="register-password" className="form-label">
                Şifre (En az 8 karakter)
              </label>
              <div className="input-password-wrap">
                <input
                  id="register-password"
                  type={showRegPass ? 'text' : 'password'}
                  className="form-input input-with-eye"
                  placeholder="En az 8 karakter"
                  minLength={8}
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-eye-btn"
                  aria-label={showRegPass ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  onClick={() => setShowRegPass((v) => !v)}
                >
                  {showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {regPassword.length > 0 && (
                <>
                  <div className="password-meter" aria-hidden="true">
                    <div className="password-meter-fill" data-tier={strength.tier} />
                  </div>
                  <span className="form-hint password-hint" data-tier={strength.tier}>
                    Şifre gücü: {strength.label}
                  </span>
                </>
              )}
            </div>

            <div className="form-field">
              <span className="form-label">Profil Avatarı Seçin</span>
              <div className="avatar-picker-grid" role="radiogroup" aria-label="Profil avatarı">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = selectedAvatar === av.url;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`avatar-choice${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setSelectedAvatar(av.url)}
                    >
                      <Image src={av.url} alt={av.label} width={52} height={52} />
                      <span className="avatar-choice-label">{av.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-gradient btn-lg w-full mt-8"
              disabled={busy}
            >
              <UserPlus size={17} aria-hidden="true" />
              {busy ? 'Hesap Oluşturuluyor...' : 'Hesap Oluştur'}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div className="form-field">
              <label htmlFor="reset-email" className="form-label">
                Kayıtlı E-posta Adresiniz
              </label>
              <input
                id="reset-email"
                type="email"
                className="form-input"
                placeholder="ornek@eposta.com"
                autoComplete="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full mb-12"
              disabled={busy}
            >
              <Mail size={17} aria-hidden="true" />
              {busy ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
            </button>

            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => setMode('login')}
            >
              <KeyRound size={15} aria-hidden="true" /> Giriş ekranına dön
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
