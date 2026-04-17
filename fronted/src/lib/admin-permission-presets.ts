export type AdminPermissionPreset = {
  label: string
  description: string
  permissions: string[]
}

/** G3.4–G3.5 — önerilen yönetici izin paketleri. */
export const ADMIN_PERMISSION_PRESETS: Record<string, AdminPermissionPreset> = {
  super_admin: {
    label: 'Süper yönetici',
    description: 'Tüm admin.* izinleri (kullanıcı, rol, audit, matris).',
    permissions: [
      'admin.users.read',
      'admin.roles.read',
      'admin.users.write_roles',
      'admin.audit.read',
      'admin.permissions.read',
      'admin.permissions.write',
    ],
  },
  rbac_admin: {
    label: 'RBAC yöneticisi',
    description: 'Yalnızca izin katalogu ve matrisini yönetebilir.',
    permissions: ['admin.permissions.read', 'admin.permissions.write'],
  },
  support_admin: {
    label: 'Destek yöneticisi',
    description: 'Kullanıcı ve rol görüntüleme ile audit okuma.',
    permissions: ['admin.users.read', 'admin.roles.read', 'admin.audit.read'],
  },
}

