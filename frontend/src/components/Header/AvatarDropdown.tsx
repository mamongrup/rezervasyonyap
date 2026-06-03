'use client'

import {
  authIdentityInitial,
  authIdentityLabel,
  trimAuthField,
} from '@/lib/auth-display'
import {
  AUTH_CHANGED_EVENT,
  AUTH_PROFILE_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  getStoredAuthProfile,
  getStoredAuthToken,
  clearStoredAuthToken,
} from '@/lib/auth-storage'
import { clearHeroSearchUserIdCache } from '@/lib/hero-search-plan'
import { getAuthMe, logoutUser } from '@/lib/travel-api'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import { getMessages } from '@/utils/getT'
import { Divider } from '@/shared/divider'
import { Link } from '@/shared/link'
import SwitchDarkMode2 from '@/shared/SwitchDarkMode2'
import { Popover, PopoverButton, PopoverPanel, CloseButton } from '@headlessui/react'
import LoginModal from './LoginModal'
import {
  BulbChargingIcon,
  FavouriteIcon,
  Idea01Icon,
  Logout01Icon,
  Task01Icon,
  UserCircleIcon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { LayoutDashboard } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  className?: string
}

export default function AvatarDropdown({ className }: Props) {
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const T = getMessages(locale).avatarMenu
  const p = (path: string) => normalizeHrefForLocale(locale, path)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  function applyProfile(me: {
    display_name?: string | null
    email?: string | null
    roles?: { role_code: string }[]
    permissions?: string[]
  }) {
    setDisplayName(trimAuthField(me.display_name))
    setEmail(trimAuthField(me.email))
    setIsAdmin(Boolean(
      me.roles?.some((r) => r.role_code === 'admin') ||
      me.permissions?.some((perm) => perm.startsWith('admin.')),
    ))
  }

  const refreshAuth = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setIsLoggedIn(false)
      setIsAdmin(false)
      setDisplayName(null)
      setEmail(null)
      return
    }
    setIsLoggedIn(true)
    const cached = getStoredAuthProfile()
    if (cached) applyProfile(cached)
    try {
      const me = await getAuthMe(token)
      applyProfile(me)
    } catch {
      clearStoredAuthToken()
      setIsLoggedIn(false)
      setIsAdmin(false)
      setDisplayName(null)
      setEmail(null)
    }
  }, [])

  useEffect(() => {
    void refreshAuth()
  }, [refreshAuth])

  useEffect(() => {
    function onAuthChanged() {
      void refreshAuth()
    }
    function onStorage(e: StorageEvent) {
      if (e.key === AUTH_TOKEN_STORAGE_KEY || e.key === AUTH_PROFILE_STORAGE_KEY) {
        void refreshAuth()
      }
    }
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshAuth])

  async function handleLogout() {
    const token = getStoredAuthToken()
    if (token) await logoutUser(token)
    clearStoredAuthToken()
    clearHeroSearchUserIdCache()
    setIsLoggedIn(false)
    setDisplayName(null)
    setEmail(null)
    router.push(p('/login'))
    router.refresh()
  }

  function handleLoginSuccess() {
    setLoginModalOpen(false)
    void refreshAuth()
    router.refresh()
  }

  const primaryLabel = authIdentityLabel(displayName, email, T.memberLabel)
  const secondaryEmail = displayName && email ? email : null
  const avatarInitial = authIdentityInitial(displayName, email)

  return (
    <div className={className}>
      <LoginModal
        open={loginModalOpen}
        onClose={handleLoginSuccess}
        locale={locale}
      />
      <Popover>
        <PopoverButton
          title={isLoggedIn ? primaryLabel : T.loginButton}
          aria-label={isLoggedIn ? primaryLabel : T.loginButton}
          className="-m-2.5 flex max-w-[min(100%,14rem)] cursor-pointer items-center gap-2 rounded-full p-2.5 hover:bg-neutral-100 focus-visible:outline-hidden dark:hover:bg-neutral-800"
        >
          {isLoggedIn ? (
            <>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                {avatarInitial}
              </div>
              <span className="hidden max-w-[9rem] truncate text-sm font-medium text-neutral-800 sm:inline dark:text-neutral-100">
                {primaryLabel}
              </span>
            </>
          ) : (
            <HugeiconsIcon
              icon={UserCircleIcon}
              className="h-6 w-6 shrink-0 text-neutral-800 dark:text-neutral-100"
              strokeWidth={1.75}
            />
          )}
        </PopoverButton>

        <PopoverPanel
          transition
          anchor={{ to: 'bottom end', gap: 16 }}
          className="z-40 w-80 rounded-3xl shadow-lg ring-1 ring-black/5 transition duration-200 ease-in-out data-closed:pointer-events-none data-closed:translate-y-1 data-closed:opacity-0"
        >
          <div className="relative grid grid-cols-1 gap-6 bg-white px-6 py-7 dark:bg-neutral-800">
            {isLoggedIn ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-semibold text-white">
                    {avatarInitial}
                  </div>
                  <div className="min-w-0 grow">
                    <h4 className="truncate font-semibold">{primaryLabel}</h4>
                    {secondaryEmail ? (
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{secondaryEmail}</p>
                    ) : null}
                    {isAdmin && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                        {T.admin}
                      </span>
                    )}
                  </div>
                </div>

                <Divider />

                {isAdmin && (
                  <>
                    <Link href={p('/manage/admin')}
                      className="-m-3 flex items-center rounded-lg bg-primary-50 p-2 transition hover:bg-primary-100 focus:outline-hidden dark:bg-primary-950/30 dark:hover:bg-primary-900/40"
                    >
                      <div className="flex shrink-0 items-center justify-center text-primary-600 dark:text-primary-400">
                        <LayoutDashboard className="h-5 w-5" />
                      </div>
                      <p className="ms-4 text-sm font-semibold text-primary-700 dark:text-primary-300">{T.adminPanel}</p>
                    </Link>
                    <Divider />
                  </>
                )}

                <Link href={p('/account')}
                  className="-m-3 flex items-center rounded-lg p-2 transition hover:bg-neutral-100 focus:outline-hidden dark:hover:bg-neutral-700"
                >
                  <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                    <HugeiconsIcon icon={UserIcon} size={24} strokeWidth={1.5} />
                  </div>
                  <p className="ms-4 text-sm font-medium">{T.profile}</p>
                </Link>

                <Link href={p('/manage/reservations')}
                  className="-m-3 flex items-center rounded-lg p-2 transition hover:bg-neutral-100 focus:outline-hidden dark:hover:bg-neutral-700"
                >
                  <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                    <HugeiconsIcon icon={Task01Icon} size={24} strokeWidth={1.5} />
                  </div>
                  <p className="ms-4 text-sm font-medium">{T.reservations}</p>
                </Link>

                <Link href={p('/account-savelists')}
                  className="-m-3 flex items-center rounded-lg p-2 transition hover:bg-neutral-100 focus:outline-hidden dark:hover:bg-neutral-700"
                >
                  <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                    <HugeiconsIcon icon={FavouriteIcon} size={24} strokeWidth={1.5} />
                  </div>
                  <p className="ms-4 text-sm font-medium">{T.favorites}</p>
                </Link>

                <Divider />

                <div className="-m-3 flex items-center justify-between rounded-lg p-2 hover:bg-neutral-100 focus:outline-none dark:hover:bg-neutral-700">
                  <div className="flex items-center">
                    <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                      <HugeiconsIcon icon={Idea01Icon} size={24} strokeWidth={1.5} />
                    </div>
                    <p className="ms-4 text-sm font-medium">{T.darkMode}</p>
                  </div>
                  <SwitchDarkMode2 />
                </div>

                <Link href={p('/yardim')}
                  className="-m-3 flex items-center rounded-lg p-2 transition hover:bg-neutral-100 focus:outline-hidden dark:hover:bg-neutral-700"
                >
                  <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                    <HugeiconsIcon icon={BulbChargingIcon} size={24} strokeWidth={1.5} />
                  </div>
                  <p className="ms-4 text-sm font-medium">{T.help}</p>
                </Link>

                <button onClick={handleLogout}
                  className="-m-3 flex w-full items-center rounded-lg p-2 text-left transition hover:bg-red-50 focus:outline-hidden dark:hover:bg-red-900/20"
                >
                  <div className="flex shrink-0 items-center justify-center text-red-500">
                    <HugeiconsIcon icon={Logout01Icon} size={24} strokeWidth={1.5} />
                  </div>
                  <p className="ms-4 text-sm font-medium text-red-600 dark:text-red-400">{T.logout}</p>
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-500">{T.signInPrompt}</p>
                <Divider />
                <CloseButton
                  as="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="-m-3 flex w-full items-center rounded-lg bg-primary-600 p-3 text-white transition hover:bg-primary-700"
                >
                  <HugeiconsIcon icon={UserCircleIcon} size={20} color="currentColor" strokeWidth={1.5} className="shrink-0" />
                  <p className="ms-3 text-sm font-semibold">{T.loginButton}</p>
                </CloseButton>
                <CloseButton
                  as={Link}
                  href={p('/signup')}
                  className="-m-3 flex items-center rounded-lg border border-neutral-200 p-3 transition hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700"
                >
                  <p className="text-sm font-medium">{T.signupButton}</p>
                </CloseButton>
                <Divider />
                <div className="-m-3 flex items-center justify-between rounded-lg p-2 hover:bg-neutral-100 focus:outline-none dark:hover:bg-neutral-700">
                  <div className="flex items-center">
                    <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                      <HugeiconsIcon icon={Idea01Icon} size={24} strokeWidth={1.5} />
                    </div>
                    <p className="ms-4 text-sm font-medium">{T.darkMode}</p>
                  </div>
                  <SwitchDarkMode2 />
                </div>
              </>
            )}
          </div>
        </PopoverPanel>
      </Popover>
    </div>
  )
}
