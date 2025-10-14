"use client"

import Footer from "@/components/custom-ui/footer"
import ServersGrid from "@/components/custom-ui/servers-grid"
import { useTheme } from "@/components/providers/theme-context"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { mcpDataApi, McpServer } from "@/lib/client/utils"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"


const PAGE_SIZE = 12

export default function ClientServersPage() {
    const { isDark } = useTheme()
    const searchParams = useSearchParams()
    const router = useRouter()

    const pageFromQuery = Number(searchParams.get("page") || "1")
    const [page, setPage] = useState<number>(Number.isFinite(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1)

    const [servers, setServers] = useState<McpServer[]>([])
    const [allServers, setAllServers] = useState<McpServer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [hasNext, setHasNext] = useState(false)
    const [totalCount, setTotalCount] = useState<number | null>(null)

    const [footerFixed, setFooterFixed] = useState(true)
    const contentRef = useRef<HTMLDivElement | null>(null)

    const totalPages = useMemo(() => {
        if (totalCount != null) return Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
        return page + (hasNext ? 1 : 0)
    }, [totalCount, page, hasNext])

    useEffect(() => {
        const sp = new URLSearchParams(searchParams.toString())
        if (page === 1) sp.delete("page"); else sp.set("page", String(page))
        router.replace(`?${sp.toString()}`, { scroll: true })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page])

    useEffect(() => {
        if (page !== pageFromQuery && Number.isFinite(pageFromQuery) && pageFromQuery > 0) {
            setPage(pageFromQuery)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageFromQuery])

    // Fetch servers from MCP2 `/servers`
    useEffect(() => {
        const fetchServers = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await mcpDataApi.getServers()
                const links = Array.isArray(data.servers) ? data.servers : []

                setAllServers(links)
            } catch (e: unknown) {
                if (e instanceof Error && e.name !== "AbortError") setError(e.message)
                else if (!(e instanceof Error)) setError("Failed to fetch servers")
                setAllServers([])
            } finally {
                setLoading(false)
            }
        }

        fetchServers()
    }, [])

    // Slice current page
    useEffect(() => {
        const start = (page - 1) * PAGE_SIZE
        const end = start + PAGE_SIZE
        const slice = allServers.slice(start, end)
        setServers(slice)
        setTotalCount(allServers.length)
        setHasNext(end < allServers.length)
    }, [page, allServers])

    useEffect(() => {
        let mounted = true

        const imgsLoaded = () => {
            const imgs = Array.from(document.images).filter(img => !img.complete)
            if (imgs.length === 0) return Promise.resolve()
            return new Promise<void>(resolve => {
                let done = 0
                const onDone = () => { if (++done >= imgs.length) resolve() }
                imgs.forEach(img => {
                    img.addEventListener("load", onDone, { once: true })
                    img.addEventListener("error", onDone, { once: true })
                })
                setTimeout(resolve, 500)
            })
        }

        const measure = () => {
            const doc = document.documentElement
            const body = document.body
            const scrollH = Math.max(body.scrollHeight, doc.scrollHeight)
            const clientH = window.innerHeight
            if (mounted) setFooterFixed(scrollH <= clientH + 1)
        }

        const settleThenMeasure = async () => {
            if (loading) {
                setFooterFixed(true)
                return
            }
            await imgsLoaded()
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
            if (!mounted) return
            measure()
        }

        settleThenMeasure()
        const onResize = () => requestAnimationFrame(measure)
        window.addEventListener("resize", onResize)

        return () => {
            mounted = false
            window.removeEventListener("resize", onResize)
        }
    }, [loading, servers, page, totalCount])

    const getFriendlyErrorMessage = (err: string) =>
        err.includes("404")
            ? { title: "No servers found", message: "It seems there are no servers registered yet." }
            : { title: "Something went wrong", message: "We couldn't load the servers right now." }

    const go = (p: number) => setPage(Math.max(1, p))
    const goPrev = () => go(page - 1)
    const goNext = () => {
        if (totalCount != null ? page < totalPages : hasNext) go(page + 1)
    }

    if (error) {
        const info = getFriendlyErrorMessage(error)
        return (
            <div className="bg-background">
                <main>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 text-center">
                        <h1 className={`text-5xl font-extrabold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>{info.title}</h1>
                        <p className={`text-lg max-w-3xl mx-auto ${isDark ? "text-gray-300" : "text-gray-600"}`}>{info.message}</p>
                    </div>
                </main>
                <div className={footerFixed ? "fixed inset-x-0 bottom-0" : ""}>
                    <Footer />
                </div>
            </div>
        )
    }

    const showPagination = totalCount != null ? totalCount > PAGE_SIZE : page > 1 || hasNext

    return (
        <div className="bg-background">
            <main>
                <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                    <div className="max-w-6xl px-4 md:px-6 mx-auto">
                        <h2 className="text-3xl font-semibold font-host mb-10">All Servers</h2>
                    </div>

                    <ServersGrid
                        servers={servers}
                        loading={loading}
                        className={`mb-0 ${loading && servers.length === 0 ? "min-h-[400px]" : ""}`}
                    />

                    {showPagination && (
                        <div className="mt-10">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={goPrev}
                                            aria-disabled={page === 1 || loading}
                                            className={page === 1 || loading ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>

                                    {totalCount != null && totalPages > 1 ? (
                                        <>
                                            {page > 2 && (
                                                <>
                                                    <PaginationItem>
                                                        <PaginationLink onClick={() => go(1)}>1</PaginationLink>
                                                    </PaginationItem>
                                                    {page > 3 && (
                                                        <PaginationItem>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                    )}
                                                </>
                                            )}

                                            {Array.from({ length: 3 })
                                                .map((_, i) => page - 1 + i)
                                                .filter(p => p >= 1 && p <= totalPages)
                                                .map(p => (
                                                    <PaginationItem key={p}>
                                                        <PaginationLink onClick={() => go(p)} isActive={p === page}>
                                                            {p}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}

                                            {page < totalPages - 1 && (
                                                <>
                                                    {page < totalPages - 2 && (
                                                        <PaginationItem>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                    )}
                                                    <PaginationItem>
                                                        <PaginationLink onClick={() => go(totalPages)}>{totalPages}</PaginationLink>
                                                    </PaginationItem>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <PaginationItem>
                                            <PaginationLink isActive>{page}</PaginationLink>
                                        </PaginationItem>
                                    )}

                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={goNext}
                                            aria-disabled={loading || (totalCount != null ? page >= totalPages : !hasNext)}
                                            className={loading || (totalCount != null ? page >= totalPages : !hasNext) ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </div>
            </main>

            <div className={footerFixed ? "fixed inset-x-0 bottom-0" : "mt-12"}>
                <Footer />
            </div>
        </div>
    )
}
