import { useCallback, useEffect, useRef, useState } from 'react'

export default function useSnapSlider({ sliderRef }: { sliderRef: React.RefObject<HTMLDivElement | null> }) {
  const [isAtEnd, setIsAtEnd] = useState(false)
  const [isAtStart, setIsAtStart] = useState(true)
  const rafIdRef = useRef<number | null>(null)
  /** Ok tıklanınca tekrar ölçüm yapmayı önlemek için `readAndSetBounds` ile güncellenir → forced reflow azalır */
  const itemStridePxRef = useRef(0)
  const measuringEnabledRef = useRef(false)

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

    /** Son ölçülen sınırlar — scroll sırasında layout thrash azaltır */
    let lastScrollLeft = Number.NaN
    let lastClientWidth = 0
    let lastScrollWidth = 0

    const readAndSetBounds = () => {
      if (!measuringEnabledRef.current) return
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

      if (
        scrollLeft === lastScrollLeft &&
        clientWidth === lastClientWidth &&
        scrollWidth === lastScrollWidth
      ) {
        return
      }
      lastScrollLeft = scrollLeft
      lastClientWidth = clientWidth
      lastScrollWidth = scrollWidth

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

    const enableAndRead = () => {
      measuringEnabledRef.current = true
      scheduleRead()
    }

    /**
     * Mount’ta hemen clientWidth okumak PSI forced reflow üretir.
     * Viewport yakınına gelince veya ilk scroll’da ölç.
     */
    let io: IntersectionObserver | null = null
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return
          enableAndRead()
          io?.disconnect()
          io = null
        },
        { rootMargin: '120px 0px' },
      )
      io.observe(slider)
    } else {
      const bootRaf1 = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(enableAndRead)
      })
      return () => {
        window.cancelAnimationFrame(bootRaf1)
      }
    }

    slider.addEventListener('scroll', enableAndRead, { passive: true, once: true })
    slider.addEventListener('scroll', scheduleRead, { passive: true })

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (measuringEnabledRef.current) scheduleRead()
      })
      ro.observe(slider)
    }

    return () => {
      slider.removeEventListener('scroll', enableAndRead)
      slider.removeEventListener('scroll', scheduleRead)
      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      io?.disconnect()
      ro?.disconnect()
    }
  }, [sliderRef])

  function scrollToNextSlide() {
    measuringEnabledRef.current = true
    sliderRef.current?.scrollBy({
      left: get_slider_item_size(),
      behavior: 'smooth',
    })
  }

  function scrollToPrevSlide() {
    measuringEnabledRef.current = true
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
