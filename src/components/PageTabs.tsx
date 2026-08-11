import type { PageName, ThemeColors } from '../types'

const pages: PageName[] = ['daily', 'weekly', 'monthly']

type PageTabsProps = {
  page: PageName
  theme: ThemeColors
  onChange: (page: PageName) => void
}

export default function PageTabs({ page, theme, onChange }: PageTabsProps) {
  return (
    <div className="page-tabs-wrap">
      <div className="page-tabs">
        {pages.map((item) => {
          const active = page === item
          return (
            <button
              key={item}
              type="button"
              className={`page-tab ${active ? 'active' : ''}`}
              onClick={() => onChange(item)}
              style={active ? { color: theme.primaryBg } : undefined}
            >
              {item.toUpperCase()}
              <span
                className="page-tab-line"
                style={{
                  backgroundColor: active ? theme.primaryBg : 'transparent',
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
