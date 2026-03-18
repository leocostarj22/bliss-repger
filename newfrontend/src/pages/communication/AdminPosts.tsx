import AdminPostsFeed from "@/components/communication/AdminPostsFeed"

export default function AdminPosts() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Posts Administrativos</h1>
        <p className="page-subtitle">Feed interno com likes, media e ações rápidas</p>
        <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
      </div>

      <AdminPostsFeed />
    </div>
  )
}