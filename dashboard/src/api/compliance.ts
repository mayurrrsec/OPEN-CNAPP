import { api } from './client'

export type ControlGridRow = {
  control: string
  framework: string | null
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

export type ControlGridResponse = {
  rows: ControlGridRow[]
}

export function fetchControlGrid(framework?: string): Promise<ControlGridResponse> {
  return api
    .get<ControlGridResponse>('/compliance/control-grid', { params: { framework } })
    .then((r) => r.data)
}
