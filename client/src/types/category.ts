export interface Category {
  id: number
  name: string
  code: string
  parentId: number | null
  sortOrder: number
  children?: Category[]
}

export interface Course {
  id: number
  name: string
  description: string
  department: string
  teacherId: string
  categoryId: number | null
}
