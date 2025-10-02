import { Suspense } from "react"
import ClientExplorerPage from "@/components/custom-ui/client-explorer-page"

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading explorer…</div>}>
      <ClientExplorerPage />
    </Suspense>
  )
}
