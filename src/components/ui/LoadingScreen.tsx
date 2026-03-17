import { Spinner } from './index'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center animate-fade-in">
      <h1 className="text-xl font-semibold text-text-1 mb-6">
        intra<span className="text-purple-light">net</span>
      </h1>
      <Spinner size="lg" />
    </div>
  )
}
