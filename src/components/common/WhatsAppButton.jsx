import { MessageCircle } from 'lucide-react'
import { formatPrice } from '../../utils/helpers'

/**
 * WhatsAppButton — Directs users to WhatsApp chat with the seller
 * pre-filled with the product's details and price.
 *
 * @param {Object} props
 * @param {Object} props.gun - Product item
 * @param {string} [props.phone] - Optional phone override (default 6281234567890)
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.iconOnly] - If true, show only icon
 */
export default function WhatsAppButton({
  gun,
  phone = '6281234567890',
  className = '',
  iconOnly = false,
}) {
  if (!gun) return null

  const targetPhone = (gun.seller_phone || phone).replace(/[^0-9]/g, '')
  const priceStr = formatPrice(gun.price ?? gun.cook_time ?? 0)
  const categoryStr = gun.type || gun.category || 'Hardware'
  const caliberStr = gun.caliber ? ` - ${gun.caliber}` : ''

  const message = `Halo, saya tertarik dengan produk ${gun.name} (${categoryStr}${caliberStr}) seharga ${priceStr}. Apakah barang ini masih tersedia?`
  const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`wa-btn ${className}`}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Hubungi penjual untuk ${gun.name} via WhatsApp`}
      title={`Hubungi Penjual via WhatsApp (${targetPhone})`}
    >
      <MessageCircle size={16} className="wa-icon" />
      {!iconOnly && <span className="wa-btn__text">Hubungi Penjual</span>}
    </a>
  )
}
