<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const redirectPath = () => route.query.redirect?.toString() || '/dashboard'

onMounted(async () => {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (session?.user && isAdminUser(session.user)) {
    router.replace(redirectPath())
  } else if (session?.user) {
    await supabase.auth.signOut()
    error.value = 'Akses hanya untuk akun admin.'
  }
})

const login = async () => {
  error.value = ''
  loading.value = true

  try {
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    })

    if (loginError) {
      error.value = 'Email atau password salah. Silakan cek kembali.'
      return
    }

    if (!data.user || !isAdminUser(data.user)) {
      await supabase.auth.signOut()
      error.value = 'Akses hanya untuk akun admin.'
      return
    }

    router.replace(redirectPath())
  } catch (err) {
    error.value = 'Terjadi kesalahan saat masuk. Coba lagi.'
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="gradient-bg"></div>
    <div class="gradient-blob blob-1"></div>
    <div class="gradient-blob blob-2"></div>
    
    <!-- Main Content -->
    <div class="login-content">
      <div class="login-card">
        <!-- Header -->
        <div class="login-header">
          <div class="logo-circle">
            <img src="/logo.svg" alt="SIMSTOK logo" />
          </div>
          <h1 class="login-title">SIMSTOK</h1>
          <p class="login-subtitle">Sistem Monitoring Stok Barang</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="login" class="login-form">
          <!-- Email Input -->
          <div class="form-group">
            <label for="email" class="form-label">Email</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22 6 12 13 2 6"></polyline>
              </svg>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="admin@example.com"
                class="form-input"
                required
              />
            </div>
          </div>

          <!-- Password Input -->
          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                <circle cx="12" cy="16" r="1"></circle>
              </svg>
              <input
                id="password"
                v-model="password"
                type="password"
                placeholder="Masukkan password"
                class="form-input"
                required
              />
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="error-message">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {{ error }}
          </div>

          <!-- Login Button -->
          <button type="submit" class="login-button" :disabled="loading">
            <span v-if="!loading" class="button-text">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
              Masuk ke Dashboard
            </span>
            <span v-else class="button-loader">
              <span class="spinner"></span>
              Loading...
            </span>
          </button>
        </form>

        <!-- Demo Credentials Info -->
        <div class="demo-info-card">
          <div class="demo-info-header">
            <svg class="demo-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Akun Demo Penilaian</span>
          </div>
          <div class="demo-info-body">
            <div class="demo-info-row">
              <span class="demo-info-label">Email:</span>
              <code class="demo-info-code">admin@gmail.com</code>
            </div>
            <div class="demo-info-row">
              <span class="demo-info-label">Password:</span>
              <code class="demo-info-code">admin12345</code>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="login-footer">
          <p>Gunakan akun administrator untuk mengakses sistem</p>
        </div>
      </div>

      <!-- Info Box -->
      <div class="info-box">
        <div class="info-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          <span>Akses Terkontrol</span>
        </div>
        <div class="info-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"></path>
          </svg>
          <span>Monitoring Real-time</span>
        </div>
        <div class="info-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Dashboard Komprehensif</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 55%, #dbeafe 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
}

/* Animated Background */
.gradient-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at top left, rgba(37, 99, 235, 0.16), transparent 30%),
    linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #dbeafe 100%);
  animation: gradient-shift 14s ease infinite;
  z-index: 0;
}

@keyframes gradient-shift {
  0%, 100% {
    background: radial-gradient(circle at top left, rgba(37, 99, 235, 0.16), transparent 30%),
      linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #dbeafe 100%);
  }
  50% {
    background: radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.2), transparent 35%),
      linear-gradient(135deg, #eef4ff 0%, #dbeafe 45%, #f8fafc 100%);
  }
}

/* Floating Blobs */
.gradient-blob {
  position: absolute;
  filter: blur(40px);
  opacity: 0.5;
  animation: blob-animation 7s infinite;
  z-index: 0;
}

.blob-1 {
  width: 300px;
  height: 300px;
  background: rgba(37, 99, 235, 0.16);
  bottom: -50px;
  left: -50px;
  animation-delay: 0s;
}

.blob-2 {
  width: 250px;
  height: 250px;
  background: rgba(96, 165, 250, 0.2);
  top: -50px;
  right: -50px;
  animation-delay: 2s;
}

@keyframes blob-animation {
  0%, 100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(30px, -50px);
  }
  50% {
    transform: translate(-20px, 20px);
  }
  75% {
    transform: translate(50px, 50px);
  }
}

.login-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 500px;
  padding: 16px;
  animation: fade-in 0.8s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Login Card */
.login-card {
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);
  border-radius: 18px;
  padding: 32px 28px;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08), 0 0 1px rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

/* Header */
.login-header {
  text-align: center;
  margin-bottom: 24px;
  animation: slide-down 0.6s ease-out;
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo-circle {
  width: 58px;
  height: 58px;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
  color: white;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.logo-circle img {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}

.login-subtitle {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* Form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: #999;
  pointer-events: none;
  transition: color 0.3s ease;
  stroke-width: 2;
}

.form-input {
  width: 100%;
  padding: 11px 14px 11px 42px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.3s ease;
  background: #f8fafc;
  color: #0f172a;
}

.form-input::placeholder {
  color: #bbb;
}

.form-input:focus {
  outline: none;
  border-color: #2563eb;
  background: white;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.form-input:focus + .input-icon,
.input-wrapper:has(.form-input:focus) .input-icon {
  color: #2563eb;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
  animation: shake 0.5s ease;
}

.error-message svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

/* Login Button */
.login-button {
  padding: 11px 20px;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);
  position: relative;
  overflow: hidden;
}

.login-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  transition: left 0.3s ease;
}

.login-button:hover:not(:disabled)::before {
  left: 100%;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.25);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.button-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.button-text svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

.button-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Footer */
.login-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.login-footer p {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

/* Info Box */
.info-box {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  animation: fade-in 0.8s ease-out;
  animation-fill-mode: both;
  cursor: pointer;
  transition: all 0.3s ease;
}

.info-item:hover {
  background: rgba(255, 255, 255, 0.98);
  transform: translateY(-5px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.info-item:nth-child(1) {
  animation-delay: 0.2s;
}

.info-item:nth-child(2) {
  animation-delay: 0.4s;
}

.info-item:nth-child(3) {
  animation-delay: 0.6s;
}

.info-item svg {
  width: 28px;
  height: 28px;
  color: #2563eb;
  stroke-width: 2;
}

.info-item span {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Demo Info Card */
.demo-info-card {
  margin-top: 18px;
  margin-bottom: 18px;
  padding: 12px 16px;
  background: rgba(37, 99, 235, 0.05);
  border: 1px dashed rgba(37, 99, 235, 0.25);
  border-radius: 12px;
  font-size: 13px;
  color: #1e40af;
  text-align: left;
  animation: fade-in 0.6s ease-out;
}

.demo-info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  margin-bottom: 8px;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: #2563eb;
}

.demo-info-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
  color: #2563eb;
}

.demo-info-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.demo-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.demo-info-label {
  font-weight: 600;
  color: #475569;
}

.demo-info-code {
  background: #ffffff;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid #dbeafe;
  font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
  font-weight: 700;
  font-size: 12px;
  color: #0f172a;
  user-select: all;
}

/* Responsive */
@media (max-width: 600px) {
  .login-card {
    padding: 24px 18px;
  }

  .login-title {
    font-size: 22px;
  }

  .info-box {
    grid-template-columns: 1fr;
  }

  .logo-circle {
    width: 60px;
    height: 60px;
  }

  .logo-circle img {
    width: 44px;
    height: 44px;
  }

  .gradient-blob {
    filter: blur(20px);
  }

  .blob-1 {
    width: 200px;
    height: 200px;
  }

  .blob-2 {
    width: 150px;
    height: 150px;
  }
}
</style>