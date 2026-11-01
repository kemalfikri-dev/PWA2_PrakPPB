import FavoriteButton from '../common/FavoriteButton'
import ShareButton from '../common/ShareButton'
import WhatsAppButton from '../common/WhatsAppButton'
import LazyImage from '../common/LazyImage'
import { formatPrice, truncate } from '../../utils/helpers'
import { Archive, RotateCcw, Trash2, Camera } from 'lucide-react'
import gunImagesStorage from '../../utils/gunImagesStorage'

/**
 * Product card used in the catalog grid.
 * Supports multi-image indicators, WhatsApp direct contact, Soft Delete / Archive, and Restore.
 */
export default function GunCard({
  gun,
  onSelect,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  isArchived = false,
}) {
  const allImages = gunImagesStorage.resolveImages(gun)
  const imgSrc = allImages[0]
  const imageCount = allImages.length

  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  return (
    <li className={`card ${isArchived ? 'card--archived' : ''}`}>
      <button
        type="button"
        className="card-btn"
        onClick={() => onSelect(gun)}
        aria-label={`View ${gun.name}`}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          <LazyImage
            className="card-img"
            wrapperClassName="card-img-wrap"
            src={imgSrc}
            alt={gun.name}
            width="240"
            height="180"
            fallbackSrc="/guns/pistol.svg"
          />

          {/* Multi-image badge */}
          {imageCount > 1 && (
            <span className="card-multi-img-badge" title={`${imageCount} images available`}>
              <Camera size={12} /> {imageCount}
            </span>
          )}

          {/* Archived badge */}
          {isArchived && (
            <span className="card-archived-badge">Arsip / Soft-Deleted</span>
          )}
        </div>

        <span className="name display">{gun.name}</span>

        <span className="type">
          {category}
          {caliber ? ` · ${caliber}` : ''}
        </span>

        {gun.description && (
          <span className="card-desc">{truncate(gun.description, 72)}</span>
        )}

        <span className="price">{formatPrice(price)}</span>
      </button>

      {/* Floating actions row */}
      <div className="card-actions">
        {!isArchived && <FavoriteButton gunId={gun.id || gun.name} />}
        <ShareButton gun={gun} className="card-act-btn" />

        {!isArchived && onEdit && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => { e.stopPropagation(); onEdit(gun) }}
            aria-label={`Edit ${gun.name}`}
            title="Edit"
          >
            ✏️
          </button>
        )}

        {/* Soft Delete / Archive button */}
        {!isArchived && onArchive && (
          <button
            type="button"
            className="card-act-btn card-act-btn--archive"
            onClick={(e) => { e.stopPropagation(); onArchive(gun) }}
            aria-label={`Arsipkan ${gun.name}`}
            title="Arsipkan (Soft Delete)"
          >
            <Archive size={14} />
          </button>
        )}

        {/* Restore button if already archived */}
        {isArchived && onRestore && (
          <button
            type="button"
            className="card-act-btn card-act-btn--restore"
            onClick={(e) => { e.stopPropagation(); onRestore(gun) }}
            aria-label={`Restore ${gun.name}`}
            title="Restore ke Katalog"
          >
            <RotateCcw size={14} color="#10b981" />
          </button>
        )}

        {/* Delete permanent button */}
        {onDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => { e.stopPropagation(); onDelete(gun) }}
            aria-label={`Hapus ${gun.name}`}
            title={isArchived ? 'Hapus Permanen' : 'Hapus'}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* WhatsApp direct contact button at bottom of card */}
      <div className="card-footer-wa">
        <WhatsAppButton gun={gun} className="wa-btn--card" />
      </div>
    </li>
  )
}
