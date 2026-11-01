import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Loader,
  Save,
  CheckCircle,
  AlertCircle,
  Camera,
} from 'lucide-react'
import gunService from '../services/gunService'
import uploadService from '../services/uploadService'
import {
  saveDraft,
  loadDraft,
  deleteDraft,
  hasDraft,
  getDraftTimestamp,
  formatDraftTime,
} from '../utils/draftStorage'
import ConfirmModal from '../components/modals/ConfirmModal'

/**
 * EditGunPage — Edit an existing weapon / hardware item with multiple images support,
 * specs, steps, and draft management.
 */
export default function EditGunPage({ gun, gunId, onBack, onSuccess }) {
  const targetId = gunId || gun?.id

  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    type: 'Pistol',
    caliber: '9mm',
    category: 'makanan',
    difficulty: 'mudah',
    price: 599,
    description: '',
    servings: 1,
    is_featured: false,
  })

  // Multiple Images List
  const [images, setImages] = useState([])
  const [newImageUrl, setNewImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Specs & Steps
  const [specs, setSpecs] = useState([{ name: '', quantity: '' }])
  const [steps, setSteps] = useState([''])

  // Draft modal
  const [showDraftModal, setShowDraftModal] = useState(() => (targetId ? hasDraft(targetId) : false))
  const [draftTimestamp, setDraftTimestamp] = useState(() => (targetId ? getDraftTimestamp(targetId) : null))

  // Fetch or populate current product
  useEffect(() => {
    const fetchGun = async () => {
      try {
        setLoading(true)
        setError('')

        let data = gun
        if (!data && targetId) {
          const res = await gunService.getGunById(targetId)
          if (res.success) {
            data = res.data
          }
        }

        if (data) {
          setFormData({
            name: data.name || '',
            type: data.type || (data.category === 'minuman' ? 'Rifle' : 'Pistol'),
            caliber: data.caliber || '9mm',
            category: data.category || 'makanan',
            difficulty: data.difficulty || 'mudah',
            price: Number(data.price ?? data.cook_time ?? 599),
            description: data.description || '',
            servings: Number(data.servings || 1),
            is_featured: Boolean(data.is_featured),
          })

          const resolvedImgs = Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : [data.image_url || data.image || '/guns/pistol.svg']
          setImages(resolvedImgs)

          if (data.ingredients && data.ingredients.length > 0) {
            setSpecs(data.ingredients.map((ing) => ({ name: ing.name || 'Component', quantity: ing.quantity || 'Standard' })))
          } else {
            setSpecs([
              { name: 'Platform', quantity: data.type || 'Pistol' },
              { name: 'Caliber', quantity: data.caliber || '9mm' },
            ])
          }

          if (data.steps && data.steps.length > 0) {
            setSteps(data.steps.map((st) => (typeof st === 'string' ? st : st.instruction || '')))
          } else {
            setSteps(['Standard manufacturer maintenance and cleaning protocol.'])
          }

        } else {
          setError('Hardware record could not be loaded.')
        }
      } catch (err) {
        setError(err.message || 'Failed to load hardware record.')
      } finally {
        setLoading(false)
      }
    }

    if (targetId) {
      fetchGun()
    }
  }, [targetId, gun])

  // Draft operations
  const handleLoadDraft = () => {
    const draft = loadDraft(targetId)
    if (draft) {
      if (draft.formData) setFormData(draft.formData)
      if (draft.specs) setSpecs(draft.specs)
      if (draft.steps) setSteps(draft.steps)
      if (Array.isArray(draft.images) && draft.images.length > 0) {
        setImages(draft.images)
      }
      setShowDraftModal(false)
      setSuccessMsg('Saved draft restored.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const handleDiscardDraft = () => {
    deleteDraft(targetId)
    setShowDraftModal(false)
    setDraftTimestamp(null)
  }

  const handleManualSaveDraft = () => {
    const draftData = {
      formData,
      specs,
      steps,
      images,
    }
    const saved = saveDraft(draftData, targetId)
    if (saved) {
      const ts = getDraftTimestamp(targetId)
      setDraftTimestamp(ts)
      setSuccessMsg(`Draft saved (${formatDraftTime(ts)})`)
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  // Handle image files
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const validFiles = files.filter((f) => f.size <= 5 * 1024 * 1024)
    if (validFiles.length > 0) {
      const filePromises = validFiles.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => resolve(URL.createObjectURL(file))
          reader.readAsDataURL(file)
        })
      })

      Promise.all(filePromises).then((base64Urls) => {
        setImages((prev) => [...base64Urls, ...prev])
        setImageFile(validFiles[0])
      })
    }
  }

  const handleUploadNewImage = async () => {
    if (!imageFile) return
    try {
      setUploading(true)
      const res = await uploadService.uploadImage(imageFile)
      if (res.success && res.data?.url) {
        setImages((prev) => [res.data.url, ...prev.filter((p) => p !== res.data.url)])
        setImageFile(null)
        setSuccessMsg('New image uploaded successfully.')
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch (err) {
      console.warn('Image upload failed, using local blob:', err)
      setImageFile(null)
    } finally {
      setUploading(false)
    }
  }

  const handleAddImageUrl = () => {
    if (newImageUrl.trim()) {
      setImages((prev) => [...prev, newImageUrl.trim()])
      setNewImageUrl('')
    }
  }

  const handleSetPrimaryImage = (index) => {
    setImages((prev) => {
      const copy = [...prev]
      const [selected] = copy.splice(index, 1)
      return [selected, ...copy]
    })
  }

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Specs & Steps
  const handleSpecChange = (index, field, value) => {
    setSpecs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addSpec = () => setSpecs((prev) => [...prev, { name: '', quantity: '' }])
  const removeSpec = (index) => {
    if (specs.length <= 1) return
    setSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleStepChange = (index, value) => {
    setSteps((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const addStep = () => setSteps((prev) => [...prev, ''])
  const removeStep = (index) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setError('Product name must be at least 3 characters.')
      return
    }

    const cleanSpecs = specs
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        quantity: s.quantity.trim() || 'Standard',
      }))

    if (cleanSpecs.length === 0) {
      setError('Please provide at least one specification.')
      return
    }

    const cleanSteps = steps
      .filter((s) => s.trim())
      .map((s) => s.trim())

    if (cleanSteps.length === 0) {
      setError('Please provide at least one maintenance step.')
      return
    }

    const primaryImage = images[0] || '/guns/pistol.svg'

    const payload = {
      name: formData.name.trim(),
      type: formData.type || (formData.category === 'minuman' ? 'Rifle' : 'Pistol'),
      caliber: formData.caliber || '9mm',
      price: Number(formData.price) || 500,
      category: formData.category || 'makanan',
      description: formData.description.trim() || `${formData.type} caliber ${formData.caliber}.`,
      image_url: primaryImage,
      images: images.length > 0 ? images : [primaryImage],
      prep_time: 15,
      cook_time: Number(formData.price) || 500,
      servings: Number(formData.servings) || 1,
      difficulty: formData.difficulty || 'mudah',
      is_featured: Boolean(formData.is_featured),
      ingredients: cleanSpecs,
      steps: cleanSteps,
    }

    try {
      setUpdating(true)
      const res = await gunService.updateGun(targetId, payload)
      if (res.success || res.data) {
        deleteDraft(targetId)
        if (onSuccess) {
          onSuccess(res.data)
        } else if (onBack) {
          onBack()
        }
      } else {
        throw new Error(res.message || 'Failed to update record on server.')
      }
    } catch (err) {
      setError(err.message || 'Error occurred while updating record.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="state-box">
        <Loader size={32} className="spin" />
        <p>Loading hardware details for editing…</p>
      </div>
    )
  }

  return (
    <div className="form-page">
      {/* Head */}
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={handleManualSaveDraft}
          title="Save draft"
        >
          <Save size={14} /> Save Draft
        </button>
      </div>

      <div className="form-title-group">
        <h1 className="display">Modify Hardware Record</h1>
        <p className="lede">
          Updating record ID: <code className="mono-badge">{targetId}</code>
        </p>
      </div>

      {error && (
        <div className="toast toast--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="toast toast--success">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="entry-form">
        {/* Multi-Image Gallery Manager */}
        <div className="card-box" style={{ marginBottom: '24px' }}>
          <h2 className="card-box-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={18} /> Hardware Visual Assets ({images.length} Image{images.length !== 1 ? 's' : ''})
          </h2>
          <p className="card-box-desc" style={{ marginBottom: '14px' }}>
            Kelola multiple gambar untuk produk ini. Gambar pertama adalah sampul/cover utama.
          </p>

          <div className="multi-img-grid" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {images.map((img, idx) => (
              <div
                key={img + idx}
                className={`multi-img-card ${idx === 0 ? 'multi-img-card--primary' : ''}`}
              >
                <img src={img} alt={`View ${idx + 1}`} className="multi-img-preview" />
                <div className="multi-img-badges">
                  {idx === 0 ? (
                    <span className="badge-cover">Cover</span>
                  ) : (
                    <button
                      type="button"
                      className="badge-set-cover"
                      onClick={() => handleSetPrimaryImage(idx)}
                      title="Jadikan gambar utama"
                    >
                      Set Cover
                    </button>
                  )}
                </div>
                {images.length > 1 && (
                  <button
                    type="button"
                    className="multi-img-remove-btn"
                    onClick={() => handleRemoveImage(idx)}
                    title="Hapus gambar"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
            <input
              id="edit-gun-image"
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="hidden-file-input"
            />
            <label htmlFor="edit-gun-image" className="btn btn--outline btn--sm">
              <Upload size={14} /> Upload Gambar Tambahan
            </label>

            {imageFile && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleUploadNewImage}
                disabled={uploading}
              >
                {uploading ? <Loader size={14} className="spin" /> : 'Confirm Upload'}
              </button>
            )}

            <div style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '240px' }}>
              <input
                type="url"
                placeholder="Atau tambahkan URL gambar..."
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '0.88rem' }}
              />
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={handleAddImageUrl}
              >
                Tambah URL
              </button>
            </div>
          </div>
        </div>

        {/* Core fields */}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="edit-name" className="form-label">
              Model Designation <span className="req">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-type" className="form-label">
              Platform / Category <span className="req">*</span>
            </label>
            <select
              id="edit-type"
              name="type"
              value={formData.type}
              onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
              className="form-select"
            >
              <option value="Pistol">Pistol (Sidearm)</option>
              <option value="Rifle">Rifle (Long Gun)</option>
              <option value="Shotgun">Shotgun (Smoothbore)</option>
              <option value="Submachine Gun">Submachine Gun</option>
            </select>
          </div>
        </div>

        <div className="form-grid form-grid--3">
          <div className="form-group">
            <label htmlFor="edit-caliber" className="form-label">
              Caliber / Chambering <span className="req">*</span>
            </label>
            <input
              id="edit-caliber"
              type="text"
              value={formData.caliber}
              onChange={(e) => setFormData((p) => ({ ...p, caliber: e.target.value }))}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-price" className="form-label">
              Price (USD) <span className="req">*</span>
            </label>
            <input
              id="edit-price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-difficulty" className="form-label">
              Grade / Quality <span className="req">*</span>
            </label>
            <select
              id="edit-difficulty"
              value={formData.difficulty}
              onChange={(e) => setFormData((p) => ({ ...p, difficulty: e.target.value }))}
              className="form-select"
            >
              <option value="mudah">Commercial / Standard</option>
              <option value="sedang">Mil-Spec / Service Issue</option>
              <option value="sulit">Match Grade / Custom</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="edit-desc" className="form-label">
            Armory Notes / Description
          </label>
          <textarea
            id="edit-desc"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            className="form-textarea"
          />
        </div>

        {/* Specifications */}
        <div className="form-dynamic-section">
          <div className="dynamic-head">
            <h3 className="dynamic-title">Hardware Specifications</h3>
            <button type="button" className="btn btn--outline btn--sm" onClick={addSpec}>
              <Plus size={14} /> Add Spec
            </button>
          </div>

          {specs.map((spec, idx) => (
            <div key={idx} className="dynamic-row">
              <input
                type="text"
                placeholder="Component"
                value={spec.name}
                onChange={(e) => handleSpecChange(idx, 'name', e.target.value)}
                className="form-input"
                required
              />
              <input
                type="text"
                placeholder="Specification"
                value={spec.quantity}
                onChange={(e) => handleSpecChange(idx, 'quantity', e.target.value)}
                className="form-input"
                required
              />
              {specs.length > 1 && (
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => removeSpec(idx)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Assembly / Maintenance Steps */}
        <div className="form-dynamic-section">
          <div className="dynamic-head">
            <h3 className="dynamic-title">Maintenance &amp; Field Strip Steps</h3>
            <button type="button" className="btn btn--outline btn--sm" onClick={addStep}>
              <Plus size={14} /> Add Step
            </button>
          </div>

          {steps.map((st, idx) => (
            <div key={idx} className="dynamic-row dynamic-row--single">
              <span className="step-num">{idx + 1}.</span>
              <input
                type="text"
                value={st}
                onChange={(e) => handleStepChange(idx, e.target.value)}
                className="form-input"
                required
              />
              {steps.length > 1 && (
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => removeStep(idx)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={updating}>
            {updating ? <><Loader size={16} className="spin" /> Updating…</> : 'Save Modifications'}
          </button>
          <button type="button" className="btn btn--outline" onClick={onBack}>
            Cancel
          </button>
        </div>
      </form>

      {/* Draft modal */}
      <ConfirmModal
        open={showDraftModal}
        title="Saved Draft Found"
        message={`An unfinished edit for this product was saved on this device (${formatDraftTime(draftTimestamp)}). Would you like to restore it?`}
        confirmLabel="Restore Draft"
        cancelLabel="Discard"
        onConfirm={handleLoadDraft}
        onCancel={handleDiscardDraft}
      />
    </div>
  )
}
