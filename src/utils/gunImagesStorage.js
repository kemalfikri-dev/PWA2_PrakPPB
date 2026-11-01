/**
 * gunImagesStorage.js — Persistent multi-image storage and resolver.
 * Ensures every firearm in the catalog has multiple images available
 * and persists custom user-added images across app restarts.
 */

const STORAGE_PREFIX = 'bore_barrel_gun_images_'

export const gunImagesStorage = {
  /**
   * Save multiple images for a gun by its ID or name
   * @param {string|number} gunIdentifier
   * @param {Array<string>} images
   */
  saveImages(gunIdentifier, images) {
    if (!gunIdentifier || !Array.isArray(images) || images.length === 0) return
    try {
      const cleanKey = `${STORAGE_PREFIX}${String(gunIdentifier).toLowerCase().trim()}`
      localStorage.setItem(cleanKey, JSON.stringify(images))
    } catch (err) {
      console.warn('Failed to persist gun images to storage:', err)
    }
  },

  /**
   * Get stored images for a gun, or generate rich multiple images
   * @param {Object} gun - Gun object
   * @returns {Array<string>} List of at least 2-3 valid image URLs
   */
  resolveImages(gun) {
    if (!gun) return ['/guns/pistol.svg']

    const id = gun.id ? String(gun.id).toLowerCase().trim() : null
    const name = gun.name ? String(gun.name).toLowerCase().trim() : null

    // 1. Check localStorage by ID or Name
    try {
      if (id) {
        const storedById = localStorage.getItem(`${STORAGE_PREFIX}${id}`)
        if (storedById) {
          const parsed = JSON.parse(storedById)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      }
      if (name) {
        const storedByName = localStorage.getItem(`${STORAGE_PREFIX}${name}`)
        if (storedByName) {
          const parsed = JSON.parse(storedByName)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      }
    } catch (err) {
      console.warn('Error reading stored gun images:', err)
    }

    // 2. Check if already has an array of images in gun object
    if (Array.isArray(gun.images) && gun.images.length > 1) {
      return gun.images
    }

    // 3. Generate complementary multiple images based on type and primary image
    const primary = (Array.isArray(gun.images) && gun.images[0]) || gun.image_url || gun.image || '/guns/pistol.svg'
    const type = (gun.type || gun.category || '').toLowerCase()

    let secondary = '/guns/pistol-detail.svg'
    if (type.includes('rifle') || type.includes('long')) {
      secondary = '/guns/rifle-detail.svg'
    } else if (type.includes('shotgun')) {
      secondary = '/guns/shotgun-detail.svg'
    }

    const tertiary = '/logo.png'

    // Combine distinct images
    const list = [primary]
    if (!list.includes(secondary)) list.push(secondary)
    if (!list.includes(tertiary)) list.push(tertiary)

    return list
  },
}

export default gunImagesStorage
