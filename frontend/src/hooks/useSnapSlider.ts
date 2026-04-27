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

      const item = el.querySelector('.mySnapItem') as HTMLElement | null
      if (item?.clientWidth) itemStridePxRef.current = item.clientWidth

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

    const scheduleReadFromScrollOrResize = () => {
      if (rafIdRef.current != null) return
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null
        readAndSetBounds()
      })
    }

    /** İlk okuma: çift rAF ile commit sonrası layout otursun; iç/dış id cleanup'ta iptal */
    let initOuter: number | null = null
    let initInner: number | null = null
    initOuter = window.requestAnimationFrame(() => {
      initOuter = null
      initInner = window.requestAnimationFrame(() => {
        initInner = null
        readAndSetBounds()
      })
    })

    slider.addEventListener('scroll', scheduleReadFromScrollOrResize, { passive: true })
    window.addEventListener('resize', scheduleReadFromScrollOrResize, { passive: true })

    return () => {
      if (initOuter != null) window.cancelAnimationFrame(initOuter)
      if (initInner != null) window.cancelAnimationFrame(initInner)
      slider.removeEventListener('scroll', scheduleReadFromScrollOrResize)
      window.removeEventListener('resize', scheduleReadFromScrollOrResize)
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
