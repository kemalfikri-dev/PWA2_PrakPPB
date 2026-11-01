/**
 * archiveStorage.js — Manages soft-deleted / archived catalog items.
 * Allows archiving (soft delete), restoring, and permanent deletion of items.
 */

const ARCHIVE_KEY = 'bore_barrel_archived_guns'

export const archiveStorage = {
  /**
   * Get all archived items
   * @returns {Array<Object>} List of archived gun objects with archivedAt timestamp
   */
  getArchived() {
    try {
      const raw = localStorage.getItem(ARCHIVE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  /**
   * Get list of archived IDs
   * @returns {Set<string>}
   */
  getArchivedIdSet() {
    return new Set(this.getArchived().map((g) => String(g.id || g.name)))
  },

  /**
   * Check if a specific gun is soft-deleted / archived
   */
  isArchived(gunId) {
    if (!gunId) return false
    const idStr = String(gunId)
    return this.getArchived().some((g) => String(g.id || g.name) === idStr)
  },

  /**
   * Soft-delete / Archive a gun
   * @param {Object} gun - The gun item to archive
   */
  archive(gun) {
    if (!gun) return false
    try {
      const list = this.getArchived()
      const idStr = String(gun.id || gun.name)
      // Check if already archived
      if (!list.some((g) => String(g.id || g.name) === idStr)) {
        const archivedItem = {
          ...gun,
          is_archived: true,
          archivedAt: new Date().toISOString(),
        }
        list.push(archivedItem)
        localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list))
      }
      return true
    } catch (err) {
      console.error('Failed to archive gun:', err)
      return false
    }
  },

  /**
   * Restore a soft-deleted / archived gun back to active catalog
   * @param {string|number} gunId - Gun ID or name to restore
   */
  restore(gunId) {
    try {
      const idStr = String(gunId)
      const list = this.getArchived()
      const filtered = list.filter((g) => String(g.id || g.name) !== idStr)
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(filtered))
      return true
    } catch (err) {
      console.error('Failed to restore gun:', err)
      return false
    }
  },

  /**
   * Permanently delete an item from the archive
   * @param {string|number} gunId
   */
  permanentDelete(gunId) {
    return this.restore(gunId)
  },

  /**
   * Clear entire archive
   */
  clear() {
    localStorage.removeItem(ARCHIVE_KEY)
  },
}

export default archiveStorage
