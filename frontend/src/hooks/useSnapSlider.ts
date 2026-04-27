import { useCallback, useEffect, useRef, useState } from 'react'

export default function useSnapSlider({ sliderRef }: { sliderRef: React.RefObject<HTMLDivElement | null> }) {
  const [isAtEnd, setIsAtEnd] = useState(false)
  const [isAtStart, setIsAtStart] = useState(true)
  const rafIdRef = useRef<number | null>(null)

  // Cache item width — değişmez, sadece resize'da güncellenir
  const get_slider_item_size = useCallback(() => {
    const itemWidth = sliderRef.current?.querySelector('.mySnapItem')?.clientWidth || 0
    return document.dir === 'rtl' ? -itemWidth : itemWidth
  }, [sliderRef])

  useEffect(() => {
    const slider = sliderRef.current
    if (!slider) {
      return
    }

    const readAndSetBounds = () => {
      const el = sliderRef.current
      if (!el) {
        return
      }

      // Tüm layout okumalarını tek seferde yap — forced reflow önlenir
      const scrollLeft = el.scrollLeft
      const clientWidth = el.clientWidth
      const scrollWidth = el.scrollWidth

      if (document.dir === 'rtl') {
        setIsAtEnd(-scrollLeft + clientWidth >= scrollWidth - 50)
        setIsAtStart(scrollLeft > -50)
      } else {
        setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - 50)
        setIsAtStart(scrollLeft < 50)
      }
    }

    const handleScroll = () => {
      if (rafIdRef.current != null) return
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null
        readAndSetBounds()
      })
    }

    readAndSetBounds()
    slider.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      slider.removeEventListener('scroll', handleScroll)
      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [sliderRef])

  function scrollToNextSlide() {
    sliderRef.current?.scrollBy({
      left: get_slider_item_size(),
      behavior: 'smooth',
    })
  }

  function scrollToPrevSlide() {
    sliderRef.current?.scrollBy({
      left: -get_slider_item_size(),
      behavior: 'smooth',
    })
  }

  return {
    scrollToNextSlide,
    scrollToPrevSlide,
    isAtEnd,
    isAtStart,
  }
}
