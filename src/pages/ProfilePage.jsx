import { useState, useMemo } from 'react'
import {
  Shield,
  Copy,
  Check,
  Heart,
  FileText,
  Play,
  Edit3,
  Trash2,
  ExternalLink,
  Info,
  MapPin,
  Phone,
  Clock,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import {
  getAllDraftIds,
  loadDraft,
  deleteDraft,
  formatDraftTime,
} from '../utils/draftStorage'
import { formatPrice } from '../utils/helpers'

/**
 * ProfilePage — User identity and Armory settings.
 * Includes:
 *   - Operator Identity with dedicated "Edit Profile" navigation
 *   - Section Draft: lists all catalog items saved as drafts
 *   - Section About: armory information moved from About page
 *   - Section Contact: contact and location details moved from Contact page
 */
export default function ProfilePage({ onReplaySplash, onNavigateEditProfile, onNavigateCreate, onNavigateEditGun }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [copied, setCopied] = useState(false)
  const [draftRefreshKey, setDraftRefreshKey] = useState(0)

  const { favorites } = useFavorites()

  // Load all current drafts
  const drafts = useMemo(() => {
    // eslint-disable-next-line no-unused-expressions
    draftRefreshKey
    const ids = getAllDraftIds()
    return ids
      .map((id) => {
        const data = loadDraft(id)
        if (!data) return null
        return {
          id,
          name: data.formData?.name || data.name || (id === 'create' ? 'New Hardware Draft' : `Draft #${id.slice(0, 8)}`),
          type: data.formData?.type || data.type || 'Hardware',
          price: data.formData?.price ?? data.price ?? 0,
          savedAt: data.savedAt,
          raw: data,
        }
      })
      .filter(Boolean)
  }, [draftRefreshKey])

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDeleteDraft = (draftId) => {
    if (window.confirm('Hapus draft ini dari penyimpanan lokal?')) {
      deleteDraft(draftId)
      setDraftRefreshKey((k) => k + 1)
    }
  }

  const handleOpenDraft = (draft) => {
    if (draft.id === 'create') {
      if (onNavigateCreate) onNavigateCreate()
    } else {
      if (onNavigateEditGun) onNavigateEditGun({ id: draft.id, ...draft.raw.formData })
    }
  }

  return (
    <div className="profile-page">
      <section className="masthead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="display">Operator Profile</h1>
          <p className="lede">
            Operator credentials, procurement statistics, drafts, and armorer information.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onNavigateEditProfile && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={onNavigateEditProfile}
              title="Edit operator profile on new page"
            >
              <Edit3 size={14} /> Edit Profile
            </button>
          )}
          {onReplaySplash && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={onReplaySplash}
              title="Replay introductory splash animation"
            >
              <Play size={14} /> Replay Intro
            </button>
          )}
        </div>
      </section>

      {/* Operator Card */}
      <div className="profile-card">
        <div className="profile-card-top">
          <div className="avatar-wrap">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={36} stroke="var(--brass)" />
              </div>
            )}
          </div>

          <div className="profile-identity">
            <h2 className="display">{profile.username || 'Shooter'}</h2>
            <div className="profile-id-row">
              <span className="mono-badge">{profile.userId}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCopyId}
                title="Copy User ID to clipboard"
              >
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
            </div>
            {profile.bio && <p className="profile-bio-text">{profile.bio}</p>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="profile-stats">
          <div className="stat-item">
            <Heart size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Procurement Favorites</div>
          </div>
          <div className="stat-item">
            <FileText size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{drafts.length}</div>
            <div className="stat-label">Saved Offline Drafts</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: DRAFTS LIST */}
      <section className="profile-section">
        <div className="list-head" style={{ marginBottom: '16px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} /> Drafts Katalog
          </h2>
          <span className="count">{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</span>
        </div>

        {drafts.length > 0 ? (
          <ul className="profile-draft-list" style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {drafts.map((d) => (
              <li key={d.id} className="profile-draft-item">
                <div className="profile-draft-info">
                  <span className="profile-draft-title">{d.name}</span>
                  <span className="profile-draft-meta">
                    {d.type} · {formatPrice(d.price)} · Disimpan {formatDraftTime(d.savedAt)}
                  </span>
                </div>
                <div className="profile-draft-actions">
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => handleOpenDraft(d)}
                    title="Lanjutkan edit draft"
                  >
                    <ExternalLink size={14} /> Buka Draft
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
                    onClick={() => handleDeleteDraft(d.id)}
                    title="Hapus draft"
                  >
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="state-box" style={{ padding: '24px' }}>
            <p style={{ color: 'var(--steel)' }}>Tidak ada draft katalog yang tersimpan.</p>
          </div>
        )}
      </section>

      {/* SECTION 2: ABOUT (Moved from About page) */}
      <section className="profile-section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Info size={20} /> Tentang Bore &amp; Barrel (About)
        </h2>
        <div className="profile-about-card">
          <h3 className="display" style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
            A one-room armory.
          </h3>
          <p className="lede" style={{ margin: 0, fontSize: '0.98rem', lineHeight: '1.6' }}>
            Bore &amp; Barrel sells a short, honest list of firearms. Each piece is priced
            from the bench — no markup theatre, no filler. Every unit undergoes strict inspection
            and spec sheet validation before arriving at our armory shelves.
          </p>
        </div>
      </section>

      {/* SECTION 3: CONTACT (Moved from Contact page) */}
      <section className="profile-section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <MapPin size={20} /> Kontak &amp; Lokasi (Contact)
        </h2>
        <div className="profile-contact-card">
          <div className="profile-contact-item">
            <MapPin size={18} stroke="var(--brass)" />
            <div>
              <strong>Armory Workshop:</strong> 123 Range Road, Sector 7
            </div>
          </div>
          <div className="profile-contact-item">
            <Clock size={18} stroke="var(--steel)" />
            <div>
              <strong>Hours:</strong> Tuesday to Saturday, 10:00 – 18:00
            </div>
          </div>
          <div className="profile-contact-item">
            <Phone size={18} stroke="var(--brass)" />
            <div>
              <strong>Phone / Dispatch:</strong> (555) 010-0100
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
