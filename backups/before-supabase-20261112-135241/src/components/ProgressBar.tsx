type ProgressBarProps = {
  value: number
  color: string
}

export default function ProgressBar({ value, color }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, value * 100))

  return (
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{
          width: `${percent}%`,
          backgroundColor: color,
        }}
      />
    </div>
  )
}
