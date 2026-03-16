export default function Header({ screen, navigate }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'photo-content-generator', label: 'Photo Generator' }
  ]

  return (
    <header className="bg-[#006633] text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('dashboard')}
          className="flex items-center gap-2 text-xl font-bold hover:opacity-90 transition-opacity"
        >
          <span>🌱</span>
          <span>LocalHarvest AI</span>
        </button>
        <nav className="flex gap-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                screen === item.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
