import { useState, useRef, useEffect } from 'react'

/**
 * LazyImage — Lazy loads images using IntersectionObserver and native loading="lazy",
 * with skeleton placeholder and smooth fade-in transition.
 */
export default function LazyImage({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  fallbackSrc = '/guns/pistol.svg',
  width,
  height,
  style = {},
  ...props
}) {
  const [isInView, setIsInView] = useState(
    () => typeof window === 'undefined' || !('IntersectionObserver' in window)
  )
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (isInView) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '150px 0px',
        threshold: 0.01,
      }
    )

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [isInView])

  const imageSrc = hasError ? fallbackSrc : src

  return (
    <div
      ref={wrapperRef}
      className={`lazy-img-wrapper ${wrapperClassName}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-block',
        width: width ? (typeof width === 'number' ? `${width}px` : width) : '100%',
        ...style,
      }}
    >
      {/* Skeleton placeholder while loading */}
      {!isLoaded && (
        <div
          className="lazy-img-skeleton"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, var(--lift) 25%, var(--line) 50%, var(--lift) 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-shimmer 1.5s infinite',
            borderRadius: 'inherit',
          }}
          aria-hidden="true"
        />
      )}

      {isInView && (
        <img
          key={src}
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true)
            setIsLoaded(true)
          }}
          className={`${className} lazy-img ${isLoaded ? 'lazy-img--loaded' : 'lazy-img--loading'}`}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            display: 'block',
          }}
          {...props}
        />
      )}
    </div>
  )
}
