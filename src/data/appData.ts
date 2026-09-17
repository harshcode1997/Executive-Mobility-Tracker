import type { Hr_assignments } from '../generated/models/Hr_assignmentsModel'
import type { Hr_users } from '../generated/models/Hr_usersModel'
import type { Hr_vehicles } from '../generated/models/Hr_vehiclesModel'
import { Hr_assignmentsService } from '../generated/services/Hr_assignmentsService'
import { Hr_usersService } from '../generated/services/Hr_usersService'
import { Hr_vehiclesService } from '../generated/services/Hr_vehiclesService'

export type AssignmentStatus = 'Scheduled' | 'Active' | 'Ending Soon' | 'Expired' | 'Cancelled'
export type VehicleStatus = 'Available' | 'Assigned' | 'Maintenance' | 'Unavailable'

export interface AppUser { id: string; name: string; department: string; email: string }
export interface AppVehicle { id: string; model: string; registration: string; year: number | undefined; color: string; status: VehicleStatus }
export interface AppAssignment { id: string; userId: string; userName: string; department: string; vehicleId: string; vehicleName: string; registration: string; startDate: string; endDate: string; purpose: string; status: AssignmentStatus }
export interface AppData { users: AppUser[]; vehicles: AppVehicle[]; assignments: AppAssignment[]; usingDemoData: boolean }

const demoUsers: AppUser[] = [
  { id: 'demo-user-1', name: 'John Smith', department: 'Executive Office', email: 'john.smith@contoso.com' },
  { id: 'demo-user-2', name: 'Amelia Clarke', department: 'Corporate Affairs', email: 'amelia.clarke@contoso.com' },
  { id: 'demo-user-3', name: 'David Okafor', department: 'Finance', email: 'david.okafor@contoso.com' },
  { id: 'demo-user-4', name: 'Sofia Laurent', department: 'People & Culture', email: 'sofia.laurent@contoso.com' },
]
const demoVehicles: AppVehicle[] = [
  { id: 'demo-vehicle-1', model: 'BMW 5 Series', registration: 'EXE 501', year: 2024, color: 'Mineral White', status: 'Assigned' },
  { id: 'demo-vehicle-2', model: 'Mercedes-Benz E-Class', registration: 'EXE 214', year: 2023, color: 'Obsidian Black', status: 'Available' },
  { id: 'demo-vehicle-3', model: 'Volvo XC90', registration: 'EXE 088', year: 2024, color: 'Silver Dawn', status: 'Assigned' },
  { id: 'demo-vehicle-4', model: 'Audi A8', registration: 'EXE 777', year: 2022, color: 'Glacier White', status: 'Maintenance' },
  { id: 'demo-vehicle-5', model: 'Range Rover Autobiography', registration: 'EXE 900', year: 2024, color: 'Santorini Black', status: 'Available' },
]
const demoAssignments: AppAssignment[] = [
  { id: 'demo-assignment-1', userId: 'demo-user-1', userName: 'John Smith', department: 'Executive Office', vehicleId: 'demo-vehicle-1', vehicleName: 'BMW 5 Series', registration: 'EXE 501', startDate: '2026-09-01', endDate: '2026-09-30', purpose: 'Executive mobility', status: 'Ending Soon' },
  { id: 'demo-assignment-2', userId: 'demo-user-2', userName: 'Amelia Clarke', department: 'Corporate Affairs', vehicleId: 'demo-vehicle-3', vehicleName: 'Volvo XC90', registration: 'EXE 088', startDate: '2026-08-15', endDate: '2026-10-15', purpose: 'Regional leadership tour', status: 'Active' },
  { id: 'demo-assignment-3', userId: 'demo-user-3', userName: 'David Okafor', department: 'Finance', vehicleId: 'demo-vehicle-2', vehicleName: 'Mercedes-Benz E-Class', registration: 'EXE 214', startDate: '2026-10-02', endDate: '2026-10-10', purpose: 'Board meetings', status: 'Scheduled' },
]

const getResultData = <T,>(result: { data?: T }): T | undefined => result.data
const mapUser = (record: Hr_users): AppUser => ({ id: record.hr_userid, name: [record.hr_firstname, record.hr_lastname].filter(Boolean).join(' ') || 'Unnamed executive', department: record.hr_department || 'Department not set', email: record.hr_emailid || 'Email not set' })
const mapVehicle = (record: Hr_vehicles): AppVehicle => ({ id: record.hr_vehicleid, model: record.hr_model || 'Vehicle model not set', registration: 'Registration not captured', year: record.hr_year, color: record.hr_color || 'Colour not set', status: record.hr_statusname === 'Assigned' ? 'Assigned' : record.hr_statusname === 'Available' ? 'Available' : 'Unavailable' })
const getStatus = (startDate: string, endDate: string, sourceStatus?: string): AssignmentStatus => { if (sourceStatus === 'Completed') return 'Expired'; const now = new Date(); const start = new Date(startDate); const end = new Date(endDate); const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / 86400000); if (end < now) return 'Expired'; if (start > now) return 'Scheduled'; if (daysRemaining <= 7) return 'Ending Soon'; return 'Active' }
const mapAssignment = (record: Hr_assignments, users: AppUser[], vehicles: AppVehicle[]): AppAssignment => { const userId = record._hr_emailid_value || ''; const vehicleId = record._hr_vehicle_value || ''; const user = users.find((item) => item.id === userId); const vehicle = vehicles.find((item) => item.id === vehicleId); return { id: record.hr_assignmentid, userId, userName: record.hr_executivename || user?.name || 'Unassigned user', department: record.hr_department || user?.department || 'Department not set', vehicleId, vehicleName: vehicle?.model || 'Vehicle not resolved', registration: vehicle?.registration || 'Registration not captured', startDate: record.hr_startdate, endDate: record.hr_expectedreturndate, purpose: record.hr_purpose || 'Executive mobility', status: getStatus(record.hr_startdate, record.hr_expectedreturndate, record.hr_statusname) } }

export async function loadAppData(): Promise<AppData> {
  try {
    const [userResult, vehicleResult] = await Promise.all([Hr_usersService.getAll({ top: 500 }), Hr_vehiclesService.getAll({ top: 500 })])
    const users = (getResultData(userResult) || []).map(mapUser)
    const vehicles = (getResultData(vehicleResult) || []).map(mapVehicle)
    const assignmentResult = await Hr_assignmentsService.getAll({ top: 500 })
    const assignments = (getResultData(assignmentResult) || []).map((record) => mapAssignment(record, users, vehicles))
    if (users.length || vehicles.length || assignments.length) return { users, vehicles, assignments, usingDemoData: false }
  } catch { /* The preview layer keeps the app usable outside the Power Apps host. */ }
  return { users: demoUsers, vehicles: demoVehicles, assignments: demoAssignments, usingDemoData: true }
}

export function datesOverlap(startDate: string, endDate: string, assignments: AppAssignment[], vehicleId: string, ignoredId?: string) { const start = new Date(startDate).getTime(); const end = new Date(endDate).getTime(); return assignments.find((assignment) => assignment.vehicleId === vehicleId && assignment.id !== ignoredId && assignment.status !== 'Expired' && new Date(assignment.startDate).getTime() <= end && new Date(assignment.endDate).getTime() >= start) }
export async function createDataverseAssignment(userId: string, vehicleId: string, startDate: string, endDate: string, purpose: string, userName: string, department: string) { return Hr_assignmentsService.create({ hr_department: department, 'hr_EmailID@odata.bind': `/hr_users(${userId})`, hr_executivename: userName, hr_expectedreturndate: endDate, hr_purpose: purpose, hr_startdate: startDate, hr_status: 123140000, 'hr_Vehicle@odata.bind': `/hr_vehicles(${vehicleId})`, statecode: 0 }) }