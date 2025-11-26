export function hasPermission(role: string, feature: string) {
  if (role === 'STUDENT') return true
  return false
}

export default function usePermission() {
  const role = localStorage.getItem('role') || 'GUEST'
  return {
    can: (feature: string) => hasPermission(role, feature)
  }
}

