import { useEffect, useState } from 'react'
import { api } from '../api/client'

export function useFindings() {
  const [data, setData] = useState<any[]>([])
  useEffect(() => { api.get('/findings').then(r => setData(r.data)).catch(() => setData([])) }, [])
  return data
}
