<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'

const barang = ref([])

const nama_barang = ref('')
const kategori = ref('')
const harga = ref('')
const stok = ref('')

const editId = ref(null)
const loading = ref(false)
const deletingId = ref(null)
const initialLoading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStockStatus = ref('')
const showAdvancedFilter = ref(false)
const sortBy = ref('id')
const minPrice = ref('')
const maxPrice = ref('')
const categories = ref([])
const currentPage = ref(1)
const pageSize = ref(8)
const toast = ref({ show: false, type: 'success', message: '' })
const sidebarOpen = ref(true)
const showForm = ref(false)
const showConfirmModal = ref(false)
const itemToDelete = ref(null)
let toastTimer = null

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const focusForm = () => {
  resetForm()
  showForm.value = true
}

const showToast = (type, message) => {
  clearTimeout(toastTimer)
  toast.value = { show: true, type, message }
  toastTimer = setTimeout(() => {
    toast.value.show = false
  }, 2800)
}

const getBarang = async () => {
  initialLoading.value = true

  try {
    const { data, error } = await supabase
      .from('barang')
      .select('*')
      .order('id_barang')

    if (error) throw error

    barang.value = data || []
    categories.value = [...new Set((data || []).map(item => titleCase(item.kategori.trim())).filter(Boolean))]
  } catch (err) {
    console.error('Load barang error:', err)
    showToast('error', 'Gagal memuat data barang.')
  } finally {
    initialLoading.value = false
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

const getSatuan = (item) => {
  const nama = (item.nama_barang || '').toLowerCase()
  if (nama.includes('kertas')) return 'rim'
  if (nama.includes('tinta') || nama.includes('mouse') || nama.includes('pulpen') || nama.includes('buku') || nama.includes('alat') || nama.includes('kbd') || nama.includes('key')) return 'pcs'
  return 'unit'
}

const getStockStatus = (item) => {
  if (item.stok < 5) return 'Rendah'
  if (item.stok >= 5 && item.stok <= 20) return 'Menengah'
  return 'Aman'
}

const filteredBarang = () => {
  const query = searchQuery.value.toLowerCase().trim()

  let result = barang.value.filter((item) => {
    const formattedCode = `brg-${String(item.id_barang).padStart(3, '0')}`
    const matchesSearch = !query || [
      item.nama_barang,
      item.kategori,
      formattedCode,
      String(item.id_barang)
    ].some((value) => String(value).toLowerCase().includes(query))

    const matchesCategory = !selectedCategory.value || titleCase(item.kategori) === selectedCategory.value

    let matchesStock = true
    if (selectedStockStatus.value) {
      const status = getStockStatus(item)
      matchesStock = status === selectedStockStatus.value
    }

    const matchesMinPrice = minPrice.value === '' || item.harga >= Number(minPrice.value)
    const matchesMaxPrice = maxPrice.value === '' || item.harga <= Number(maxPrice.value)

    return matchesSearch && matchesCategory && matchesStock && matchesMinPrice && matchesMaxPrice
  })

  // Apply sorting
  if (sortBy.value === 'nama-asc') {
    result.sort((a, b) => a.nama_barang.localeCompare(b.nama_barang))
  } else if (sortBy.value === 'nama-desc') {
    result.sort((a, b) => b.nama_barang.localeCompare(a.nama_barang))
  } else if (sortBy.value === 'harga-asc') {
    result.sort((a, b) => a.harga - b.harga)
  } else if (sortBy.value === 'harga-desc') {
    result.sort((a, b) => b.harga - a.harga)
  } else if (sortBy.value === 'stok-asc') {
    result.sort((a, b) => a.stok - b.stok)
  } else if (sortBy.value === 'stok-desc') {
    result.sort((a, b) => b.stok - a.stok)
  } else {
    result.sort((a, b) => a.id_barang - b.id_barang)
  }

  return result
}

const filteredBarangCount = computed(() => filteredBarang().length)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredBarangCount.value / pageSize.value)))

const paginatedBarang = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredBarang().slice(start, start + pageSize.value)
})

const visibleRange = computed(() => {
  const start = filteredBarangCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, filteredBarangCount.value)
  return { start, end }
})

watch([searchQuery, selectedCategory, selectedStockStatus, sortBy, minPrice, maxPrice], () => {
  currentPage.value = 1
})

const simpanBarang = async () => {
  if (
    !nama_barang.value ||
    !kategori.value ||
    harga.value === '' ||
    stok.value === ''
  ) {
    showToast('error', 'Lengkapi semua data terlebih dahulu.')
    return
  }

  const hargaNum = Number(harga.value)
  const stokNum = Number(stok.value)

  if (isNaN(hargaNum) || hargaNum < 0) {
    showToast('error', 'Harga tidak boleh bernilai negatif.')
    return
  }

  if (isNaN(stokNum) || !Number.isInteger(stokNum) || stokNum < 0) {
    showToast('error', 'Stok harus berupa bilangan bulat dan tidak boleh bernilai negatif.')
    return
  }

  loading.value = true

  try {
    if (editId.value) {
      const { error } = await supabase
        .from('barang')
        .update({
          nama_barang: nama_barang.value,
          kategori: kategori.value,
          harga: harga.value,
          stok: stok.value
        })
        .eq('id_barang', editId.value)

      if (error) {
        showToast('error', 'Gagal memperbarui data barang.')
        return
      }

      showToast('success', 'Data barang berhasil diperbarui.')
      editId.value = null
    } else {
      const { error } = await supabase
        .from('barang')
        .insert([
          {
            nama_barang: nama_barang.value,
            kategori: kategori.value,
            harga: harga.value,
            stok: stok.value
          }
        ])

      if (error) {
        showToast('error', 'Gagal menyimpan data barang.')
        return
      }

      showToast('success', 'Data barang berhasil disimpan.')
    }

    resetForm()
    showForm.value = false
    await getBarang()
  } catch (err) {
    showToast('error', 'Terjadi kesalahan saat menyimpan data.')
    console.error('Exception:', err)
  } finally {
    loading.value = false
  }
}

const editBarang = (item) => {
  editId.value = item.id_barang
  nama_barang.value = item.nama_barang
  kategori.value = item.kategori
  harga.value = item.harga
  stok.value = item.stok
  showForm.value = true
}

const hapusBarang = (item) => {
  itemToDelete.value = item
  showConfirmModal.value = true
}

const konfirmasiHapus = async () => {
  if (!itemToDelete.value) return
  const id = itemToDelete.value.id_barang
  
  deletingId.value = id
  showConfirmModal.value = false
  
  try {
    // Hapus data barang_masuk yang referensi barang ini
    const { error: errorMasuk } = await supabase
      .from('barang_masuk')
      .delete()
      .eq('id_barang', id)

    if (errorMasuk) {
      console.warn('Warning saat hapus barang_masuk:', errorMasuk)
    }

    // Hapus data barang_keluar yang referensi barang ini
    const { error: errorKeluar } = await supabase
      .from('barang_keluar')
      .delete()
      .eq('id_barang', id)

    if (errorKeluar) {
      console.warn('Warning saat hapus barang_keluar:', errorKeluar)
    }

    // Hapus barang
    const { error } = await supabase
      .from('barang')
      .delete()
      .eq('id_barang', id)

    if (error) {
      if (error.code === '409') {
        showToast('error', 'Data barang masih memiliki referensi di sistem.')
      } else {
        showToast('error', 'Gagal menghapus data barang.')
      }
      console.error('Delete error:', error)
      return
    }

    showToast('success', 'Data barang berhasil dihapus.')
    await getBarang()
  } catch (err) {
    showToast('error', 'Terjadi kesalahan saat menghapus data.')
    console.error('Exception:', err)
  } finally {
    deletingId.value = null
    itemToDelete.value = null
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
  selectedStockStatus.value = ''
  sortBy.value = 'id'
  minPrice.value = ''
  maxPrice.value = ''
}

const closeForm = () => {
  showForm.value = false
  resetForm()
}

const resetForm = () => {
  editId.value = null
  nama_barang.value = ''
  kategori.value = ''
  harga.value = ''
  stok.value = ''
}

onMounted(() => {
  getBarang()
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
        <li><router-link to="/barang" class="active"><i class="bi bi-list"></i> Data Barang</router-link></li>
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
            <div class="topbar-kicker">Katalog</div>
            <h1 class="topbar-title">Daftar barang</h1>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="topbar-action" @click="focusForm">
            <i class="bi bi-plus-lg"></i> Tambah barang
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="content">
        <div v-if="toast.show" class="app-toast" :class="toast.type">
          <span>{{ toast.message }}</span>
        </div>

        <!-- Modal Konfirmasi Hapus -->
        <Transition name="fade">
          <div v-if="showConfirmModal" class="form-overlay">
            <div class="form-panel confirm-panel">
              <div class="confirm-header">
                <div class="confirm-icon">
                  <i class="bi bi-exclamation-triangle"></i>
                </div>
                <h2>Konfirmasi Hapus</h2>
              </div>
              <p class="confirm-message">
                Apakah Anda yakin ingin menghapus barang <strong>{{ itemToDelete?.nama_barang }}</strong>?
                Semua data transaksi masuk dan keluar yang terkait dengan barang ini juga akan terhapus secara permanen.
              </p>
              <div class="confirm-actions">
                <button class="danger-btn" @click="konfirmasiHapus">
                  Hapus
                </button>
                <button class="secondary-btn" @click="showConfirmModal = false">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Form Overlay -->
        <Transition name="fade">
          <div v-if="showForm" class="form-overlay">
            <div class="form-panel">
              <div class="section-header">
                <div>
                  <div class="section-eyebrow">Form</div>
                  <h2>{{ editId ? 'Edit Barang' : 'Tambah Barang' }}</h2>
                </div>
                <button class="ghost-btn" @click="closeForm">
                  <i class="bi bi-x-lg"></i> Tutup
                </button>
              </div>

              <div class="form-grid">
                <div class="field-group">
                  <label>Nama Barang</label>
                  <input v-model="nama_barang" placeholder="Masukkan nama barang">
                </div>
                <div class="field-group">
                  <label>Kategori</label>
                  <input v-model="kategori" placeholder="Masukkan kategori">
                </div>
                <div class="field-group">
                  <label>Harga (Rp)</label>
                  <input v-model="harga" type="number" placeholder="0">
                </div>
                <div class="field-group">
                  <label>Stok</label>
                  <input v-model="stok" type="number" placeholder="0">
                </div>
              </div>

              <div class="form-actions">
                <button class="primary-btn" @click="simpanBarang" :disabled="loading">
                  <span v-if="loading">Menyimpan...</span>
                  <span v-else>{{ editId ? 'Simpan Perubahan' : 'Tambah Barang' }}</span>
                </button>
                <button class="secondary-btn" @click="closeForm">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Advanced Filters Toolbar -->
        <div class="filters-row animate-in">
          <div class="search-wrap">
            <i class="bi bi-search"></i>
            <input v-model="searchQuery" placeholder="Cari nama barang, kode..." />
          </div>
          <div class="select-filter-wrap">
            <select v-model="selectedCategory">
              <option value="">Semua kategori</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div class="select-filter-wrap">
            <select v-model="selectedStockStatus">
              <option value="">Status stok</option>
              <option value="Aman">Aman (> 20)</option>
              <option value="Menengah">Menengah (5-20)</option>
              <option value="Rendah">Rendah (&lt; 5)</option>
            </select>
          </div>
          <button v-if="searchQuery || selectedCategory || selectedStockStatus || sortBy !== 'id' || minPrice !== '' || maxPrice !== ''" class="icon-filter-btn reset-btn" @click="clearFilters" title="Clear Filters">
            <i class="bi bi-x-circle"></i>
          </button>
          <button class="icon-filter-btn" :class="{ active: showAdvancedFilter }" @click="showAdvancedFilter = !showAdvancedFilter" title="Filter Lanjutan">
            <i class="bi bi-sliders"></i>
          </button>
        </div>

        <!-- Collapsible Advanced Sort and Filter Panel -->
        <Transition name="expand">
          <div v-if="showAdvancedFilter" class="advanced-filter-panel animate-in">
            <div class="advanced-filter-grid">
              <div class="filter-field">
                <label>Urutkan berdasarkan</label>
                <select v-model="sortBy">
                  <option value="id">Default (ID)</option>
                  <option value="nama-asc">Nama (A-Z)</option>
                  <option value="nama-desc">Nama (Z-A)</option>
                  <option value="harga-asc">Harga Terendah</option>
                  <option value="harga-desc">Harga Tertinggi</option>
                  <option value="stok-asc">Stok Terendah</option>
                  <option value="stok-desc">Stok Tertinggi</option>
                </select>
              </div>
              <div class="filter-field">
                <label>Harga Minimum (Rp)</label>
                <input v-model="minPrice" type="number" placeholder="Min" />
              </div>
              <div class="filter-field">
                <label>Harga Maksimum (Rp)</label>
                <input v-model="maxPrice" type="number" placeholder="Max" />
              </div>
            </div>
          </div>
        </Transition>

        <!-- Table Panel Card -->
        <div class="card table-card animate-in">
          <div class="table-header">
            <div>
              <div class="section-eyebrow">Katalog</div>
              <h2>Daftar Barang ({{ filteredBarangCount }})</h2>
            </div>
            <div class="toolbar">
              <span class="active-filters-label" v-if="searchQuery || selectedCategory || selectedStockStatus || sortBy !== 'id' || minPrice !== '' || maxPrice !== ''">
                Filter aktif: {{ (searchQuery ? 1 : 0) + (selectedCategory ? 1 : 0) + (selectedStockStatus ? 1 : 0) + (sortBy !== 'id' ? 1 : 0) + (minPrice !== '' ? 1 : 0) + (maxPrice !== '' ? 1 : 0) }}
                <a href="#" @click.prevent="clearFilters" class="clear-filters-link"><i class="bi bi-x"></i></a>
              </span>
              <span class="active-filters-label text-muted" v-else>
                Filter aktif: 0
              </span>
            </div>
          </div>

          <div class="table-wrap">
            <table class="dashboard-table">
              <thead>
                <tr>
                  <th>Nama barang</th>
                  <th>Kategori</th>
                  <th>Harga</th>
                  <th>Stok</th>
                  <th class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="initialLoading">
                  <td colspan="5" class="empty-state">Memuat data barang...</td>
                </tr>
                <tr v-else-if="paginatedBarang.length === 0">
                  <td colspan="5" class="empty-state">Tidak ada data yang cocok</td>
                </tr>
                <tr v-for="item in paginatedBarang" :key="item.id_barang">
                  <td class="font-semibold text-dark">{{ item.nama_barang }}</td>
                  <td>
                    <span class="category-pill" :class="`cat-${(item.kategori || '').toLowerCase()}`">
                      {{ item.kategori }}
                    </span>
                  </td>
                  <td class="font-bold text-dark">Rp {{ Number(item.harga).toLocaleString('id-ID') }}</td>
                  <td class="font-bold text-dark">{{ item.stok }}</td>
                  <td class="text-center action-cell">
                    <button class="icon-btn edit" @click="editBarang(item)" title="Edit">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="icon-btn delete" @click="hapusBarang(item)" :disabled="deletingId === item.id_barang" title="Hapus">
                      <i v-if="deletingId === item.id_barang" class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite;"></i>
                      <i v-else class="bi bi-trash3"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-footer-row">
            <div class="footer-info">
              Menampilkan {{ paginatedBarang.length }} dari {{ filteredBarangCount }} barang
            </div>
            <div v-if="totalPages > 1" class="pagination-wrap">
              <button :disabled="currentPage === 1" @click="currentPage -= 1" class="page-nav-btn"><i class="bi bi-chevron-left"></i></button>
              <button v-for="page in totalPages" :key="page" :class="{ active: currentPage === page }" @click="currentPage = page" class="page-num-btn">
                {{ page }}
              </button>
              <button :disabled="currentPage === totalPages" @click="currentPage += 1" class="page-nav-btn"><i class="bi bi-chevron-right"></i></button>
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
  margin-bottom: 24px;
  border-radius: 18px;
  background: linear-gradient(135deg, #f8fbff 0%, #eff6ff 100%);
  border: 1px solid #dbeafe;
}

.topbar-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-kicker {
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.topbar-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.topbar-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #09090b;
}

.topbar-subtitle {
  font-size: 13px;
  color: #71717a;
  font-weight: 500;
  margin-top: 2px;
}

.icon-btn-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid #e4e4e7;
  border-radius: 50%;
  background: #ffffff;
  color: #27272a;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn-circle:hover {
  background: #f4f4f5;
  color: #09090b;
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

.primary-btn-top:hover {
  background-color: #1d4ed8;
}

.app-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  min-width: 260px;
  max-width: 360px;
  padding: 12px 16px;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
}

.app-toast.success {
  background: linear-gradient(135deg, #28a745 0%, #1f7a3b 100%);
}

.app-toast.error {
  background: linear-gradient(135deg, #dc3545 0%, #a61e2e 100%);
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.section-eyebrow {
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.section-header h2 {
  margin: 4px 0 4px;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.filters-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-wrap {
  position: relative;
  flex: 1;
  min-width: 260px;
}

.search-wrap i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #71717a;
  font-size: 14px;
}

.search-wrap input {
  width: 100%;
  padding: 10px 14px 10px 38px;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  font-size: 14px;
  background: #ffffff;
  color: #09090b;
}

.search-wrap input:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.select-filter-wrap {
  position: relative;
  min-width: 160px;
}

.select-filter-wrap select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  font-size: 14px;
  background: #ffffff;
  color: #27272a;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
  padding-right: 32px;
}

.select-filter-wrap select:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.icon-filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  background: #ffffff;
  color: #27272a;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-filter-btn:hover {
  background-color: #f4f4f5;
}

.reset-btn {
  border-color: #fecaca;
  color: #ef4444;
  background: #fef2f2;
}

.reset-btn:hover {
  background-color: #fee2e2;
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

.active-filters-label {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  background-color: #eff6ff;
  padding: 4px 10px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.clear-filters-link {
  color: #2563eb;
  text-decoration: none;
  font-weight: bold;
  display: flex;
  align-items: center;
}

.clear-filters-link:hover {
  color: #1d4ed8;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
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

.field-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dbe4ee;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
}

.field-group input:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.form-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.primary-btn,
.secondary-btn,
.ghost-btn {
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

.secondary-btn {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.ghost-btn {
  background: #f8fafc;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.table-wrap {
  overflow-x: auto;
}

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

.code-cell {
  color: #2563eb;
  font-weight: 700;
}

.category-pill {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.cat-elektronik { background-color: #eff6ff; color: #1e40af; }
.cat-atk { background-color: #faf5ff; color: #581c87; }
.cat-furnitur { background-color: #fef3c7; color: #92400e; }

.category-pill:not(.cat-elektronik):not(.cat-atk):not(.cat-furnitur) {
  background-color: #f1f5f9;
  color: #334155;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.status-aman { background-color: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
.status-menengah { background-color: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
.status-rendah { background-color: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-aman .status-dot { background-color: #10b981; }
.status-menengah .status-dot { background-color: #f59e0b; }
.status-rendah .status-dot { background-color: #ef4444; }

.text-center {
  text-align: center !important;
}

.font-bold {
  font-weight: 700;
}

.text-dark {
  color: #09090b !important;
}

.text-muted {
  color: #71717a !important;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  margin-right: 4px;
}

.icon-btn.edit {
  background: #fff7e6;
  color: #b45309;
}

.icon-btn.delete {
  background: #fef2f2;
  color: #dc2626;
}

.empty-state {
  padding: 32px 16px;
  text-align: center;
  color: #64748b;
}

.form-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.55);
}

.form-panel {
  width: min(720px, 100%);
  background: #fff;
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
}

.confirm-panel {
  width: min(440px, 100%) !important;
  text-align: center;
  padding: 32px 24px !important;
}

.confirm-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.confirm-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fef2f2;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 4px;
}

.confirm-message {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 24px 0;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.danger-btn {
  border: none;
  border-radius: 10px;
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  background: #dc2626;
  color: #fff;
  box-shadow: 0 10px 24px rgba(220, 38, 38, 0.16);
}

.danger-btn:hover {
  background: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(220, 38, 38, 0.24);
}

.table-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-info {
  font-size: 13px;
  color: #71717a;
  font-weight: 500;
}

.pagination-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-nav-btn,
.page-num-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  background: #ffffff;
  color: #27272a;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-nav-btn {
  width: 32px;
  font-size: 12px;
}

.page-num-btn {
  padding: 0 12px;
  font-size: 13px;
}

.page-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-num-btn.active {
  background-color: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.page-nav-btn:hover:not(:disabled),
.page-num-btn:hover:not(.active) {
  background-color: #f4f4f5;
}

.animate-in {
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.animate-in:nth-child(2) { animation-delay: 0.05s; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

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

/* Modal and Form Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .form-panel,
.fade-leave-active .form-panel {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-enter-from .form-panel,
.fade-leave-to .form-panel {
  transform: scale(0.96) translateY(-10px);
}

.advanced-filter-panel {
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.advanced-filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-field label {
  font-size: 12px;
  font-weight: 700;
  color: #71717a;
}

.filter-field select,
.filter-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  font-size: 14px;
  background: #ffffff;
  color: #27272a;
}

.icon-filter-btn.active {
  background-color: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

/* Expand transition for the panel */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 200px;
  opacity: 1;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-bottom: 0 !important;
  border-color: transparent;
  overflow: hidden;
}
</style>