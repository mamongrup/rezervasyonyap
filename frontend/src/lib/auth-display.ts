/** Oturum kimliği — boş string'leri null say, görünen ad / e-posta türet */

export function trimAuthField(value: string | null | undefined): string | null {
  const s = (value ?? '').trim()
  return s || null
}

export function authIdentityLabel(
  displayName: string | null | undefined,
  email: string | null | undefined,
  fallback: string,
): string {
  return trimAuthField(displayName) || trimAuthField(email) || fallback
}

export function authIdentityInitial(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const label = authIdentityLabel(displayName, email, '')
  return label ? label.charAt(0).toUpperCase() : '?'
}

export function profileFieldsFromAuthUser(user: {
  display_name?: string | null
  email?: string | null
}): { display_name: string | null; email: string | null } {
  return {
    display_name: trimAuthField(user.display_name),
    email: trimAuthField(user.email),
  }
}
