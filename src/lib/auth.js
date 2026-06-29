const normalizeList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

export const isAdminUser = (user) => {
  if (!user) return false

  const roleValue =
    user.user_metadata?.role ??
    user.user_metadata?.isAdmin ??
    user.user_metadata?.is_admin ??
    user.app_metadata?.role ??
    user.app_metadata?.isAdmin ??
    user.app_metadata?.is_admin

  if (typeof roleValue === 'boolean') {
    return roleValue
  }

  if (typeof roleValue === 'string') {
    return roleValue.toLowerCase() === 'admin'
  }

  const adminEmails = normalizeList(import.meta.env.VITE_ADMIN_EMAILS)
  const email = user.email || user.user_metadata?.email || user.app_metadata?.email

  if (email && adminEmails.length > 0) {
    return adminEmails.includes(email.toLowerCase())
  }

  return Boolean(email)
}
