import { DanceLevel, UserRole } from "./enums"

export interface User {
  id: number
  email: string
  fullName: string
  role: UserRole | string
  birthDate?: string
  danceLevel?: DanceLevel | string
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

