import { useState, useMemo } from 'react'
import {
  RefreshCw,
  Plus,
  Loader,
  AlertCircle,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
  Archive,
  Layers,
} from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService, { normalizeProduct } from '../services/gunService'
import archiveStorage from '../utils/archiveStorage'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

/**
 * Catalog page — product listing with Pagination, Search, Filter, Lazy Loading,
 * and Soft Delete (Arsip) / Restore / Permanent Delete.
 */
export default function Catalog({ onNavigate }) {
  // ---- API data ----
  const { guns: apiGuns, loading, error, refetch } = useGuns({ limit: 100 })
  const [useLocal, setUseLocal] = useState(false)
  const [archiveRefreshKey, setArchiveRefreshKey] = useState(0)

  // Catalog view mode: 'active' | 'archived'
  const [catalogMode, setCatalogMode] = useState('active')

  // Decide data source
  const rawGuns = useMemo(() => {
    if (useLocal || (error && apiGuns.length === 0)) {
      return GUNS_LOCAL.map((g, i) => normalizeProduct({ ...g, id: g.id || `local-${i}` }))
    }
    return apiGuns
  }, [apiGuns, error, useLocal])

  // Soft-deleted / Archived items
  const archivedGuns = useMemo(() => {
    // eslint-disable-next-line no-unused-expressions
    archiveRefreshKey
    return archiveStorage.getArchived()
  }, [archiveRefreshKey])

  const archivedIdSet = useMemo(() => {
    return new Set(archivedGuns.map((g) => String(g.id || g.name)))
  }, [archivedGuns])

  // Active items (excluding soft-deleted)
  const activeGuns = useMemo(() => {
    return rawGuns.filter((g) => !archivedIdSet.has(String(g.id || g.name)))
  }, [rawGuns, archivedIdSet])

  // Current working dataset depending on mode
  const currentDataset = catalogMode === 'active' ? activeGuns : archivedGuns

  // ---- filters / sort ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  // ---- pagination state ----
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)

  const categories = useMemo(() => extractCategories(rawGuns), [rawGuns])

  const filteredGuns = useMemo(() => {
    let result = currentDataset.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [currentDataset, search, activeCategory, sortKey, sortOrder])

  // Filter change handlers that reset page
  const handleSearchChange = (val) => {
    setSearch(val)
    setPage(1)
  }

  const handleCategoryChange = (val) => {
    setActiveCategory(val)
    setPage(1)
  }

  const handleSortChange = ({ key, order }) => {
    setSortKey(key)
    setSortOrder(order)
    setPage(1)
  }

  const handleItemsPerPageChange = (val) => {
    setItemsPerPage(val)
    setPage(1)
  }

  // Compute pagination details safely
  const totalItems = filteredGuns.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const currentPage = Math.min(page, totalPages)

  const paginatedGuns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredGuns.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredGuns, currentPage, itemsPerPage])

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return
    setPage(newPage)
    const listEl = document.getElementById('catalog-stock-heading')
    if (listEl) {
      listEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 120, behavior: 'smooth' })
    }
  }

  // ---- detail view ----
  const [selectedGun, setSelectedGun] = useState(null)

  // ---- Soft Delete (Archive) / Restore ----
  const handleArchiveGun = (gun) => {
    archiveStorage.archive(gun)
    setArchiveRefreshKey((k) => k + 1)
  }

  const handleRestoreGun = (gun) => {
    archiveStorage.restore(gun.id || gun.name)
    setArchiveRefreshKey((k) => k + 1)
  }

  // ---- Permanent Delete ----
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDeletePermanent = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError('')

      // Remove from backend if exists
      if (deleteTarget.id && !String(deleteTarget.id).startsWith('local-')) {
        try {
          await gunService.deleteGun(deleteTarget.id)
        } catch (e) {
          console.warn('Backend delete failed, removing locally:', e)
        }
      }

      // Remove from archive storage
      archiveStorage.permanentDelete(deleteTarget.id || deleteTarget.name)
      setArchiveRefreshKey((k) => k + 1)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete permanently.')
    } finally {
      setDeleting(false)
    }
  }

  // ---- If viewing a single product detail ----
  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        onBack={() => setSelectedGun(null)}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onDelete={(g) => { setSelectedGun(null); setDeleteTarget(g) }}
      />
    )
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      <section>
        <div id="catalog-stock-heading" className="list-head" style={{ flexWrap: 'wrap', gap: '12px' }}>
          {/* Active vs Archived Toggle */}
          <div className="catalog-tab-switcher">
            <button
              type="button"
              className={`catalog-tab-btn ${catalogMode === 'active' ? 'catalog-tab-btn--active' : ''}`}
              onClick={() => { setCatalogMode('active'); setPage(1) }}
            >
              <Layers size={15} />
              <span>Stok Aktif ({activeGuns.length})</span>
            </button>
            <button
              type="button"
              className={`catalog-tab-btn ${catalogMode === 'archived' ? 'catalog-tab-btn--active' : ''}`}
              onClick={() => { setCatalogMode('archived'); setPage(1) }}
            >
              <Archive size={15} />
              <span>Arsip / Soft-Deleted ({archivedGuns.length})</span>
            </button>
          </div>

          <div className="list-head-right">
            <span className="count">
              {totalItems} piece{totalItems !== 1 ? 's' : ''}
            </span>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AdvancedFilter
          search={search}
          onSearch={handleSearchChange}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={handleCategoryChange}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSortChange}
        />

        {/* Loading & Error States */}
        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setUseLocal(true)}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}

        {!loading && totalItems === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>
              {catalogMode === 'archived'
                ? 'Tidak ada produk di dalam arsip / soft-deleted.'
                : 'No products match your search.'}
            </p>
          </div>
        )}

        {/* Product grid with pagination */}
        {totalItems > 0 && (
          <>
            <ul className="stock">
              {paginatedGuns.map((gun) => (
                <GunCard
                  key={gun.id || gun.name}
                  gun={gun}
                  isArchived={catalogMode === 'archived'}
                  onSelect={(g) => {
                    if (onNavigate) {
                      onNavigate('Detail', g)
                    } else {
                      setSelectedGun(g)
                    }
                  }}
                  onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                  onArchive={handleArchiveGun}
                  onRestore={handleRestoreGun}
                  onDelete={setDeleteTarget}
                />
              ))}
            </ul>

            {/* Pagination Controls */}
            <div className="pagination-container">
              <div className="pagination-info">
                <span>
                  Showing <strong>{startItem}–{endItem}</strong> of <strong>{totalItems}</strong> items
                </span>
                <div className="pagination-per-page">
                  <label htmlFor="perPageSelect">Per page:</label>
                  <select
                    id="perPageSelect"
                    className="pagination-select"
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  >
                    <option value={6}>6</option>
                    <option value={9}>9</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <nav className="pagination-nav" aria-label="Catalog pagination">
                  <button
                    type="button"
                    className="pagination-btn pagination-btn--prev"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={18} />
                    <span>Prev</span>
                  </button>

                  <div className="pagination-pages">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      if (
                        totalPages > 7 &&
                        pageNum !== 1 &&
                        pageNum !== totalPages &&
                        Math.abs(pageNum - currentPage) > 1
                      ) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return (
                            <span key={pageNum} className="pagination-ellipsis">
                              …
                            </span>
                          )
                        }
                        return null
                      }

                      return (
                        <button
                          key={pageNum}
                          type="button"
                          className={`pagination-page-btn ${
                            pageNum === currentPage ? 'pagination-page-btn--active' : ''
                          }`}
                          onClick={() => handlePageChange(pageNum)}
                          aria-label={`Go to page ${pageNum}`}
                          aria-current={pageNum === currentPage ? 'page' : undefined}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    className="pagination-btn pagination-btn--next"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    aria-label="Next Page"
                  >
                    <span>Next</span>
                    <ChevronRight size={18} />
                  </button>
                </nav>
              )}
            </div>
          </>
        )}

        {useLocal && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => { setUseLocal(false); refetch() }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title={catalogMode === 'archived' ? 'Hapus Permanen Produk' : 'Hapus / Arsipkan Produk'}
        message={
          catalogMode === 'archived'
            ? `Apakah Anda yakin ingin menghapus permanen "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`
            : `Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Anda juga dapat mengarsipkannya (soft delete).`
        }
        confirmLabel="Hapus Permanen"
        danger
        loading={deleting}
        onConfirm={handleDeletePermanent}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
      />
      {deleteError && (
        <div className="toast toast--error">{deleteError}</div>
      )}
    </>
  )
}
