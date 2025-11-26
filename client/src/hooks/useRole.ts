export default function useRole() {
  const role = localStorage.getItem('role') || 'GUEST'
  return { role }
}

