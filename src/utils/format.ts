const formatPace = ({ pace }: { pace: number | null }) => {
  if (!pace) return '--'
  const min = Math.floor(pace / 60)
  const sec = pace % 60
  return `${min}'${sec.toString().padStart(2, '0')}"`
}

const formatDistance = ({ meters }: { meters: number }) => {
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(2)}km`
}

const formatDuration = ({ seconds }: { seconds: number }) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}m`
  return `${m}m${s.toString().padStart(2, '0')}s`
}

const formatDate = ({ dateStr }: { dateStr: string }) => {
  const d = new Date(dateStr)
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

export { formatPace, formatDistance, formatDuration, formatDate }
