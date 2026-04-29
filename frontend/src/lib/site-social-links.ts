import type { SitePublicConfig } from '@/lib/site-public-config'
import type { SocialType } from '@/shared/SocialsShare'
import {
  Facebook01Icon,
  InstagramIcon,
  Mail01Icon,
  NewTwitterIcon,
  YoutubeIcon,
} from '@hugeicons/core-free-icons'

/** `NEXT_PUBLIC_SOCIAL_*` ve site e-postasından vitrin sosyal link listesi (boş alanlar atlanır). */
export function buildSocialLinksFromSiteConfig(
  c: Pick<SitePublicConfig, 'socialFacebook' | 'socialInstagram' | 'socialX' | 'socialYoutube' | 'email'>,
): SocialType[] {
  const out: SocialType[] = []
  if (c.socialFacebook) out.push({ name: 'Facebook', href: c.socialFacebook, icon: Facebook01Icon })
  if (c.socialInstagram) out.push({ name: 'Instagram', href: c.socialInstagram, icon: InstagramIcon })
  if (c.socialX) out.push({ name: 'X', href: c.socialX, icon: NewTwitterIcon })
  if (c.socialYoutube) out.push({ name: 'YouTube', href: c.socialYoutube, icon: YoutubeIcon })
  if (c.email) out.push({ name: 'Email', href: `mailto:${c.email}`, icon: Mail01Icon })
  return out
}
