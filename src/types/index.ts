// ── Employee ──────────────────────────────────────────────────
export type Role = 'ADMIN' | 'EMPLOYEE'

export interface Employee {
  id:        string
  email:     string
  role:      Role
  isActive:  boolean
  createdAt: string
  profile:   EmployeeProfile | null
}

export interface EmployeeProfile {
  firstName:        string
  lastName:         string
  phone:            string | null
  address:          string | null
  emergencyContact: string | null
  avatarUrl:        string | null
  startDate:        string | null
  birthDate:        string | null
  jobTitle:         string | null
}

export interface BankInfo {
  bankName:       string
  accountNumber:  string
  clearingNumber: string
}

export interface Education {
  id:          string
  institution: string
  degree:      string
  field:       string
  startYear:   number
  endYear:     number | null
  description: string | null
}

// ── Vacation ──────────────────────────────────────────────────
export type VacationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface VacationRequest {
  id:           string
  employeeId:   string
  employeeName: string
  startDate:    string
  endDate:      string
  daysCount:    number
  status:       VacationStatus
  reviewedBy:   string | null
  reviewedAt:   string | null
  createdAt:    string
}

export interface VacationDto {
  id:               string
  employeeId:       string
  employeeName:     string
  employeeInitials: string
  startDate:        string
  endDate:          string
  daysCount:        number
  status:           'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy:       string | null
  reviewedAt:       string | null
  createdAt:        string
}

export interface VacationSummaryDto {
  pending:  number
  approved: number
  rejected: number
}

export interface SubmitVacationRequest {
  startDate: string
  endDate:   string
}

export interface ReviewVacationRequest {
  approved: boolean
}

// ── Benefits ──────────────────────────────────────────────────
export interface BenefitDto {
  id:          string
  name:        string
  description: string | null
}

// ── CRM ───────────────────────────────────────────────────────
export type ClientStatus = 'ACTIVE' | 'PROSPECT' | 'INACTIVE'
export type AssignmentStatus = 'ACTIVE' | 'ENDED'

export interface Client {
  id:           string
  companyName:  string
  contactName:  string | null
  contactEmail: string | null
  phone:        string | null
  orgNumber:    string | null
  status:       ClientStatus
  createdAt:    string
}

export interface Assignment {
  id:          string
  employeeId:  string
  clientId:    string
  companyName: string
  projectName: string
  startDate:   string
  endDate:     string | null
  status:      AssignmentStatus
}

export interface ClientDto {
  id:           string
  companyName:  string
  contactName:  string | null
  contactEmail: string | null
  phone:        string | null
  orgNumber:    string | null
  status:       'ACTIVE' | 'PROSPECT' | 'INACTIVE'
  createdAt:    string
}

export interface NewClientDto {
  companyName:  string
  orgNumber:    string | null
  contactName:  string | null
  contactEmail: string | null
  status:       'ACTIVE' | 'PROSPECT'
}

export interface CreateAssignmentRequest {
  employeeId:  string
  clientId?:   string
  newClient?:  NewClientDto
  projectName: string
  startDate:   string
  endDate?:    string
}

export interface UpdateClientRequest {
  companyName:  string
  contactName:  string | null
  contactEmail: string | null
  phone:        string | null
  orgNumber:    string | null
  status:       'ACTIVE' | 'PROSPECT' | 'INACTIVE'
}

// ── Placements ────────────────────────────────────────────────
export interface AssignmentDto {
  id:          string
  employeeId:  string
  fullName:    string
  initials:    string
  jobTitle:    string | null
  clientId:    string
  companyName: string
  projectName: string
  startDate:   string
  endDate:     string | null
  status:      'ACTIVE' | 'ENDING_SOON' | 'ENDED'
}

export interface ClientGroupDto {
  clientId:        string
  companyName:     string
  clientStatus:    string
  assignmentCount: number
  assignments:     AssignmentDto[]
}

export interface UnplacedDto {
  employeeId:       string
  fullName:         string
  initials:         string
  jobTitle:         string | null
  lastPlacedClient: string | null
  lastPlacedDate:   string | null
}

export interface PlacementViewDto {
  clientGroups:       ClientGroupDto[]
  unplaced:           UnplacedDto[]
  totalPlaced:        number
  totalUnplaced:      number
  endingSoon:         number
  totalActiveClients: number
}

// ── Hub ───────────────────────────────────────────────────────
export interface NewsPost {
  id:          string
  title:       string
  body:        string
  authorName:  string
  publishedAt: string
  pinned:      boolean
}

export interface CompanyEvent {
  id:          string
  title:       string
  description: string | null
  location:    string | null
  eventDate:   string
  endDate:     string | null
  allDay:      boolean
  createdBy:   string
}

export interface NewsPostDto {
  id:             string
  title:          string
  body:           string
  authorName:     string
  authorInitials: string
  publishedAt:    string | null
  createdAt:      string
  pinned:         boolean
  hasCoverImage:  boolean
  coverImageType: string | null
}

export interface NewsPostDetailDto extends NewsPostDto {
  coverImageData: string | null
}

export interface NewsListDto {
  content:       NewsPostDto[]
  totalElements: number
  totalPages:    number
  page:          number
  size:          number
}

export interface EventDto {
  id:          string
  title:       string
  description: string | null
  location:    string | null
  eventDate:   string
  endDate:     string | null
  allDay:      boolean
  createdBy:   string
  authorName:  string | null
}

export interface CreateNewsRequest {
  title:          string
  body:           string
  pinned:         boolean
  publish:        boolean
  coverImageData: string | null
  coverImageType: string | null
}

export interface CreateEventRequest {
  title:       string
  description: string | null
  location:    string | null
  eventDate:   string
  endDate:     string | null
  allDay:      boolean
}

// ── FAQ ───────────────────────────────────────────────────────
export interface FaqItem {
  id:        string
  question:  string
  answer:    string
  category:  string | null
  sortOrder: number
  createdAt: string
}

export interface CreateFaqRequest {
  question: string
  answer:   string
  category: string | null
}

// ── RSVP ──────────────────────────────────────────────────────
export type RsvpStatus = 'GOING' | 'NOT_GOING' | 'MAYBE'

export interface EventRsvpDto {
  myRsvp:      RsvpStatus | null
  goingCount:  number
  maybeCount:  number
  notGoingCount: number
}

// ── API responses ─────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data:    T
  message: string | null
}

export interface PageResponse<T> {
  content:       T[]
  totalElements: number
  totalPages:    number
  page:          number
  size:          number
}
