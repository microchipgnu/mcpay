'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { File, Copy, Download, FileText, Code, Folder, FolderOpen, ChevronRight, ChevronDown, Check } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface FileInfo {
  content: string;
  lastModified: number;
  size: number;
  lastModifiedISO: string;
}

interface SessionData {
  files: Record<string, FileInfo>;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  fileInfo?: FileInfo;
}

interface CodebasePreviewProps {
  sessionData: string;
}

export function CodebasePreview({ sessionData }: CodebasePreviewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<SessionData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // theme & mount for Monaco
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const monacoTheme = mounted
    ? resolvedTheme === 'dark'
      ? 'vs-dark'
      : 'vs'
    : 'vs';

  // Build file tree from flat file structure
  const buildFileTree = (files: Record<string, FileInfo>): TreeNode[] => {
    const tree: TreeNode[] = [];
    const folders: Record<string, TreeNode> = {};

    // Sort files to ensure consistent ordering
    const sortedFilePaths = Object.keys(files).sort();

    for (const filePath of sortedFilePaths) {
      const parts = filePath.split('/');
      let currentLevel = tree;
      let currentPath = '';

      // Create folders for all path segments except the last one (which is the file)
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i];
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        let folder = currentLevel.find(node => node.name === folderName && node.type === 'folder');
        if (!folder) {
          folder = {
            name: folderName,
            path: currentPath,
            type: 'folder',
            children: []
          };
          currentLevel.push(folder);
          folders[currentPath] = folder;
        }
        currentLevel = folder.children!;
      }

      // Add the file
      const fileName = parts[parts.length - 1];
      currentLevel.push({
        name: fileName,
        path: filePath,
        type: 'file',
        fileInfo: files[filePath]
      });
    }

    return tree;
  };

  // parse JSON
  useEffect(() => {
    try {
      const data = JSON.parse(sessionData) as SessionData;
      setParsedData(data);
      setParseError(null);
      const first = Object.keys(data.files)[0];
      if (first) setSelectedFile(first);
      // Auto-expand root level folders
      const tree = buildFileTree(data.files);
      const rootFolders = new Set(tree.filter(node => node.type === 'folder').map(folder => folder.path));
      setExpandedFolders(rootFolders);
    } catch (err) {
      setParsedData(null);
      setParseError(err instanceof Error ? err.message : 'Invalid session data');
    }
  }, [sessionData]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const [justCopied, setJustCopied] = useState(false);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000); // reset after 2s
    });
  };

  const handleDownload = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // indicate success
    setJustDownloaded(true);
    setTimeout(() => setJustDownloaded(false), 2000);
  };

  const fmtSize = (b: number) =>
    b < 1024
      ? `${b} B`
      : b < 1024 ** 2
        ? `${(b / 1024).toFixed(1)} KB`
        : `${(b / 1024 ** 2).toFixed(1)} MB`;

  const iconClass = 'h-4 w-4 text-muted-foreground';
  const getFileIcon = (fn: string) => {
    const ext = fn.split('.').pop()?.toLowerCase();
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext!)) return <Code className={iconClass} />;
    if (['json', 'md'].includes(ext!)) return <FileText className={iconClass} />;
    return <File className={iconClass} />;
  };

  const getLang = (fn: string) => {
    const ext = fn.split('.').pop()?.toLowerCase();
    if (['ts', 'tsx'].includes(ext!)) return 'typescript';
    if (['js', 'jsx'].includes(ext!)) return 'javascript';
    if (ext === 'json') return 'json';
    if (ext === 'md') return 'markdown';
    if (ext === 'env') return 'bash';
    return 'text';
  };

  // Recursive component to render tree nodes
  const TreeNode: React.FC<{ node: TreeNode; depth: number }> = ({ node, depth }) => {
    const isExpanded = expandedFolders.has(node.path);
    const paddingLeft = `${depth * 12 + 8}px`;

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <Button
            variant="ghost"
            className="w-full justify-start px-2 py-1 text-xs font-medium h-auto"
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft }}
          >
            <div className="flex items-center gap-2">
              {isExpanded ?
                <ChevronDown className="h-3 w-3 text-muted-foreground" /> :
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              }
              {isExpanded ?
                <FolderOpen className={iconClass} /> :
                <Folder className={iconClass} />
              }
              <span className="truncate">{node.name}</span>
            </div>
          </Button>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => (
                <TreeNode key={child.path} node={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <Button
          key={node.path}
          variant={selectedFile === node.path ? 'secondary' : 'ghost'}
          className="w-full justify-start px-2 py-1 text-xs font-medium h-auto"
          onClick={() => setSelectedFile(node.path)}
          style={{ paddingLeft }}
        >
          <div className="flex items-center gap-2">
            {getFileIcon(node.name)}
            <span className="truncate">{node.name}</span>
          </div>
        </Button>
      );
    }
  };

  // Error / Loading states
  if (parseError) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-8 flex items-center px-2 bg-red-50">
          <span className="text-red-600 text-sm">Parse Error</span>
        </div>
        <div className="p-2 text-sm text-red-600 flex-1 overflow-auto">
          {parseError}
        </div>
      </div>
    );
  }
  if (!parsedData) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const fileTree = buildFileTree(parsedData.files);

  const totalFiles = Object.keys(parsedData.files).length;
  const totalSizeBytes = Object.values(parsedData.files)
    .reduce((sum, info) => sum + info.size, 0);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* File list panel */}
      <div className="w-1/4 flex-shrink-0 flex flex-col bg-gray-50 dark:bg-gray-800 p-2">
        {/* scrollable file tree */}
        <div className="flex-1 overflow-auto space-y-1">
          {fileTree.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} />
          ))}
        </div>
        {/* fixed footer */}
        <div className="px-2">
          <div className="border-t border-foreground/10 py-2">
            <div className="flex justify-between items-center mt-1 mb-1 text-xs text-muted-foreground">
              <span className="font-medium">Total files</span>
              <span className="text-foreground/80 font-semibold">{totalFiles}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className="font-medium">Total size</span>
              <span className="text-foreground/80 font-semibold">
                {fmtSize(totalSizeBytes)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Code editor panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedFile && (
          <>
            {/* _Your_ header bar at exactly one line of text */}
            <div
              className="h-10 flex items-center justify-between px-4"
              style={{ lineHeight: '2rem' }}
            >
              <div className="flex items-center gap-2 text-xs font-medium">
                {getFileIcon(selectedFile)}
                <span className="truncate text-foreground font-medium">{selectedFile}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {fmtSize(parsedData.files[selectedFile].size)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Copy to clipboard"
                      onClick={() =>
                        handleCopy(parsedData.files[selectedFile].content)
                      }
                    >
                      {justCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Copy
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Download file"
                      onClick={() =>
                        handleDownload(
                          selectedFile,
                          parsedData.files[selectedFile].content
                        )
                      }
                    >
                      {justDownloaded ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Download
                  </TooltipContent>
                </Tooltip>
              </div>

            </div>

            <Separator className="my-0" />

            <div className="flex-1 overflow-auto">
              <Editor
                height="100%"
                language={getLang(selectedFile)}
                value={parsedData.files[selectedFile].content}
                theme={monacoTheme}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  fontSize: 14,
                }}
                onMount={(editor) => {
                  editor.getModel()?.updateOptions({ tabSize: 2 });
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}