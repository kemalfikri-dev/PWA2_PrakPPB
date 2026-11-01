import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

/**
 * ShareButton — Generates a unique link for the gun item and copies it to clipboard
 * or opens native Web Share API on supported devices.
 *
 * @param {Object} props
 * @param {Object} props.gun - The gun item object
 * @param {string} [props.className] - Additional CSS class name
 * @param {boolean} [props.showLabel] - Whether to show text label or icon only
 * @param {Function} [props.onShare] - Optional callback after successful share
 */
export default function ShareButton({ gun, className = '', showLabel = false, onShare }) {
  const [copied, setCopied] = useState(false)
  const [showToast, setShowToast] = useState(false)

  if (!gun) return null

  const getUniqueUrl = () => {
    const gunIdentifier = gun.id || gun.name
    const url = new URL(window.location.origin + window.location.pathname)
    url.searchParams.set('gun', gunIdentifier)
    return url.toString()
  }

  const handleShare = async (e) => {
    e.stopPropagation()
    e.preventDefault()

    const shareUrl = getUniqueUrl()
    const shareData = {
      title: `${gun.name} — Bore & Barrel`,
      text: `Lihat spesifikasi ${gun.name} (${gun.type || gun.category || 'Hardware'} - ${gun.caliber || ''}) di katalog Bore & Barrel.`,
      url: shareUrl,
    }

    let sharedViaNav = false

    // Try native share API if supported on mobile/touch devices
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        sharedViaNav = true
      } catch (err) {
        // User cancelled or aborted native share, fallback to copy
        if (err.name !== 'AbortError') {
          console.warn('Native share failed, falling back to clipboard:', err)
        } else {
          return // User purposefully cancelled
        }
      }
    }

    if (!sharedViaNav) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(shareUrl)
        } else {
          const textArea = document.createElement('textarea')
          textArea.value = shareUrl
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          textArea.remove()
        }
      } catch (copyErr) {
        console.error('Failed to copy unique URL:', copyErr)
      }
    }

    setCopied(true)
    setShowToast(true)
    if (onShare) onShare(shareUrl)

    setTimeout(() => {
      setCopied(false)
    }, 2000)

    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  return (
    <>
      <button
        type="button"
        className={`share-btn ${copied ? 'share-btn--copied' : ''} ${className}`}
        onClick={handleShare}
        aria-label={`Bagikan tautan ${gun.name}`}
        title={copied ? 'Tautan disalin!' : `Bagikan tautan unik ${gun.name}`}
      >
        {copied ? (
          <Check size={16} className="share-icon share-icon--success" />
        ) : (
          <Share2 size={16} className="share-icon" />
        )}
        {showLabel && (
          <span className="share-btn__label">
            {copied ? 'Tautan Disalin!' : 'Bagikan Link'}
          </span>
        )}
      </button>

      {showToast && (
        <div className="share-floating-toast" role="status" aria-live="polite">
          <Check size={16} />
          <span>Tautan unik {gun.name} disalin ke clipboard!</span>
        </div>
      )}
    </>
  )
}
