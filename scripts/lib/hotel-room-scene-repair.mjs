const ROOM_SCENE_ORDER = new Map([
  ['bedroom', 0],
  ['bathroom', 1],
])

export function canonicalImageKey(value) {
  return String(value || '').trim().replace(/^\/+/, '').split('?')[0]
}

export function repairHotelRoomImageSets(rooms, galleryImages) {
  const sceneByKey = new Map(
    galleryImages.map((image) => [canonicalImageKey(image.storage_key), image.scene_code || 'unspecified']),
  )
  const parsed = rooms.map((room) => {
    const meta = room.meta_json && typeof room.meta_json === 'object' ? room.meta_json : {}
    return {
      room,
      meta,
      images: [...new Set([
        ...(typeof meta.image === 'string' ? [meta.image] : []),
        ...(Array.isArray(meta.images) ? meta.images : []),
      ].map((item) => String(item || '').trim()).filter(Boolean))],
    }
  })
  const occurrences = new Map()
  for (const item of parsed) {
    for (const image of item.images) {
      const key = canonicalImageKey(image)
      occurrences.set(key, (occurrences.get(key) || 0) + 1)
    }
  }

  return parsed.map(({ room, meta, images }) => {
    const kept = images
      .filter((image) => {
        const key = canonicalImageKey(image)
        const scene = sceneByKey.get(key)
        if (!ROOM_SCENE_ORDER.has(scene)) return false
        return rooms.length === 1 || occurrences.get(key) === 1
      })
      .sort((a, b) => {
        const aScene = sceneByKey.get(canonicalImageKey(a))
        const bScene = sceneByKey.get(canonicalImageKey(b))
        return (ROOM_SCENE_ORDER.get(aScene) ?? 99) - (ROOM_SCENE_ORDER.get(bScene) ?? 99)
      })
    return {
      id: room.id,
      before: images,
      after: kept,
      meta: { ...meta, image: kept[0] || '', images: kept },
    }
  })
}
