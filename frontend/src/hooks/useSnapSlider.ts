import { useCallback, useEffect, useRef, useState } from 'react'

export default function useSnapSlider({ sliderRef }: { sliderRef: React.RefObject<HTMLDivElement | null> }) {
  const [isAtEnd, setIsAtEnd] = useState(false)
  const [isAtStart, setIsAtStart] = useState(true)
  const rafIdRef = useRef<number | null>(null)
  /** Ok tıklanınca tekrar ölçüm yapmayı önlemek için `readAndSetBounds` ile güncellenir → forced reflow azalır */
  const itemStridePxRef = useRef(0)

  const get_slider_item_size = useCallback(() => {
    const fallback = sliderRef.current?.querySelector('.mySnapItem')?.clientWidth ?? 0
    const w = itemStridePxRef.current > 0 ? itemStridePxRef.current : fallback
    return document.dir === 'rtl' ? -w : w
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

      if (itemStridePxRef.current <= 0) {
        const item = el.querySelector('.mySnapItem') as HTMLElement | null
        if (item?.clientWidth) itemStridePxRef.current = item.clientWidth
      }

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

    const scheduleRead = () => {
      if (rafIdRef.current != null) return
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null
        readAndSetBounds()
      })
    }

    /**
     * Mount’ta senkron clientWidth okumak, ertelenmiş CSS uygulanınca PSI
     * “zorunlu yeniden düzenleme” üretir. Çift rAF + ResizeObserver ile ayır.
     */
    let bootRaf2 = 0
    const bootRaf1 = window.requestAnimationFrame(() => {
      bootRaf2 = window.requestAnimationFrame(scheduleRead)
    })

    slider.addEventListener('scroll', scheduleRead, { passive: true })

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => scheduleRead())
      ro.observe(slider)
    }

    return () => {
      slider.removeEventListener('scroll', scheduleRead)
      window.cancelAnimationFrame(bootRaf1)
      if (bootRaf2) window.cancelAnimationFrame(bootRaf2)
      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      ro?.disconnect()
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
