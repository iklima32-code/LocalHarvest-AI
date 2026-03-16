export default function Dashboard({ navigate }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Good morning,', value: 'Your Farm', sub: 'Ready to create content?', color: 'from-[#006633] to-[#008844]' },
          { label: 'Posts Created', value: '0', sub: 'This session', color: 'from-[#5a7a5a] to-[#6b8e6b]' },
          { label: 'Scheduled', value: '0', sub: 'Posts queued', color: 'from-[#17a2b8] to-[#138496]' }
        ].map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br ${stat.color} text-white rounded-xl p-5 shadow`}>
            <div className="text-sm opacity-80 mb-1">{stat.label}</div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-xs opacity-70">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">⚡ Quick Actions</h3>
          <button
            onClick={() => navigate('photo-content-generator')}
            className="w-full mb-3 py-3 px-4 bg-[#17a2b8] hover:bg-[#138496] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            📸 Generate from Photo
          </button>
          <button
            className="w-full py-3 px-4 bg-[#006633] hover:bg-[#005528] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            + Create New Post
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Content Ideas</h3>
          {[
            '🌾 Share your morning harvest routine',
            '📚 Educational post about crop rotation',
            '👨‍🌾 Introduce a team member',
            '🌱 Sustainability practices spotlight'
          ].map((idea, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-md mb-2 text-sm text-gray-600 last:mb-0">
              {idea}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
