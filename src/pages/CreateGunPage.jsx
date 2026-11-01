import { useState, useEffect, useCallback } from 'react'
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
 * CreateGunPage — Create a new weapon / hardware item with multiple images upload,
 * draft persistence (auto-save), specs, and assembly steps.
 */
export default function CreateGunPage({ onBack, onSuccess }) {
  // Step state: 'upload' or 'form'
  const [currentStep, setCurrentStep] = useState('upload')

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
  const [images, setImages] = useState(['/guns/pistol.svg'])
  const [newImageUrl, setNewImageUrl] = useState('')

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState('')

  // Specifications
  const [specs, setSpecs] = useState([
    { name: 'Frame', quantity: 'Polymer' },
    { name: 'Action', quantity: 'Striker-Fired' },
    { name: 'Capacity', quantity: '17 rounds' },
  ])

  // Maintenance / Assembly Steps
  const [steps, setSteps] = useState([
    'Verify firearm is completely unloaded and point in safe direction.',
    'Disassemble slide assembly from receiver frame for routine maintenance.',
  ])

  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Draft management
  const [showDraftModal, setShowDraftModal] = useState(() => hasDraft('create'))
  const [draftTimestamp, setDraftTimestamp] = useState(() => getDraftTimestamp('create'))

  const handleSaveDraft = useCallback((notify = true) => {
    const draftData = {
      formData,
      specs,
      steps,
      images,
      uploadedImageUrl,
    }
    const saved = saveDraft(draftData, 'create')
    if (saved) {
      const ts = getDraftTimestamp('create')
      setDraftTimestamp(ts)
      if (notify) {
        setSuccessMsg(`Draft saved (${formatDraftTime(ts)})`)
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    }
  }, [formData, specs, steps, images, uploadedImageUrl])

  // Auto-save draft every 30 seconds while in form step
  useEffect(() => {
    if (currentStep !== 'form') return

    const interval = setInterval(() => {
      handleSaveDraft(false)
    }, 30000)

    return () => clearInterval(interval)
  }, [handleSaveDraft, currentStep])

  const handleLoadDraft = () => {
    const draft = loadDraft('create')
    if (draft) {
      if (draft.formData) setFormData(draft.formData)
      if (draft.specs) setSpecs(draft.specs)
      if (draft.steps) setSteps(draft.steps)
      if (Array.isArray(draft.images) && draft.images.length > 0) {
        setImages(draft.images)
        setCurrentStep('form')
      } else if (draft.uploadedImageUrl) {
        setUploadedImageUrl(draft.uploadedImageUrl)
        setImagePreview(draft.uploadedImageUrl)
        setImages([draft.uploadedImageUrl])
        setCurrentStep('form')
      }
      setShowDraftModal(false)
      setSuccessMsg('Draft successfully loaded.')
      setTimeout(() => setSuccessMsg(''), 4000)
    }
  }

  const handleDiscardDraft = () => {
    deleteDraft('create')
    setShowDraftModal(false)
    setDraftTimestamp(null)
  }

  // Handle file selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const validFiles = []
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError('One or more files exceed 5MB limit.')
        continue
      }
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowed.includes(file.type)) {
        setError('Allowed formats: .jpg, .jpeg, .png, .webp')
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      setError('')
      const filePromises = validFiles.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => resolve(URL.createObjectURL(file))
          reader.readAsDataURL(file)
        })
      })

      Promise.all(filePromises).then((base64Urls) => {
        setImageFile(validFiles[0])
        setImagePreview(base64Urls[0])
        setImages((prev) => {
          const filtered = prev.filter((p) => p !== '/guns/pistol.svg')
          return [...base64Urls, ...filtered]
        })
      })
    }
  }

  // Quick fallback select vector from local assets
  const handleSelectPreset = (url) => {
    setImageFile(null)
    setImagePreview(url)
    setUploadedImageUrl(url)
    setImages([url])
    setCurrentStep('form')
    setError('')
  }

  // Upload image to server
  const handleUploadImage = async () => {
    if (!imageFile) {
      if (uploadedImageUrl) {
        setCurrentStep('form')
        return
      }
      setError('Please select an image file first.')
      return
    }

    try {
      setUploading(true)
      setError('')
      const result = await uploadService.uploadImage(imageFile)
      if (result.success && result.data?.url) {
        setUploadedImageUrl(result.data.url)
        setImages((prev) => [result.data.url, ...prev.filter((p) => p !== result.data.url)])
        setCurrentStep('form')
      } else {
        throw new Error(result.message || 'Image upload failed.')
      }
    } catch (err) {
      console.warn('Upload API failed, falling back to local preview:', err)
      const targetUrl = imagePreview || '/guns/pistol.svg'
      setUploadedImageUrl(targetUrl)
      setImages((prev) => [targetUrl, ...prev.filter((p) => p !== targetUrl)])
      setCurrentStep('form')
    } finally {
      setUploading(false)
    }
  }

  // Multi-image helper actions
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

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // Specs handlers
  const handleSpecChange = (index, field, value) => {
    setSpecs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addSpec = () => {
    setSpecs((prev) => [...prev, { name: '', quantity: '' }])
  }

  const removeSpec = (index) => {
    if (specs.length <= 1) return
    setSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  // Steps handlers
  const handleStepChange = (index, value) => {
    setSteps((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const addStep = () => {
    setSteps((prev) => [...prev, ''])
  }

  const removeStep = (index) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit form
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
      setError('Please provide at least one maintenance / assembly step.')
      return
    }

    const primaryImage = images[0] || uploadedImageUrl || '/guns/pistol.svg'

    const payload = {
      name: formData.name.trim(),
      type: formData.type || 'Pistol',
      caliber: formData.caliber || '9mm',
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
      setCreating(true)
      const response = await gunService.createGun(payload)
      if (response.success || response.data) {
        deleteDraft('create')
        if (onSuccess) {
          onSuccess(response.data)
        } else if (onBack) {
          onBack()
        }
      } else {
        throw new Error(response.message || 'Failed to create product.')
      }
    } catch (err) {
      setError(err.message || 'Error occurred while saving product to server.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="form-page">
      {/* Header */}
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Catalog
        </button>
        <div className="form-head-actions">
          {currentStep === 'form' && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => handleSaveDraft(true)}
              title="Save draft"
            >
              <Save size={14} /> Save Draft
            </button>
          )}
        </div>
      </div>

      <div className="form-title-group">
        <h1 className="display">Register New Hardware</h1>
        <p className="lede">
          Add a firearm or accessory to the catalog. Multiple images can be added.
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

      {/* Step Indicators */}
      <div className="form-steps-nav">
        <div className={`step-badge ${currentStep === 'upload' ? 'step-badge--active' : 'step-badge--done'}`}>
          1. Imagery
        </div>
        <div className="step-badge-connector" />
        <div className={`step-badge ${currentStep === 'form' ? 'step-badge--active' : ''}`}>
          2. Specifications &amp; Details
        </div>
      </div>

      {/* STEP 1: Upload Image */}
      {currentStep === 'upload' && (
        <div className="card-box">
          <h2 className="card-box-title">Weapon Imagery</h2>
          <p className="card-box-desc">
            Upload photographs or blueprints (max 5MB each, multi-selection supported), or select a stock preset.
          </p>

          {!imagePreview ? (
            <div className="upload-dropzone">
              <input
                id="gun-image-input"
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden-file-input"
              />
              <label htmlFor="gun-image-input" className="upload-label">
                <Upload size={36} className="upload-icon" />
                <span className="upload-main-text">Click to choose image file(s)</span>
                <span className="upload-sub-text">JPG, PNG, or WebP up to 5MB (Bisa pilih &gt;1 gambar)</span>
              </label>

              <div className="preset-selector">
                <span className="preset-title">Or use a stock preset:</span>
                <div className="preset-pills">
                  <button
                    type="button"
                    className="pill"
                    onClick={() => handleSelectPreset('/guns/pistol.svg')}
                  >
                    Pistol Vector
                  </button>
                  <button
                    type="button"
                    className="pill"
                    onClick={() => handleSelectPreset('/guns/rifle.svg')}
                  >
                    Rifle Vector
                  </button>
                  <button
                    type="button"
                    className="pill"
                    onClick={() => handleSelectPreset('/guns/shotgun.svg')}
                  >
                    Shotgun Vector
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="preview-container">
              <div className="preview-image-wrap">
                <img src={imagePreview} alt="Hardware preview" className="preview-img" />
                <button
                  type="button"
                  className="preview-remove-btn"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                    setUploadedImageUrl('')
                  }}
                  title="Remove image"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="preview-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleUploadImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader size={18} className="spin" /> Uploading…
                    </>
                  ) : (
                    <>
                      <Upload size={18} /> Confirm Imagery &amp; Continue
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => {
                    setUploadedImageUrl(imagePreview)
                    setCurrentStep('form')
                  }}
                >
                  Continue without uploading
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Product Form */}
      {currentStep === 'form' && (
        <form onSubmit={handleSubmit} className="entry-form">
          {/* Multi-Image Gallery Manager */}
          <div className="card-box" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 className="card-box-title" style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Camera size={16} /> Galeri Foto Produk ({images.length} Gambar)
              </h3>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => setCurrentStep('upload')}
              >
                Ganti dari awal
              </button>
            </div>
            <p className="card-box-desc" style={{ marginBottom: '14px' }}>
              Anda dapat menambahkan lebih dari 1 gambar. Gambar pertama adalah cover/sampul utama.
            </p>

            {/* Images Grid */}
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

            {/* Add More Images Bar */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
              <input
                id="create-add-more-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden-file-input"
              />
              <label htmlFor="create-add-more-input" className="btn btn--outline btn--sm">
                <Plus size={14} /> Upload File Tambahan
              </label>

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

          {/* Core Info */}
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Model Designation <span className="req">*</span>
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="e.g. Glock 19 Gen 5, Colt M4A1..."
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="type" className="form-label">
                Platform / Category <span className="req">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={(e) => {
                  handleFormChange(e)
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value === 'Pistol' ? 'makanan' : 'minuman',
                  }))
                }}
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
              <label htmlFor="caliber" className="form-label">
                Caliber / Chambering <span className="req">*</span>
              </label>
              <input
                id="caliber"
                type="text"
                name="caliber"
                value={formData.caliber}
                onChange={handleFormChange}
                placeholder="e.g. 9mm, 5.56mm, 12 Gauge"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price" className="form-label">
                Price (USD) <span className="req">*</span>
              </label>
              <input
                id="price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleFormChange}
                placeholder="599"
                min="0"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="difficulty" className="form-label">
                Grade / Build Quality <span className="req">*</span>
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleFormChange}
                className="form-select"
              >
                <option value="mudah">Commercial / Standard</option>
                <option value="sedang">Mil-Spec / Service Issue</option>
                <option value="sulit">Match Grade / Custom</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Armory Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Operational profile, design philosophy, notable deployments..."
              rows={3}
              className="form-textarea"
            />
          </div>

          {/* Specifications */}
          <div className="form-dynamic-section">
            <div className="dynamic-head">
              <h3 className="dynamic-title">Hardware Specifications</h3>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={addSpec}
              >
                <Plus size={14} /> Add Spec
              </button>
            </div>

            {specs.map((spec, idx) => (
              <div key={idx} className="dynamic-row">
                <input
                  type="text"
                  placeholder="e.g. Barrel Length, Action, Trigger Pull"
                  value={spec.name}
                  onChange={(e) => handleSpecChange(idx, 'name', e.target.value)}
                  className="form-input"
                  required
                />
                <input
                  type="text"
                  placeholder="e.g. 4.5 in, Striker, 5.5 lbs"
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
                    title="Remove spec"
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
              <h3 className="dynamic-title">Assembly &amp; Maintenance Protocol</h3>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={addStep}
              >
                <Plus size={14} /> Add Step
              </button>
            </div>

            {steps.map((step, idx) => (
              <div key={idx} className="dynamic-row dynamic-row--single">
                <span className="step-num">{idx + 1}.</span>
                <input
                  type="text"
                  placeholder="e.g. Lock slide to rear and ensure chamber is empty."
                  value={step}
                  onChange={(e) => handleStepChange(idx, e.target.value)}
                  className="form-input"
                  required
                />
                {steps.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    onClick={() => removeStep(idx)}
                    title="Remove step"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Submit bar */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader size={16} className="spin" /> Registering Hardware…
                </>
              ) : (
                'Confirm Hardware Registration'
              )}
            </button>
            <button
              type="button"
              className="btn btn--outline"
              onClick={onBack}
              disabled={creating}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Draft modal */}
      <ConfirmModal
        open={showDraftModal}
        title="Saved Draft Found"
        message={`An unfinished hardware registration was saved on this device (${formatDraftTime(draftTimestamp)}). Would you like to restore it?`}
        confirmLabel="Restore Draft"
        cancelLabel="Discard"
        onConfirm={handleLoadDraft}
        onCancel={handleDiscardDraft}
      />
    </div>
  )
}
