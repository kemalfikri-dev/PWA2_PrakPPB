import { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Star,
  Send,
  Loader,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import ShareButton from '../common/ShareButton'
import WhatsAppButton from '../common/WhatsAppButton'
import LazyImage from '../common/LazyImage'
import {
  useReviews,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
} from '../../hooks/useReviews'
import { getUserIdentifier } from '../../services/userService'
import { formatPrice, averageRating } from '../../utils/helpers'
import reviewVotesStorage from '../../utils/reviewVotesStorage'
import gunImagesStorage from '../../utils/gunImagesStorage'

/**
 * Full-screen product detail view.
 * Supports:
 *   - Multiple images gallery / thumbnails
 *   - WhatsApp direct seller contact
 *   - Full CRUD on product reviews (Create, Read, Update, Delete)
 *   - Review Thumbs Up / Thumbs Down rating
 */
export default function GunDetail({ gun, onBack, onEdit, onDelete }) {
  // Multi-image list resolved via storage & defaults
  const allImages = useMemo(() => gunImagesStorage.resolveImages(gun), [gun])
  const [activeImgIdx, setActiveImgIdx] = useState(0)

  const safeIdx = activeImgIdx < allImages.length ? activeImgIdx : 0
  const activeImage = allImages[safeIdx] || allImages[0]
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  // Reviews CRUD
  const { reviews, loading: reviewsLoading, refetch: refetchReviews } = useReviews(gun.id || gun.name)
  const { createReview, loading: submitting } = useCreateReview()
  const { updateReview, loading: updatingReview } = useUpdateReview()
  const { deleteReview, loading: deletingReview } = useDeleteReview()

  // New review form state
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  // Edit review state
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')

  // Review votes state trigger
  const [votesTrigger, setVotesTrigger] = useState(0)

  const avgRating = gun.average_rating || averageRating(reviews)
  const reviewCount = gun.review_count ?? reviews.length

  const handlePrevImage = () => {
    setActiveImgIdx((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))
  }

  const handleNextImage = () => {
    setActiveImgIdx((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))
  }

  // Submit new review (Create)
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')

    if (rating < 1 || rating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }

    const targetId = gun.id || gun.name
    const result = await createReview(targetId, {
      user_identifier: getUserIdentifier(),
      rating,
      comment: comment.trim(),
    })

    if (result) {
      setReviewSuccess('Review submitted successfully!')
      setComment('')
      setRating(5)
      refetchReviews()
      setTimeout(() => setReviewSuccess(''), 3500)
    } else {
      setReviewError('Could not submit review.')
    }
  }

  // Start editing a review
  const handleStartEdit = (rev) => {
    setEditingReviewId(rev.id)
    setEditRating(rev.rating || 5)
    setEditComment(rev.comment || '')
  }

  // Save edited review (Update)
  const handleSaveEdit = async (revId) => {
    const targetId = gun.id || gun.name
    const res = await updateReview(targetId, revId, {
      rating: editRating,
      comment: editComment.trim(),
    })
    if (res) {
      setEditingReviewId(null)
      refetchReviews()
    }
  }

  // Delete review (Delete)
  const handleDeleteReview = async (revId) => {
    if (window.confirm('Hapus ulasan ini?')) {
      const targetId = gun.id || gun.name
      await deleteReview(targetId, revId)
      refetchReviews()
    }
  }

  // Thumbs up / down
  const handleVote = (revId, type) => {
    reviewVotesStorage.vote(revId, type)
    setVotesTrigger((v) => v + 1)
  }

  return (
    <div className="detail">
      {/* Back button */}
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Back to Catalog
      </button>

      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-gallery">
          <div className="detail-gallery-main" style={{ position: 'relative' }}>
            <LazyImage
              key={activeImage}
              priority
              className="detail-img"
              wrapperClassName="detail-img-wrap"
              src={activeImage}
              alt={gun.name}
              fallbackSrc="/guns/pistol.svg"
            />

            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-nav-btn gallery-nav-btn--prev"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="gallery-nav-btn gallery-nav-btn--next"
                  onClick={handleNextImage}
                  aria-label="Next image"
                >
                  <ChevronRight size={20} />
                </button>
                <span className="gallery-counter">
                  {safeIdx + 1} / {allImages.length}
                </span>
              </>
            )}
          </div>

          {/* Thumbnails row if multiple images exist */}
          {allImages.length > 1 && (
            <div className="detail-thumbnails">
              {allImages.map((img, idx) => (
                <button
                  key={img + idx}
                  type="button"
                  className={`detail-thumb-btn ${idx === safeIdx ? 'detail-thumb-btn--active' : ''}`}
                  onClick={() => setActiveImgIdx(idx)}
                >
                  <img
                    src={img}
                    alt={`${gun.name} view ${idx + 1}`}
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = '/guns/pistol.svg'
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <h1 className="display">{gun.name}</h1>
          <p className="type">
            {category}
            {caliber ? ` · ${caliber}` : ''}
          </p>
          <p className="price detail-price">{formatPrice(price)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </p>
          )}

          <div className="detail-actions" style={{ flexWrap: 'wrap', gap: '10px' }}>
            {/* WhatsApp direct contact */}
            <WhatsAppButton gun={gun} className="btn btn--wa" />

            <FavoriteButton gunId={gun.id || gun.name} />
            <ShareButton gun={gun} className="btn btn--outline" showLabel />

            {onEdit && (
              <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>
                Edit
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn--danger" onClick={() => onDelete(gun)}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="detail-section">
        <h2>Description</h2>
        <p>{gun.description || 'No description available.'}</p>
      </section>

      {/* Specifications */}
      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Specifications</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Assembly / Maintenance Steps</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>
                {step.instruction || step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Reviews Section with Full CRUD & Thumbs Up/Down */}
      <section className="detail-section">
        <h2>Reviews &amp; Ratings</h2>

        {/* Create Review Form */}
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>

          <textarea
            className="review-input"
            rows="3"
            placeholder="Write a product review…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
          >
            {submitting ? (
              <><Loader size={16} className="spin" /> Submitting…</>
            ) : (
              <><Send size={16} /> Submit Review</>
            )}
          </button>

          {reviewError && <p className="form-error">{reviewError}</p>}
          {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
        </form>

        {/* Existing Reviews List with CRUD & Thumbs Up/Down */}
        {reviewsLoading ? (
          <p className="detail-loading">Loading reviews…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => {
              // eslint-disable-next-line no-unused-expressions
              votesTrigger
              const vote = reviewVotesStorage.getReviewVote(rev.id)
              const isEditing = editingReviewId === rev.id

              return (
                <li key={rev.id} className="review-item">
                  {isEditing ? (
                    // Edit Form (Update)
                    <div className="review-edit-box">
                      <div className="review-stars" style={{ marginBottom: '8px' }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className="star-btn"
                            onClick={() => setEditRating(n)}
                          >
                            <Star
                              size={18}
                              fill={n <= editRating ? 'var(--brass)' : 'none'}
                              stroke={n <= editRating ? 'var(--brass)' : 'var(--steel)'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="review-input"
                        rows="2"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        placeholder="Ubah ulasan…"
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          disabled={updatingReview}
                          onClick={() => handleSaveEdit(rev.id)}
                        >
                          <Check size={14} /> Simpan
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => setEditingReviewId(null)}
                        >
                          <X size={14} /> Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Read Review
                    <>
                      <div className="review-head">
                        <span className="review-user">{rev.user_identifier || 'Anonymous'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="review-stars-display">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                size={14}
                                fill={i < rev.rating ? 'var(--brass)' : 'none'}
                                stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                              />
                            ))}
                          </span>

                          {/* Review CRUD Actions */}
                          <button
                            type="button"
                            className="review-act-btn"
                            title="Edit Review"
                            onClick={() => handleStartEdit(rev)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="review-act-btn review-act-btn--danger"
                            title="Hapus Review"
                            disabled={deletingReview}
                            onClick={() => handleDeleteReview(rev.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {rev.comment && <p className="review-comment">{rev.comment}</p>}

                      {/* Thumbs Up / Thumbs Down */}
                      <div className="review-votes-bar">
                        <button
                          type="button"
                          className={`vote-btn ${vote.userVote === 'up' ? 'vote-btn--active-up' : ''}`}
                          onClick={() => handleVote(rev.id, 'up')}
                          title="Thumbs Up"
                        >
                          <ThumbsUp size={13} />
                          <span>{vote.up || 0}</span>
                        </button>
                        <button
                          type="button"
                          className={`vote-btn ${vote.userVote === 'down' ? 'vote-btn--active-down' : ''}`}
                          onClick={() => handleVote(rev.id, 'down')}
                          title="Thumbs Down"
                        >
                          <ThumbsDown size={13} />
                          <span>{vote.down || 0}</span>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="detail-empty">No reviews yet. Be the first!</p>
        )}
      </section>
    </div>
  )
}
