<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

const totalBarang = ref(0)
const totalStok = ref(0)
const totalMasuk = ref(0)
const totalKeluar = ref(0)

const stokRendah = ref([])

const chartData = ref([])
const insightText = ref('')
const todayLabel = ref('')
const aktivitasTerbaru = ref([])

const sidebarOpen = ref(true)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const logout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}

const updateTodayLabel = () => {
  todayLabel.value = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date())
}

const loadDashboard = async () => {
  const { data: barang } = await supabase
    .from('barang')
    .select('*')

  const { data: masuk } = await supabase
    .from('barang_masuk')
    .select('*')

  const { data: keluar } = await supabase
    .from('barang_keluar')
    .select('*')

  totalBarang.value = barang?.length || 0

  totalStok.value =
    barang?.reduce((a, b) => a + b.stok, 0) || 0

  totalMasuk.value =
    masuk?.reduce((a, b) => a + b.jumlah, 0) || 0

  totalKeluar.value =
    keluar?.reduce((a, b) => a + b.jumlah, 0) || 0

  stokRendah.value =
    barang?.filter(item => item.stok < 5) || []

  const totalItems = Math.max(totalBarang.value, 1)
  const safeStock = barang?.filter(item => item.stok > 20).length || 0
  const mediumStock = barang?.filter(item => item.stok >= 5 && item.stok <= 20).length || 0
  const lowStock = barang?.filter(item => item.stok < 5).length || 0

  chartData.value = [
    { label: 'Aman', value: safeStock, color: '#28a745' },
    { label: 'Menengah', value: mediumStock, color: '#f59e0b' },
    { label: 'Rendah', value: lowStock, color: '#dc3545' }
  ]

  const stockRatio = Math.round((lowStock / totalItems) * 100)
  insightText.value = stockRatio > 0
    ? `Ada ${lowStock} barang yang membutuhkan perhatian karena stoknya rendah.`
    : 'Semua barang saat ini dalam kondisi aman.'

  // Pemrosesan Aktivitas Terbaru
  const mappedMasuk = (masuk || []).map((item) => {
    const barangItem = (barang || []).find((b) => b.id_barang === item.id_barang)
    return {
      id: `masuk-${item.id_barang_masuk}`,
      nama_barang: barangItem?.nama_barang || 'Barang Terhapus',
      tipe: 'masuk',
      jumlah: item.jumlah,
      tanggal: new Date(item.tanggal)
    }
  })

  const mappedKeluar = (keluar || []).map((item) => {
    const barangItem = (barang || []).find((b) => b.id_barang === item.id_barang)
    return {
      id: `keluar-${item.id_barang_keluar}`,
      nama_barang: barangItem?.nama_barang || 'Barang Terhapus',
      tipe: 'keluar',
      jumlah: item.jumlah,
      tanggal: new Date(item.tanggal)
    }
  })

  aktivitasTerbaru.value = [...mappedMasuk, ...mappedKeluar]
    .sort((a, b) => b.tanggal - a.tanggal)
    .slice(0, 5)
}

onMounted(() => {
  loadDashboard()
  updateTodayLabel()
})
</script>

<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': !sidebarOpen }">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <a href="#" class="sidebar-logo">
          <img src="/logo.svg" alt="SIMSTOK logo" />
          <span>SIMSTOK</span>
        </a>
      </div>
      <ul class="sidebar-menu">
        <li><router-link to="/dashboard" class="active"><i class="bi bi-speedometer2"></i> Dashboard</router-link></li>
        <li><router-link to="/barang"><i class="bi bi-list"></i> Data Barang</router-link></li>
        <li><router-link to="/barang-masuk"><i class="bi bi-arrow-down-circle"></i> Barang Masuk</router-link></li>
        <li><router-link to="/barang-keluar"><i class="bi bi-arrow-up-circle"></i> Barang Keluar</router-link></li>
        <li><router-link to="/monitoring"><i class="bi bi-graph-up"></i> Monitoring</router-link></li>
      </ul>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Top Bar -->
      <div class="topbar">
        <div class="topbar-title-wrap">
          <button class="sidebar-toggle" @click="toggleSidebar">
            <i :class="sidebarOpen ? 'bi bi-x-lg' : 'bi bi-list'"></i>
          </button>
          <div class="topbar-heading">
            <div class="topbar-kicker">Selamat datang</div>
            <h1 class="topbar-title">Dashboard</h1>
          </div>
          <span class="topbar-badge"><i class="bi bi-shield-check"></i> Admin Panel</span>
        </div>
        <div class="topbar-actions">
          <div class="topbar-date-pill">
            <i class="bi bi-calendar3"></i>
            <span>{{ todayLabel }}</span>
          </div>
          <button class="logout-icon-btn" @click="logout" title="Logout">
            <i class="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="content">

        <!-- Statistics Grid -->
        <div class="stats-grid">
          <div class="stat-card stat-blue animate-in">
            <div class="stat-icon"><i class="bi bi-box2"></i></div>
            <div>
              <div class="stat-label">Total Barang</div>
              <div class="stat-value">{{ totalBarang }}</div>
            </div>
          </div>
          <div class="stat-card stat-green animate-in">
            <div class="stat-icon"><i class="bi bi-archive"></i></div>
            <div>
              <div class="stat-label">Total Stok</div>
              <div class="stat-value">{{ totalStok }}</div>
            </div>
          </div>
          <div class="stat-card stat-cyan animate-in">
            <div class="stat-icon"><i class="bi bi-arrow-down-circle"></i></div>
            <div>
              <div class="stat-label">Barang Masuk</div>
              <div class="stat-value">{{ totalMasuk }}</div>
            </div>
          </div>
          <div class="stat-card stat-red animate-in">
            <div class="stat-icon"><i class="bi bi-arrow-up-circle"></i></div>
            <div>
              <div class="stat-label">Barang Keluar</div>
              <div class="stat-value">{{ totalKeluar }}</div>
            </div>
          </div>
        </div>



        <!-- Bottom Dashboard Grid (Low Stock & Recent Activity) -->
        <div class="dashboard-bottom-grid">
          <!-- Low Stock Alert -->
          <div class="low-stock-card animate-in">
            <div class="low-stock-head">
              <h2>Barang dengan Stok Rendah</h2>
              <span class="low-stock-pill"><i class="bi bi-exclamation-triangle"></i> Priority</span>
            </div>

            <div v-if="stokRendah.length === 0" class="empty-state">
              <i class="bi bi-shield-check" style="font-size: 28px; color: #16a34a; display: block; margin-bottom: 8px;"></i>
              Semua stok barang dalam kondisi aman
            </div>

            <div v-else style="overflow-x: auto;">
              <table class="dashboard-table">
                <thead>
                  <tr>
                    <th>Nama Barang</th>
                    <th>Kategori</th>
                    <th>Stok</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in stokRendah" :key="item.id_barang">
                    <td>{{ item.nama_barang }}</td>
                    <td>{{ item.kategori }}</td>
                    <td><span class="badge badge-danger">{{ item.stok }} unit</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="activity-card animate-in">
            <div class="activity-head">
              <h2>Aktivitas Transaksi Terbaru</h2>
              <span class="activity-pill"><i class="bi bi-clock-history"></i> Aktivitas</span>
            </div>

            <div v-if="aktivitasTerbaru.length === 0" class="empty-state">
              <i class="bi bi-clipboard-x" style="font-size: 28px; color: #64748b; display: block; margin-bottom: 8px;"></i>
              Belum ada riwayat transaksi masuk/keluar
            </div>

            <div v-else style="overflow-x: auto;">
              <table class="dashboard-table">
                <thead>
                  <tr>
                    <th>Barang</th>
                    <th class="text-center">Tipe</th>
                    <th class="text-center">Jumlah</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="act in aktivitasTerbaru" :key="act.id">
                    <td>{{ act.nama_barang }}</td>
                    <td class="text-center">
                      <span class="badge" :class="act.tipe === 'masuk' ? 'badge-success' : 'badge-danger'">
                        {{ act.tipe === 'masuk' ? 'Masuk' : 'Keluar' }}
                      </span>
                    </td>
                    <td class="text-center font-bold">
                      <span :class="act.tipe === 'masuk' ? 'text-success-bold' : 'text-danger-bold'">
                        {{ act.tipe === 'masuk' ? '+' : '-' }}{{ act.jumlah }}
                      </span>
                    </td>
                    <td>{{ act.tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
  margin-bottom: 24px;
  border-radius: 18px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);
}

.topbar-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.topbar-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.topbar-kicker {
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.topbar-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
}

.topbar-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid #bfdbfe;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.topbar-date-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #e2e8f0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.03);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-blue {
  border-color: #bfdbfe;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
}
.stat-blue:hover {
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.08);
}

.stat-green {
  border-color: #bbf7d0;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
}
.stat-green:hover {
  box-shadow: 0 12px 28px rgba(22, 163, 74, 0.08);
}

.stat-cyan {
  border-color: #a5f3fc;
  background: linear-gradient(135deg, #ffffff 0%, #ecfeff 100%);
}
.stat-cyan:hover {
  box-shadow: 0 12px 28px rgba(6, 182, 212, 0.08);
}

.stat-red {
  border-color: #fecaca;
  background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
}
.stat-red:hover {
  box-shadow: 0 12px 28px rgba(220, 38, 38, 0.08);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 14px;
  font-size: 22px;
  color: #ffffff;
}

.stat-blue .stat-icon { background: linear-gradient(135deg, #2563eb, #3b82f6); }
.stat-green .stat-icon { background: linear-gradient(135deg, #16a34a, #4ade80); }
.stat-cyan .stat-icon { background: linear-gradient(135deg, #0891b2, #22d3ee); }
.stat-red .stat-icon { background: linear-gradient(135deg, #dc2626, #f87171); }

.stat-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}

.menu-card,
.low-stock-card,
.activity-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.03);
}

.menu-card h2,
.low-stock-head h2,
.activity-head h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

/* Menu Grid Card and Aksi Cepat */
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.action-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.action-card i {
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
}

.action-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-title {
  font-weight: 700;
  font-size: 14px;
}

.action-desc {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.8;
}

.action-blue { background: #f0f9ff; color: #0369a1; border-color: #e0f2fe; }
.action-blue i { background: #e0f2fe; color: #0284c7; }

.action-green { background: #f0fdf4; color: #15803d; border-color: #dcfce7; }
.action-green i { background: #dcfce7; color: #16a34a; }

.action-red { background: #fef2f2; color: #b91c1c; border-color: #fee2e2; }
.action-red i { background: #fee2e2; color: #dc2626; }

.action-purple { background: #faf5ff; color: #6d28d9; border-color: #f3e8ff; }
.action-purple i { background: #f3e8ff; color: #7c3aed; }

/* Bottom Sections styling */
.low-stock-head,
.activity-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.low-stock-pill,
.activity-pill {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.low-stock-pill {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fee2e2;
}

.activity-pill {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #dbeafe;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.dashboard-bottom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

/* Dashboard Tables */
.dashboard-table {
  width: 100%;
  border-collapse: collapse;
}

.dashboard-table th {
  padding: 12px 14px;
  text-align: left;
  background: #f8fafc;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #e2e8f0;
}

.dashboard-table td {
  padding: 14px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  font-size: 14px;
  vertical-align: middle;
}

.dashboard-table tbody tr {
  transition: background-color 0.2s ease;
}

.dashboard-table tbody tr:hover {
  background-color: #f8fafc;
}

.dashboard-table th:first-child,
.dashboard-table td:first-child {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.dashboard-table th:last-child,
.dashboard-table td:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.text-center {
  text-align: center !important;
}

.font-bold {
  font-weight: 700;
}

/* Badges override */
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.badge-danger {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fee2e2;
}

.badge-success {
  background-color: #f0fdf4;
  color: #16a34a;
  border: 1px solid #dcfce7;
}

.text-success-bold {
  color: #16a34a;
}

.text-danger-bold {
  color: #dc2626;
}

/* Animations */
.animate-in {
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.animate-in:nth-child(2) { animation-delay: 0.05s; }
.animate-in:nth-child(3) { animation-delay: 0.1s; }
.animate-in:nth-child(4) { animation-delay: 0.15s; }
.animate-in:nth-child(5) { animation-delay: 0.2s; }

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>