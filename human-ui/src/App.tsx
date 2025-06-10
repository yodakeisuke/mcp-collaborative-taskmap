import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

const countAtom = atomWithStorage('count', 0)

function App() {
  const [count, setCount] = useAtom(countAtom)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          MCP Collaborative TaskMap
        </h1>
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            フロントエンドセットアップ完了！
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500 mb-2">Jotaiテスト用カウンター:</p>
            <p className="text-2xl font-semibold text-indigo-600">{count}</p>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setCount(count + 1)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              +
            </button>
            <button
              onClick={() => setCount(count - 1)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              -
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
