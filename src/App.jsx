import { useState, useEffect, lazy, Suspense } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import GUNS_LOCAL from './data/guns.js'
import { Loader } from 'lucide-react'
import './App.css'

// Lazy loaded page components (Code Splitting / Lazy Loading)
const Catalog = lazy(() => import('./pages/Catalog.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const CreateGunPage = lazy(() => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazy(() => import('./pages/EditGunPage.jsx'))
const GunDetail = lazy(() => import('./components/gun/GunDetail.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))

// Suspense loading fallback
function ModuleLoader() {
  return (
    <div className="state-box module-loader" style={{ minHeight: '320px' }}>
      <Loader size={32} className="spin" />
      <p style={{ marginTop: '12px', color: 'var(--steel)' }}>Loading module…</p>
    </div>
  )
}

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'edit' | 'detail'
  const [selectedGun, setSelectedGun] = useState(null)
  const [editingGun, setEditingGun] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Sync gun query parameter with URL
  const updateGunUrl = (gun) => {
    const url = new URL(window.location.href)
    if (gun) {
      url.searchParams.set('gun', gun.id || gun.name)
    } else {
      url.searchParams.delete('gun')
    }
    window.history.pushState({}, '', url.toString())
  }

  // Handle unique link parsing (?gun=<id or name>) on load & popstate
  useEffect(() => {
    const checkUrlParams = async () => {
      const params = new URLSearchParams(window.location.search)
      const gunParam = params.get('gun')
      if (!gunParam) return

      const decodedParam = decodeURIComponent(gunParam).trim().toLowerCase()

      // 1. Look in local guns
      const localEnriched = GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))
      const foundLocal = localEnriched.find(
        (g) =>
          String(g.id).toLowerCase() === decodedParam ||
          g.name.toLowerCase() === decodedParam,
      )

      if (foundLocal) {
        setSelectedGun(foundLocal)
        setMode('detail')
        return
      }

      // 2. Fetch via service
      try {
        const res = await gunService.getGunById(gunParam)
        if (res && res.data) {
          setSelectedGun(res.data)
          setMode('detail')
          return
        }
      } catch {
        // Fallback: search across all guns
        try {
          const allRes = await gunService.getGuns({ limit: 100 })
          const list = allRes.data || []
          const match = list.find(
            (g) =>
              String(g.id).toLowerCase() === decodedParam ||
              g.name.toLowerCase() === decodedParam,
          )
          if (match) {
            setSelectedGun(match)
            setMode('detail')
          }
        } catch (err) {
          console.warn('Could not load gun from URL param:', err)
        }
      }
    }

    checkUrlParams()

    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search)
      const g = p.get('gun')
      if (g) {
        checkUrlParams()
      } else {
        setMode('list')
        setSelectedGun(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Unified navigation handler
  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      updateGunUrl(null)
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
      updateGunUrl(payload)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Tab change
      updateGunUrl(null)
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToList = () => {
    updateGunUrl(null)
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
  }

  return (
    <div className="shell">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        <Suspense fallback={<ModuleLoader />}>
          {/* Sub-page views */}
          {mode === 'create' && (
            <CreateGunPage
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'edit' && (
            <EditGunPage
              gun={editingGun}
              gunId={editingGun?.id}
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'detail' && selectedGun && (
            <GunDetail
              gun={selectedGun}
              onBack={handleBackToList}
              onEdit={(g) => handleNavigate('Edit', g)}
              onDelete={(g) => setDeleteTarget(g)}
            />
          )}

          {/* Top-level Tabs */}
          {mode === 'list' && (
            <>
              {tab === 'Catalog' && (
                <Catalog
                  onNavigate={(destination, payload) => handleNavigate(destination, payload)}
                />
              )}
              {tab === 'Favorites' && (
                <FavoritesPage
                  onSelectGun={(g) => handleNavigate('Detail', g)}
                  onNavigateCatalog={() => setTab('Catalog')}
                />
              )}
              {tab === 'Profile' && (
                <ProfilePage onReplaySplash={() => setShowSplash(true)} />
              )}
              {tab === 'About' && <About />}
              {tab === 'Contact' && <Contact />}
            </>
          )}
        </Suspense>
      </main>

      {/* Global Delete Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Hardware Record"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            setDeleting(true)
            await gunService.deleteGun(deleteTarget.id)
            setDeleteTarget(null)
            handleBackToList()
            setTab('Catalog')
          } catch (err) {
            alert(err.message || 'Failed to delete record.')
          } finally {
            setDeleting(false)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App
