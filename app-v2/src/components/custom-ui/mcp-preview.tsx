'use client';

import { api } from '@/lib/client/utils';
import { type MCPServerInfo, type MCPToolWithPayments } from '@/lib/gateway/inspect-mcp';
import type { PricingEntry } from '@/types/payments';
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToolExecutionModal } from '@/components/custom-ui/tool-execution-modal';

interface McpPreviewProps {
  url?: string;
  userWalletAddress: string;
}

export function McpPreview({ url, userWalletAddress }: McpPreviewProps) {
  const [serverInfo, setServerInfo] = useState<MCPServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for modal
  const [selectedTool, setSelectedTool] = useState<MCPToolWithPayments | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchServerInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!url) {
          throw new Error('URL is required');
        }
        console.log('Fetching server info for URL:', url);
        const data = await api.getMcpServerInfo(url);
        if (isMounted) {
          setServerInfo(data as MCPServerInfo);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch server info');
          setLoading(false);
        }
      }
    };
    fetchServerInfo();
    return () => { isMounted = false; };
  }, [url, userWalletAddress]);

  if (loading) {
    return <div className="p-4 text-center">Loading server information...</div>;
  }
  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }
  if (!serverInfo) {
    return <div className="p-4 text-center">No server information available</div>;
  }

  return (
    <>
      <div className="space-y-6 p-6">
        {/* Title & Description */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{serverInfo.metadata.name}</h1>
          {serverInfo.metadata.description && (
            <p className="text-sm text-muted-foreground">
              {serverInfo.metadata.description}
            </p>
          )}
        </div>

        {/* Server Info + Capabilities */}
        <div className="grid grid-cols-2 gap-4">
          {/* Server Information Card */}
          <Card className="p-0 rounded-md border-0">
            <CardContent className="p-4">
              <h2 className="text-md font-semibold mb-3">Server Information</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Version:</span>
                <span className="text-right font-medium">{serverInfo.metadata.version}</span>
              </div>

              <div className="text-sm mt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">URL:</span>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={handleCopy}
                    className="cursor-pointer"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                {url ? (
                  <div className="w-full bg-blue-600/5 dark:bg-blue-600/20 p-2 rounded text-center mt-2 break-words">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {url}
                    </a>
                  </div>
                ) : (
                  <span className="text-muted-foreground/70">No URL</span>
                )}
              </div>

            </CardContent>
          </Card>

          {/* Capabilities Card */}
          {serverInfo.metadata.capabilities && (
            <Card className="p-0 rounded-md border-0">
              <CardContent className="p-4">
                <h2 className="text-md font-semibold mb-3">Capabilities</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Prompts List Changed:</span>
                  <span className="text-right font-medium">
                    {serverInfo.metadata.capabilities.prompts?.listChanged ? 'Yes' : 'No'}
                  </span>

                  <span className="text-muted-foreground">Resources Subscribe:</span>
                  <span className="text-right font-medium">
                    {serverInfo.metadata.capabilities.resources?.subscribe ? 'Yes' : 'No'}
                  </span>

                  <span className="text-muted-foreground">Tools List Changed:</span>
                  <span className="text-right font-medium">
                    {serverInfo.metadata.capabilities.tools?.listChanged ? 'Yes' : 'No'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Available Tools */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center">
            Available Tools
            <span className="ml-2 bg-green-500/20 text-green-500 text-xs font-semibold px-2 py-0.5 rounded">
              {serverInfo.toolCount}
            </span>
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {serverInfo.tools.map((tool) => {
              const hasPricing = Array.isArray(tool.pricing) && tool.pricing.length > 0;

              return (
                <Card key={tool.name} className="p-0 rounded-md border-0">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{tool.name}</h3>
                        {tool.description && (
                          <p className="text-sm text-muted-foreground">
                            {tool.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="xs"
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTool(tool);
                          setIsModalOpen(true);
                        }}
                      >
                        Try
                      </Button>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0 flex flex-col items-start space-y-2">
                    <h4
                      className={`text-sm font-semibold uppercase flex items-center ${!hasPricing ? 'text-muted-foreground/70' : ''}`}
                    >
                      PRICING
                      {hasPricing && (
                        <Badge variant="outline" className="ml-2 flex items-center space-x-1 normal-case">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground normal-case font-medium">Active</span>
                        </Badge>
                      )}
                    </h4>

                    <div className="space-y-1">
                      {hasPricing ? (
                        tool.pricing!.map((price: PricingEntry) => (
                          <p key={price.id} className="text-sm">
                            {price.maxAmountRequiredRaw} (decimals: {price.tokenDecimals}) on {price.network}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground/70">Null</p>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Execution Modal */}
      {selectedTool && url && (
        <ToolExecutionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTool(null);
          }}
          tool={selectedTool}
          url={`https://corsproxy.io/?${encodeURIComponent(url as string)}`}
        />
      )}
    </>
  );
}
