import React, { useState } from 'react';
import { FileEntry } from '../types';
import { 
  Folder, FileCode, Copy, Check, Download, 
  ChevronRight, Terminal, FileText
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import ini from 'react-syntax-highlighter/dist/esm/languages/prism/ini';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('ini', ini);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('json', json);

interface CodeViewerProps {
  files: FileEntry[];
  onDownloadZip: () => void;
}

interface TreeNode {
  name: string;
  path: string; // full path if it's a file, or prefix path for a folder
  isFolder: boolean;
  file?: FileEntry;
  children: TreeNode[];
}

function buildFileTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = {
    name: 'firmware_project',
    path: 'root_firmware',
    isFolder: true,
    children: []
  };

  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      if (isLast) {
        // It's a file
        current.children.push({
          name: part,
          path: file.path,
          isFolder: false,
          file: file,
          children: []
        });
      } else {
        // It's a folder. Check if it already exists
        let folder = current.children.find(child => child.isFolder && child.name === part);
        if (!folder) {
          folder = {
            name: part,
            path: currentPath,
            isFolder: true,
            children: []
          };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  });

  // Sort children so that folders come first, then files alphabetically
  const sortTree = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  };
  sortTree(root);

  return root;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ files = [], onDownloadZip }) => {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(
    files.length > 0 ? files[0] : null
  );
  const [copiedIndex, setCopiedIndex] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Fallback to avoid empty initial selection
  const activeFile = selectedFile || (files.length > 0 ? files[0] : null);

  const handleCopyCode = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopiedIndex(true);
    setTimeout(() => setCopiedIndex(false), 2000);
  };

  const handleCopyStructure = () => {
    const list = files.map(f => `├── ${f.path}`).join('\n');
    navigator.clipboard.writeText(`.\n${list}`);
    alert(t('treeCopiedAlert'));
  };

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'c':
      case 'h':
        return 'c';
      case 'cpp':
      case 'hpp':
      case 'ino':
        return 'cpp';
      case 'ini':
        return 'ini';
      case 'md':
        return 'markdown';
      case 'json':
        return 'json';
      default:
        return 'text';
    }
  };

  const tree = buildFileTree(files);

  const renderNode = (node: TreeNode, depth: number = 0) => {
    if (node.isFolder) {
      const folderPath = node.path;
      const isFolderCollapsed = collapsedFolders[folderPath];
      
      return (
        <div key={folderPath} className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleFolder(folderPath)}
            className="w-full flex items-center gap-1.5 py-1.5 px-2 hover:bg-neutral-100 hover:text-neutral-900 rounded-lg text-neutral-600 transition font-medium select-none text-left"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <ChevronRight 
              className={`w-3.5 h-3.5 transition-transform shrink-0 ${isFolderCollapsed ? '' : 'rotate-90'}`} 
            />
            <Folder className="w-4 h-4 text-neutral-500 fill-neutral-100 shrink-0" />
            <span className="truncate">{node.name}/</span>
          </button>
          
          {!isFolderCollapsed && (
            <div className="space-y-0.5">
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // It's a file
    const file = node.file!;
    const isSelected = activeFile?.path === file.path;

    return (
      <button
        key={file.path}
        type="button"
        onClick={() => setSelectedFile(file)}
        className={`w-full flex items-center gap-2 pr-3 py-1.5 rounded-lg text-xs font-medium transition text-left ${
          isSelected
            ? 'bg-neutral-900 text-white font-semibold shadow-sm'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
        }`}
        style={{ paddingLeft: `${depth * 16 + 26}px` }}
      >
        {file.path.endsWith('.md') ? (
          <FileText className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <FileCode className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <h2 className="font-display font-bold text-lg text-neutral-900 tracking-tight">{t('codeTitle')}</h2>
        <p className="text-neutral-500 text-xs">{t('codeDesc')}</p>
      </div>

      {/* Main split file viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 border border-neutral-200/50 rounded-2xl overflow-hidden bg-white shadow-sm h-[520px]">
        {/* Left Side: Directory Layout Tree */}
        <div className="border-r border-neutral-100 bg-neutral-50/50 p-4 space-y-4 flex flex-col h-full overflow-hidden lg:col-span-1">
          <div className="flex items-center gap-2 text-neutral-500">
            <Folder className="w-4.5 h-4.5" />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase">{t('dirTree')}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 text-xs">
            {renderNode(tree, 0)}
          </div>
        </div>

        {/* Right Side: Code editor board */}
        <div className="lg:col-span-3 flex flex-col h-full bg-white relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-100 p-4 bg-neutral-50/20">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-neutral-700" />
              <span className="font-mono text-xs text-neutral-800 font-semibold">{activeFile?.path || 'No file selected'}</span>
            </div>

            <button
              onClick={handleCopyCode}
              disabled={!activeFile}
              className="p-1 px-3 border border-neutral-200 rounded-lg text-xs hover:bg-neutral-50 hover:border-neutral-400 text-neutral-600 hover:text-neutral-900 transition flex items-center gap-1.5 font-bold"
            >
              {copiedIndex ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  {t('copyFile')}
                </>
              )}
            </button>
          </div>

          {/* File Output Stream */}
          <div className="flex-1 w-full min-w-0 overflow-x-auto overflow-y-auto text-[13px] bg-white max-h-[440px]">
            {activeFile ? (
              <SyntaxHighlighter
                language={getLanguage(activeFile.path)}
                style={oneLight}
                showLineNumbers={true}
                customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '13px', width: 'max-content', minWidth: '100%', display: 'grid' }}
                lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', borderRight: '1px solid #f0f0f0', color: '#ccc', marginRight: '1em' }}
              >
                {activeFile.content}
              </SyntaxHighlighter>
            ) : (
              <p className="text-neutral-400 text-xs text-center py-20 font-medium">{t('previewPlaceholder')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Utilities Action Row */}
      <div className="flex items-center justify-between border border-neutral-100 rounded-xl bg-white p-4 shadow-xs">
        <span className="text-[11px] font-medium text-neutral-400 font-mono">
          {t('compatNotice')}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyStructure}
            className="p-2 px-3.5 border border-neutral-200 rounded-lg text-xs hover:bg-neutral-50 hover:border-neutral-400 text-neutral-700 hover:text-neutral-900 transition font-bold"
          >
            {t('copyTree')}
          </button>
          <button
            onClick={onDownloadZip}
            className="p-2 px-4 bg-neutral-950 text-white rounded-lg text-xs hover:bg-neutral-850 transition flex items-center gap-2 font-bold"
          >
            <Download className="w-4 h-4" />
            {t('downloadZipBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
