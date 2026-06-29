<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'

const barang = ref([])
const barangMasuk = ref([])
const barangKeluar = ref([])
const loading = ref(false)
const sidebarOpen = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('')
const currentPage = ref(1)
const pageSize = ref(8)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const getBarang = async () => {
  const { data, error } = await supabase
    .from('barang')
    .select('*')
    .order('nama_barang')

  if (!error) {
    barang.value = data || []
  }
}

const getTransactions = async () => {
  const [masukRes, keluarRes] = await Promise.all([
    supabase.from('barang_masuk').select('*'),
    supabase.from('barang_keluar').select('*')
  ])

  if (!masukRes.error) {
    barangMasuk.value = masukRes.data || []
  }
  if (!keluarRes.error) {
    barangKeluar.value = keluarRes.data || []
  }
}

const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([getBarang(), getTransactions()])
  } catch (err) {
    console.error('Refresh monitoring error:', err)
  } finally {
    loading.value = false
  }
}

const titleCase = (str) => {
  if (!str) return ''
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const categories = computed(() => {
  return [...new Set(barang.value.map((item) => titleCase(item.kategori.trim())).filter(Boolean))]
})

const filteredBarang = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()

  return barang.value.filter((item) => {
    const matchesSearch = !query || [item.nama_barang, item.kategori, String(item.stok)].some((value) => String(value).toLowerCase().includes(query))
    const matchesCategory = !selectedCategory.value || titleCase(item.kategori) === selectedCategory.value
    return matchesSearch && matchesCategory
  })
})

const filteredCount = computed(() => filteredBarang.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredCount.value / pageSize.value)))
const paginatedBarang = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredBarang.value.slice(start, start + pageSize.value)
})
const visibleRange = computed(() => {
  const start = filteredCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, filteredCount.value)
  return { start, end }
})

const summaryStats = computed(() => {
  const data = barang.value
  const totalStock = data.reduce((sum, item) => sum + Number(item.stok || 0), 0)
  return {
    total: data.length,
    totalStock,
    lowStock: data.filter(item => Number(item.stok || 0) < 5).length,
    mediumStock: data.filter(item => Number(item.stok || 0) >= 5 && Number(item.stok || 0) <= 20).length,
    safeStock: data.filter(item => Number(item.stok || 0) > 20).length
  }
})

const monthlyTrend = computed(() => {
  const months = []
  const now = new Date()

  // Generate the last 6 months list
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      name: d.toLocaleDateString('id-ID', { month: 'short' }),
      masuk: 0,
      keluar: 0
    })
  }

  // Aggregate barang_masuk
  barangMasuk.value.forEach((item) => {
    const d = new Date(item.tanggal)
    const y = d.getFullYear()
    const m = d.getMonth()

    const target = months.find((x) => x.year === y && x.month === m)
    if (target) {
      target.masuk += Number(item.jumlah || 0)
    }
  })

  // Aggregate barang_keluar
  barangKeluar.value.forEach((item) => {
    const d = new Date(item.tanggal)
    const y = d.getFullYear()
    const m = d.getMonth()

    const target = months.find((x) => x.year === y && x.month === m)
    if (target) {
      target.keluar += Number(item.jumlah || 0)
    }
  })

  const maxVal = Math.max(...months.map((x) => Math.max(x.masuk, x.keluar)), 10)

  return months.map((m) => ({
    ...m,
    percentMasuk: (m.masuk / maxVal) * 100,
    percentKeluar: (m.keluar / maxVal) * 100
  }))
})

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
}

watch([searchQuery, selectedCategory], () => {
  currentPage.value = 1
})

onMounted(() => {
  refreshData()
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
        <li><router-link to="/dashboard"><i class="bi bi-speedometer2"></i> Dashboard</router-link></li>
        <li><router-link to="/barang"><i class="bi bi-list"></i> Data Barang</router-link></li>
        <li><router-link to="/barang-masuk"><i class="bi bi-arrow-down-circle"></i> Barang Masuk</router-link></li>
        <li><router-link to="/barang-keluar"><i class="bi bi-arrow-up-circle"></i> Barang Keluar</router-link></li>
        <li><router-link to="/monitoring" class="active"><i class="bi bi-graph-up"></i> Monitoring</router-link></li>
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
            <div class="topbar-kicker">Pantau stok</div>
            <h1 class="topbar-title">Monitoring</h1>
          </div>
        </div>
        <button class="topbar-action" @click="refreshData">
          <i class="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      <!-- Content Area -->
      <div class="content">

        <!-- Statistics Grid -->
        <div class="stats-grid">
          <div class="stat-card stat-blue animate-in">
            <div class="stat-icon"><i class="bi bi-box2"></i></div>
            <div>
              <div class="stat-label">Total Barang</div>
              <div class="stat-value">{{ summaryStats.total }}</div>
            </div>
          </div>
          <div class="stat-card stat-green animate-in">
            <div class="stat-icon"><i class="bi bi-check-circle"></i></div>
            <div>
              <div class="stat-label">Stok Aman</div>
              <div class="stat-value">{{ summaryStats.safeStock }}</div>
            </div>
          </div>
          <div class="stat-card stat-amber animate-in">
            <div class="stat-icon"><i class="bi bi-exclamation-triangle"></i></div>
            <div>
              <div class="stat-label">Stok Sedang</div>
              <div class="stat-value">{{ summaryStats.mediumStock }}</div>
            </div>
          </div>
          <div class="stat-card stat-red animate-in">
            <div class="stat-icon"><i class="bi bi-x-octagon"></i></div>
            <div>
              <div class="stat-label">Stok Rendah</div>
              <div class="stat-value">{{ summaryStats.lowStock }}</div>
            </div>
          </div>
        </div>

        <!-- Stock Distribution Summary -->
        <div class="summary-card animate-in">
          <div class="summary-head">
            <div>
              <h2>Distribusi Stok</h2>
              <p>Visualisasi status ketersediaan seluruh barang berdasarkan tingkat stok.</p>
            </div>
          </div>
          <div class="summary-body">
            <div class="summary-bars">
              <div class="summary-row">
                <div class="summary-label">Aman</div>
                <div class="summary-track">
                  <div class="track-fill track-green" :style="{ width: `${Math.max((summaryStats.safeStock / Math.max(summaryStats.total, 1)) * 100, 4)}%` }"></div>
                </div>
                <div class="summary-value">{{ summaryStats.safeStock }}</div>
              </div>
              <div class="summary-row">
                <div class="summary-label">Sedang</div>
                <div class="summary-track">
                  <div class="track-fill track-amber" :style="{ width: `${Math.max((summaryStats.mediumStock / Math.max(summaryStats.total, 1)) * 100, 4)}%` }"></div>
                </div>
                <div class="summary-value">{{ summaryStats.mediumStock }}</div>
              </div>
              <div class="summary-row">
                <div class="summary-label">Rendah</div>
                <div class="summary-track">
                  <div class="track-fill track-red" :style="{ width: `${Math.max((summaryStats.lowStock / Math.max(summaryStats.total, 1)) * 100, 4)}%` }"></div>
                </div>
                <div class="summary-value">{{ summaryStats.lowStock }}</div>
              </div>
            </div>
            <div class="summary-panel">
              <div class="summary-panel-title">Total Stok Keseluruhan</div>
              <div class="summary-panel-value">{{ summaryStats.totalStock.toLocaleString('id-ID') }}</div>
              <div class="summary-panel-meta">Dari {{ summaryStats.total }} jenis barang yang terdaftar</div>
            </div>
          </div>
        </div>

        <!-- Tren Transaksi Bulanan (Bar Chart) -->
        <div class="trend-card animate-in">
          <div class="trend-head">
            <div>
              <h2>Tren Transaksi Bulanan</h2>
            </div>
            <div class="trend-legend">
              <div class="legend-item">
                <span class="legend-dot color-masuk"></span>
                <span>Barang Masuk</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot color-keluar"></span>
                <span>Barang Keluar</span>
              </div>
            </div>
          </div>
          <div class="trend-body">
            <div class="chart-container">
              <div class="chart-bars-wrap">
                <div v-for="m in monthlyTrend" :key="m.name" class="chart-column">
                  <div class="bars-pair">
                    <div class="bar-wrapper">
                      <div class="bar bar-masuk" :style="{ height: `${m.percentMasuk}%` }">
                        <span class="bar-tooltip">{{ m.masuk }} unit</span>
                      </div>
                    </div>
                    <div class="bar-wrapper">
                      <div class="bar bar-keluar" :style="{ height: `${m.percentKeluar}%` }">
                        <span class="bar-tooltip">{{ m.keluar }} unit</span>
                      </div>
                    </div>
                  </div>
                  <div class="column-label">{{ m.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Table Panel -->
        <div class="card table-card animate-in">
          <div class="table-header">
            <div>
              <div class="section-eyebrow">Detail</div>
              <h2>Daftar Stok Barang ({{ filteredCount }})</h2>
            </div>
            <div class="toolbar">
              <button v-if="searchQuery || selectedCategory" class="ghost-btn" @click="clearFilters">
                <i class="bi bi-x-circle"></i> Reset
              </button>
              <div class="toolbar-field search-field">
                <i class="bi bi-search"></i>
                <input v-model="searchQuery" placeholder="Cari barang atau stok" />
              </div>
              <div class="toolbar-field select-field">
                <i class="bi bi-funnel"></i>
                <select v-model="selectedCategory">
                  <option value="">Semua Kategori</option>
                  <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
                </select>
              </div>
            </div>
          </div>

          <div class="table-wrap">
            <table class="table-data">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Barang</th>
                  <th>Kategori</th>
                  <th class="text-right">Harga</th>
                  <th class="text-center">Stok</th>
                  <th class="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="6" class="empty-state">Memuat data monitoring...</td>
                </tr>
                <tr v-else-if="paginatedBarang.length === 0">
                  <td colspan="6" class="empty-state">Tidak ada data yang cocok</td>
                </tr>
                <tr v-for="(item, index) in paginatedBarang" :key="item.id_barang">
                  <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                  <td class="cell-name">{{ item.nama_barang }}</td>
                  <td>{{ item.kategori }}</td>
                  <td class="text-right cell-price">Rp {{ Number(item.harga).toLocaleString('id-ID') }}</td>
                  <td class="text-center">
                    <span class="stock-value" :class="{
                      'stock-low': item.stok < 5,
                      'stock-medium': item.stok >= 5 && item.stok <= 20,
                      'stock-safe': item.stok > 20
                    }">{{ item.stok }} unit</span>
                  </td>
                  <td class="text-center">
                    <span class="status-badge" :class="{
                      'badge-low': item.stok < 5,
                      'badge-medium': item.stok >= 5 && item.stok <= 20,
                      'badge-safe': item.stok > 20
                    }">
                      {{ item.stok < 5 ? '🔴 Rendah' : item.stok <= 20 ? '🟡 Sedang' : '🟢 Aman' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="filteredCount > pageSize" class="pagination-bar">
            <div class="pagination-info">{{ visibleRange.start }}-{{ visibleRange.end }} dari {{ filteredCount }}</div>
            <div class="pagination-actions">
              <button :disabled="currentPage === 1" @click="currentPage -= 1">Sebelumnya</button>
              <span>Hal {{ currentPage }} / {{ totalPages }}</span>
              <button :disabled="currentPage === totalPages" @click="currentPage += 1">Berikutnya</button>
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
  padding: 18px 20px;
  margin-bottom: 20px;
  border-radius: 18px;
  background: linear-gradient(135deg, #f8fbff 0%, #eff6ff 100%);
  border: 1px solid #dbeafe;
}

.topbar-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
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

.topbar-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 999px;
  padding: 9px 14px;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.topbar-action:hover {
  background: #1d4ed8;
}

/* Statistics Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  background: #fff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  font-size: 20px;
  color: #fff;
  flex-shrink: 0;
}

.stat-blue .stat-icon { background: linear-gradient(135deg, #2563eb, #3b82f6); }
.stat-green .stat-icon { background: linear-gradient(135deg, #16a34a, #4ade80); }
.stat-amber .stat-icon { background: linear-gradient(135deg, #d97706, #fbbf24); }
.stat-red .stat-icon { background: linear-gradient(135deg, #dc2626, #f87171); }

.stat-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
}

/* Animations */
.animate-in {
  animation: fadeUp 0.5s ease both;
}

.animate-in:nth-child(2) { animation-delay: 0.06s; }
.animate-in:nth-child(3) { animation-delay: 0.12s; }
.animate-in:nth-child(4) { animation-delay: 0.18s; }
.animate-in:nth-child(5) { animation-delay: 0.24s; }
.animate-in:nth-child(6) { animation-delay: 0.3s; }

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Summary Card */
.summary-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
}

.summary-head h2 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.summary-head p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.summary-body {
  display: grid;
  grid-template-columns: 1.1fr 0.8fr;
  gap: 20px;
  margin-top: 16px;
  align-items: center;
}

.summary-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-label {
  min-width: 70px;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}

.summary-track {
  flex: 1;
  height: 10px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.track-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s ease;
}

.track-green { background: #28a745; }
.track-amber { background: #f59e0b; }
.track-red { background: #dc3545; }

.summary-value {
  min-width: 28px;
  text-align: right;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.summary-panel {
  padding: 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%);
  border: 1px solid #dbeafe;
}

.summary-panel-title {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.summary-panel-value {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 800;
  color: #111827;
}

.summary-panel-meta {
  margin-top: 8px;
  font-size: 13px;
  color: #475569;
}

/* Table Card */
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.table-header h2 {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.section-eyebrow {
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.toolbar-field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  min-height: 40px;
}

.toolbar-field i {
  color: #64748b;
  font-size: 14px;
}

.search-field {
  min-width: 220px;
}

.select-field {
  min-width: 180px;
}

.toolbar input,
.toolbar select {
  border: none;
  outline: none;
  box-shadow: none;
  background: transparent;
  padding: 0;
  min-height: auto;
  font-size: 14px;
  font-family: inherit;
  color: #0f172a;
  width: 100%;
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 9px 13px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  background: #f8fafc;
  color: #334155;
  min-height: 40px;
}

.table-wrap {
  overflow-x: auto;
}

.table-data {
  width: 100%;
  border-collapse: collapse;
}

.table-data thead tr {
  background: #f8fafc;
}

.table-data th,
.table-data td {
  padding: 11px 12px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
}

.table-data th {
  text-align: left;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.table-data tbody tr:hover {
  background: #f8fafc;
}

.table-data td {
  color: #334155;
}

.cell-name {
  font-weight: 500;
  color: #0f172a;
}

.cell-price {
  color: #16a34a;
  font-weight: 600;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

/* Stock Value Colors */
.stock-value {
  font-weight: 700;
  font-size: 14px;
}

.stock-low { color: #dc2626; }
.stock-medium { color: #d97706; }
.stock-safe { color: #16a34a; }

/* Status Badges */
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.badge-low {
  background: #fef2f2;
  color: #991b1b;
}

.badge-medium {
  background: #fffbeb;
  color: #92400e;
}

.badge-safe {
  background: #f0fdf4;
  color: #166534;
}

.empty-state {
  padding: 32px 16px;
  text-align: center;
  color: #64748b;
}

/* Pagination */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.pagination-info {
  font-size: 13px;
  color: #64748b;
}

.pagination-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-actions button {
  border: 1px solid #dbeafe;
  background: white;
  color: #2563eb;
  border-radius: 10px;
  padding: 9px 13px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.pagination-actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pagination-actions span {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

/* Responsive */
@media (max-width: 900px) {
  .summary-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .toolbar {
    width: 100%;
    justify-content: stretch;
  }

  .toolbar-field {
    flex: 1;
  }

  .search-field,
  .select-field {
    min-width: 0;
  }
}

/* Trend Chart Styles */
.trend-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
  margin-bottom: 24px;
}

.trend-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}

.trend-head h2 {
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.trend-head p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.trend-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.color-masuk {
  background: #2563eb;
}

.legend-dot.color-keluar {
  background: #ef4444;
}

.chart-container {
  height: 240px;
  display: flex;
  align-items: flex-end;
  position: relative;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 8px;
}

.chart-bars-wrap {
  width: 100%;
  display: flex;
  justify-content: space-around;
  height: 100%;
  align-items: flex-end;
}

.chart-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
}

.bars-pair {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 80%;
  width: 100%;
  justify-content: center;
}

.bar-wrapper {
  height: 100%;
  display: flex;
  align-items: flex-end;
  width: 24px;
}

.bar {
  width: 100%;
  border-radius: 6px 6px 0 0;
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 2px;
}

.bar-masuk {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.16);
}

.bar-keluar {
  background: linear-gradient(180deg, #f87171 0%, #ef4444 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.16);
}

.bar:hover {
  transform: scaleY(1.04);
  filter: brightness(1.05);
}

.bar-tooltip {
  position: absolute;
  top: -34px;
  left: 50%;
  transform: translateX(-50%) scale(0.9);
  background: #0f172a;
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 10;
}

.bar-tooltip::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 4px 4px 0;
  border-style: solid;
  border-color: #0f172a transparent;
}

.bar:hover .bar-tooltip {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.column-label {
  margin-top: 12px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>