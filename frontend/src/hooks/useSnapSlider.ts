import _ from 'lodash'
import { useCallback, useEffect, useState } from 'react'

export default function useSnapSlider({ sliderRef }: { sliderRef: React.RefObject<HTMLDivElement | null> }) {
  const [isAtEnd, setIsAtEnd] = useState(false)
  const [isAtStart, setIsAtStart] = useState(true)

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

    const handleScroll = _.debounce(() => {
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
    }, 150)

    slider.addEventListener('scroll', handleScroll)
    return () => {
      slider.removeEventListener('scroll', handleScroll)
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
