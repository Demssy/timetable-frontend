export interface User {
  id: number
  email: string
  fullName: string
  role: string
  isActive: boolean
}


export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  birthDate: string
}

