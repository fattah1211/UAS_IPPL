<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'

const daftarBarang = ref([])

const id_barang = ref('')
const jumlah = ref('')
const dataMasuk = ref([])
const loading = ref(false)
const initialLoading = ref(false)
const message = ref('')
const messageType = ref('success')
const isToastVisible = ref(false)
const sidebarOpen = ref(true)
const searchQuery = ref('')
const selectedBarangFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(8)
const showForm = ref(false)
let toastTimer = null

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedBarangFilter.value = ''
}

const openForm = () => {
  resetForm()
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  resetForm()
}

const resetForm = () => {
  id_barang.value = ''
  jumlah.value = ''
}

const getBarang = async () => {
  const { data } = await supabase
    .from('barang')
    .select('*')
    .order('nama_barang')

  daftarBarang.value = data || []
}

const getBarangMasuk = async () => {
  initialLoading.value = true

  try {
    const { data, error } = await supabase
      .from('barang_masuk')
      .select('*')
      .order('id_barang_masuk', { ascending: false })

    if (error) throw error
    dataMasuk.value = data || []
  } finally {
    initialLoading.value = false
  }
}

const setMessage = (text, type = 'success') => {
  message.value = text
  messageType.value = type
  isToastVisible.value = Boolean(text)

  if (toastTimer) {
    clearTimeout(toastTimer)
  }

  if (text) {
    toastTimer = setTimeout(() => {
      isToastVisible.value = false
      message.value = ''
    }, 2500)
  }
}

const refreshData = async () => {
  await Promise.all([getBarang(), getBarangMasuk()])
}

const filteredDataMasuk = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()

  return dataMasuk.value.filter((item) => {
    const namaBarang = daftarBarang.value.find((b) => b.id_barang == item.id_barang)?.nama_barang || ''
    const matchesSearch = !query || [namaBarang, String(item.jumlah), new Date(item.tanggal).toLocaleDateString('id-ID')].some((value) => String(value).toLowerCase().includes(query))
    const matchesBarang = !selectedBarangFilter.value || String(item.id_barang) === selectedBarangFilter.value

    return matchesSearch && matchesBarang
  })
})

const filteredMasukCount = computed(() => filteredDataMasuk.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredMasukCount.value / pageSize.value)))
const paginatedDataMasuk = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredDataMasuk.value.slice(start, start + pageSize.value)
})
const visibleRange = computed(() => {
  const start = filteredMasukCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, filteredMasukCount.value)
  return { start, end }
})

watch([searchQuery, selectedBarangFilter], () => {
  currentPage.value = 1
})

const simpanBarangMasuk = async () => {
  setMessage('')

  const barangDipilih = daftarBarang.value.find(
    item => item.id_barang == id_barang.value
  )

  if (!barangDipilih) {
    setMessage('Pilih barang terlebih dahulu.', 'error')
    return
  }

  const jumlahMasuk = Number(jumlah.value)

  if (!Number.isInteger(jumlahMasuk) || jumlahMasuk <= 0) {
    setMessage('Jumlah masuk harus bilangan bulat dan lebih dari 0.', 'error')
    return
  }

  loading.value = true

  try {
    const { error: errorMasuk } = await supabase
      .from('barang_masuk')
      .insert([
        {
          id_barang: id_barang.value,
          jumlah: jumlahMasuk,
          tanggal: new Date()
        }
      ])

    if (errorMasuk) {
      setMessage('Gagal menyimpan barang masuk: ' + errorMasuk.message, 'error')
      return
    }

    const { error: errorBarang } = await supabase
      .from('barang')
      .update({
        stok: barangDipilih.stok + jumlahMasuk
      })
      .eq('id_barang', id_barang.value)

    if (errorBarang) {
      setMessage('Data transaksi tersimpan, tapi stok gagal diperbarui.', 'error')
      return
    }

    await refreshData()
    closeForm()

    setMessage('Barang masuk berhasil disimpan.', 'success')
  } catch (err) {
    setMessage('Terjadi kesalahan saat menyimpan data.', 'error')
    console.error(err)
  } finally {
    loading.value = false
  }
}

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
        <li><router-link to="/barang-masuk" class="active"><i class="bi bi-arrow-down-circle"></i> Barang Masuk</router-link></li>
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
            <div class="topbar-kicker">Transaksi</div>
            <h1 class="topbar-title">Barang Masuk</h1>
          </div>
        </div>
        <button class="topbar-action" @click="openForm">
          <i class="bi bi-plus-circle"></i> Tambah Stok
        </button>
      </div>

      <!-- Content Area -->
      <div class="content">
        <div v-if="isToastVisible" class="toast" :class="messageType">
          <span class="toast-icon">{{ messageType === 'success' ? '✓' : '!' }}</span>
          <span>{{ message }}</span>
        </div>

        <Transition name="fade">
          <div v-if="showForm" class="form-overlay">
            <div class="form-panel">
              <div class="section-header">
                <div>
                  <div class="section-eyebrow">Form</div>
                  <h2>Tambah Barang Masuk</h2>
                </div>
                <button class="ghost-btn" @click="closeForm">
                  <i class="bi bi-x-lg"></i> Tutup
                </button>
              </div>

              <div v-if="message" class="inline-message" :class="messageType">
                {{ message }}
              </div>

              <div class="form-grid">
                <div class="field-group">
                  <label>Pilih Barang</label>
                  <select v-model="id_barang">
                    <option value="">-- Pilih Barang --</option>
                    <option v-for="item in daftarBarang" :key="item.id_barang" :value="item.id_barang">
                      {{ item.nama_barang }} • Stok {{ item.stok }}
                    </option>
                  </select>
                </div>
                <div class="field-group">
                  <label>Jumlah Masuk</label>
                  <input v-model="jumlah" type="number" placeholder="0" @keyup.enter="simpanBarangMasuk">
                </div>
              </div>

              <div class="form-actions">
                <button class="primary-btn" @click="simpanBarangMasuk" :disabled="loading">
                  <i class="bi bi-plus-circle"></i> {{ loading ? 'Menyimpan...' : 'Simpan' }}
                </button>
                <button class="secondary-btn" @click="closeForm">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </Transition>

        <div class="card table-card">
          <div class="table-header">
            <div>
              <div class="section-eyebrow">Riwayat</div>
              <h2>Barang Masuk ({{ filteredMasukCount }})</h2>
            </div>
            <div class="toolbar">
              <button v-if="searchQuery || selectedBarangFilter" class="ghost-btn" @click="clearFilters">
                <i class="bi bi-x-circle"></i> Reset
              </button>
              <div class="toolbar-field search-field">
                <i class="bi bi-search"></i>
                <input v-model="searchQuery" placeholder="Cari barang atau tanggal" />
              </div>
              <div class="toolbar-field select-field">
                <i class="bi bi-funnel"></i>
                <select v-model="selectedBarangFilter">
                  <option value="">Semua barang</option>
                  <option v-for="item in daftarBarang" :key="item.id_barang" :value="String(item.id_barang)">{{ item.nama_barang }}</option>
                </select>
              </div>
              <button class="ghost-btn refresh-btn" @click="refreshData">
                <i class="bi bi-arrow-clockwise"></i> Refresh
              </button>
            </div>
          </div>

          <div class="table-wrap">
            <table class="table-data">
              <thead>
                <tr>
                  <th style="width: 25%;">No</th>
                  <th style="width: 25%;">Barang</th>
                  <th class="text-center" style="width: 25%;">Jumlah</th>
                  <th style="width: 25%;">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="initialLoading">
                  <td colspan="4" class="empty-state">Memuat data...</td>
                </tr>
                <tr v-else-if="paginatedDataMasuk.length === 0">
                  <td colspan="4" class="empty-state">Tidak ada data</td>
                </tr>
                <tr v-for="(item, index) in paginatedDataMasuk" :key="item.id_barang_masuk">
                  <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                  <td>{{ daftarBarang.find(b => b.id_barang == item.id_barang)?.nama_barang || '-' }}</td>
                  <td class="text-center"><span class="badge">+{{ item.jumlah }}</span></td>
                  <td>{{ new Date(item.tanggal).toLocaleDateString('id-ID') }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="filteredMasukCount > pageSize" class="pagination-bar">
            <div class="pagination-info">{{ visibleRange.start }}-{{ visibleRange.end }} dari {{ filteredMasukCount }}</div>
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
.content {
  position: relative;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 12px;
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

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.toast.success {
  background: #ecfdf3;
  color: #166534;
}

.toast.error {
  background: #fef2f2;
  color: #b91c1c;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.form-card {
  margin-bottom: 18px;
}

.section-title,
.section-header,
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.section-title h2,
.section-header h2,
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

.pill {
  padding: 7px 11px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.inline-message {
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 14px;
  font-size: 13px;
  font-weight: 600;
}

.inline-message.success {
  background: #ecfdf3;
  color: #166534;
}

.inline-message.error {
  background: #fef2f2;
  color: #b91c1c;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-group label {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.field-group input,
.field-group select,
.toolbar input,
.toolbar select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dbe4ee;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  background: #fff;
  color: #0f172a;
}

.form-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(3px);
}

.form-panel {
  width: min(560px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  background: #fff;
  border-radius: 24px;
  padding: 24px 24px 28px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.16);
}

.form-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.secondary-btn {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 9px 13px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  background: #f8fafc;
  color: #334155;
}

.primary-btn,
.ghost-btn,
.pagination-actions button {
  border: none;
  border-radius: 10px;
  padding: 9px 13px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.primary-btn {
  background: #2563eb;
  color: #fff;
}

.ghost-btn {
  background: #f8fafc;
  color: #334155;
  border: 1px solid #e2e8f0;
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
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
}

.table-wrap {
  overflow-x: auto;
}

.table-data {
  width: 100%;
  border-collapse: collapse;
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

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  background: #ecfdf3;
  color: #166534;
  font-size: 12px;
  font-weight: 700;
}

.text-center { text-align: center !important; }
.empty-state {
  padding: 30px 12px;
  text-align: center;
  color: #64748b;
}

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
}

.pagination-actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
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

  .refresh-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>