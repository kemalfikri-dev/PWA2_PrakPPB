import { useState } from 'react'
import { ArrowLeft, Save, Shield, Camera, Check } from 'lucide-react'
import userService from '../services/userService'

/**
 * EditProfilePage — Dedicated page to update operator credentials, callsign, and armory notes.
 *
 * @param {Object} props
 * @param {Function} props.onBack - Return to Profile page
 * @param {Function} props.onSuccess - Callback when profile successfully saved
 */
export default function EditProfilePage({ onBack, onSuccess }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [username, setUsername] = useState(profile.username || 'Shooter')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar || null)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setFeedback('Avatar image must be under 2MB.')
      setTimeout(() => setFeedback(''), 3000)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target.result
      setAvatar(base64)
      userService.updateAvatar(base64)
      setFeedback('Avatar image ready.')
      setTimeout(() => setFeedback(''), 2500)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    setSaving(true)

    const updated = {
      ...profile,
      username: username.trim() || 'Shooter',
      bio: bio.trim(),
      avatar,
    }

    const result = userService.saveUserProfile(updated)
    setSaving(false)

    if (result.success) {
      setFeedback('Profile successfully updated!')
      if (onSuccess) {
        setTimeout(() => onSuccess(result.data), 800)
      }
    } else {
      setFeedback('Failed to save profile.')
    }
  }

  return (
    <div className="profile-page edit-profile-page">
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Back to Profile
      </button>

      <section className="masthead">
        <h1 className="display">Edit Operator Profile</h1>
        <p className="lede">
          Update your public callsign, armory station notes, and operator avatar.
        </p>
      </section>

      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="profile-form">
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div className="avatar-wrap" style={{ position: 'relative' }}>
            {avatar ? (
              <img src={avatar} alt={username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={42} stroke="var(--brass)" />
              </div>
            )}
            <label htmlFor="edit-avatar-input" className="avatar-upload-btn" title="Change operator avatar">
              <Camera size={16} />
              <input
                id="edit-avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden-file-input"
              />
            </label>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--steel)', marginTop: '8px' }}>
            Click camera icon to change avatar
          </span>
        </div>

        <div className="form-group">
          <label htmlFor="prof-name" className="form-label">
            Callsign / Operator Alias
          </label>
          <input
            id="prof-name"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Operator Delta, Master Gunsmith"
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="prof-bio" className="form-label">
            Armory Notes / Station Bio
          </label>
          <textarea
            id="prof-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Qualifications, preferred calibers, unit assignment..."
            rows={4}
            className="form-textarea"
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button type="button" className="btn btn--outline" onClick={onBack}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
