import { Suspense } from "react"
import ClientServersPage from "@/components/custom-ui/client-servers-page"

export default function Page() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading servers...</div>}>
            <ClientServersPage />
        </Suspense>
    )
}
