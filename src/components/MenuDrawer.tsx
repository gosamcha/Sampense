import { Download, RotateCcw, X } from 'lucide-react'
import { clearAllData, db, exportAllData } from '../db'
import type { ThemeColors } from '../types'
import { THEME_KEYS } from '../theme'

type MenuDrawerProps = {
  theme: ThemeColors
  onClose: () => void
}

export default function MenuDrawer({ theme, onClose }: MenuDrawerProps) {
  async function downloadBackup() {
    const data = await exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sampense-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function reset() {
    if (
      !window.confirm(
        '이 계정의 가계부를 초기화할까요? 삭제는 다른 기기에도 동기화됩니다. 먼저 EXPORT JSON으로 백업해 주세요.',
      )
    ) {
      return
    }

    await clearAllData()
    onClose()
  }

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div className="eyebrow">SAMPENSE</div>
            <h2>Menu</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="drawer-body">
          <section className="drawer-card">
            <div className="section-label">MAIN THEME COLOR</div>
            <div className="settings-list">
              <ColorSetting
                label="Button Background"
                value={theme.primaryBg}
                settingKey={THEME_KEYS.primaryBg}
              />
              <ColorSetting
                label="Button Text"
                value={theme.primaryText}
                settingKey={THEME_KEYS.primaryText}
              />
              <ColorSetting
                label="Income"
                value={theme.income}
                settingKey={THEME_KEYS.income}
              />
              <ColorSetting
                label="Expense"
                value={theme.expense}
                settingKey={THEME_KEYS.expense}
              />
            </div>
          </section>

          <section className="drawer-card">
            <div className="section-label">DATA</div>
            <button
              type="button"
              className="secondary-button full"
              onClick={() => void downloadBackup()}
            >
              <Download size={17} />
              EXPORT JSON
            </button>

            <button
              type="button"
              className="danger-button full"
              onClick={() => void reset()}
            >
              <RotateCcw size={17} />
              RESET APP
            </button>
          </section>

          <section className="drawer-card info-card">
            <div className="section-label">AI</div>
            <p>
              Text and screenshots are sent to Gemini only when you use an AI
              input button. Saved transactions are cached on this device and synced to your Supabase account.
            </p>
            <p>
              Set <strong>GEMINI_API_KEY</strong> in Vercel. Do not expose it as
              a VITE_ environment variable.
            </p>
          </section>
        </div>
      </aside>
    </div>
  )
}

function ColorSetting({
  label,
  value,
  settingKey,
}: {
  label: string
  value: string
  settingKey: string
}) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(event) =>
          void db.settings.put({ key: settingKey, value: event.target.value })
        }
        className="color-input"
      />
    </label>
  )
}
