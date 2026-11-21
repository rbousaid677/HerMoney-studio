import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { isValidImageUrl, uploadArticleImageDetailed } from '../services/imageService';
import { calculateReadingTime, sanitizeArticleHtml } from '../utils/htmlUtils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  editorKey: string;
}

export function RichTextEditor({ value, onChange, editorKey }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastLoadedKeyRef = useRef<string>('');
  const savedRangeRef = useRef<Range | null>(null);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (lastLoadedKeyRef.current !== editorKey) {
      editorRef.current.innerHTML = value || '<p></p>';
      lastLoadedKeyRef.current = editorKey;
    }
  }, [editorKey, value]);

  const metrics = useMemo(() => calculateReadingTime(value), [value]);

  function saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (selection && savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
  }

  function emitChange() {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }

  function execCommand(command: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  }

  function handleBlockFormat(tag: string) {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, tag);
    emitChange();
  }

  function openLinkDialog() {
    saveSelection();
    const selectedText = window.getSelection()?.toString() || '';
    setLinkText(selectedText);
    setLinkUrl('https://');
    setLinkModalOpen(true);
  }

  function applyLink(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = linkUrl.trim();
    if (!/^https?:\/\/|^mailto:/i.test(trimmed)) {
      return;
    }
    editorRef.current?.focus();
    restoreSelection();

    const safeHref = trimmed.replace(/"/g, '&quot;');
    const selected = window.getSelection()?.toString();
    if (selected) {
      document.execCommand('createLink', false, safeHref);
    } else {
      const label = (linkText.trim() || safeHref).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`
      );
    }
    emitChange();
    setLinkModalOpen(false);
  }

  function openImageDialog() {
    saveSelection();
    setImageUrlInput('');
    setImageAltInput('');
    setImageError(null);
    setImageModalOpen(true);
  }

  function insertImageHtml(src: string, alt: string) {
    const editor = editorRef.current;
    if (!editor) return;

    const safeSrc = src.replace(/"/g, '&quot;');
    const safeAlt = (alt.trim() || 'Article illustration').replace(/"/g, '&quot;');
    const imageMarkup = `<p><img src="${safeSrc}" alt="${safeAlt}" /></p><p><br /></p>`;

    editor.focus();
    const saved = savedRangeRef.current;
    if (saved && editor.contains(saved.commonAncestorContainer)) {
      restoreSelection();
      const inserted = document.execCommand('insertHTML', false, imageMarkup);
      if (!inserted) {
        editor.insertAdjacentHTML('beforeend', imageMarkup);
      }
    } else {
      editor.insertAdjacentHTML('beforeend', imageMarkup);
    }

    emitChange();
    setImageModalOpen(false);
  }

  function handleInsertUrlImage(e: React.FormEvent) {
    e.preventDefault();
    setImageError(null);
    if (!isValidImageUrl(imageUrlInput)) {
      setImageError('Please enter a valid http:// or https:// image URL.');
      return;
    }
    insertImageHtml(imageUrlInput.trim(), imageAltInput);
  }

  async function handleUploadInlineImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    setUploadingImage(true);
    try {
      const result = await uploadArticleImageDetailed(file, 'inline');
      insertImageHtml(result.url, imageAltInput || file.name.replace(/\.[^/.]+$/, ''));
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const html = e.clipboardData.getData('text/html');
    if (html) {
      e.preventDefault();
      const clean = sanitizeArticleHtml(html);
      document.execCommand('insertHTML', false, clean);
      emitChange();
    }
  }

  return (
    <div className="border border-[#E8E0DF] rounded-xl bg-white overflow-hidden">
      {/* Microsoft Word-style Formatting Ribbon */}
      <div
        role="toolbar"
        aria-label="Article formatting toolbar"
        className="p-2.5 bg-[#FCF9F6] border-b border-[#E8E0DF] flex flex-wrap items-center gap-1"
      >
        <button
          type="button"
          title="Undo"
          onClick={() => execCommand('undo')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Redo"
          onClick={() => execCommand('redo')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-[#E8E0DF] mx-1" aria-hidden="true" />

        <select
          aria-label="Text style"
          defaultValue="p"
          onChange={(e) => handleBlockFormat(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-medium bg-white border border-[#E8E0DF] rounded-md text-[#1F1B1C] focus:outline-none focus:border-[#8E3F4F] cursor-pointer"
        >
          <option value="p">Normal Paragraph</option>
          <option value="h2">Heading 2 (TOC)</option>
          <option value="h3">Heading 3 (TOC)</option>
          <option value="h4">Heading 4</option>
          <option value="blockquote">Editorial Quote</option>
        </select>

        <span className="w-px h-5 bg-[#E8E0DF] mx-1" aria-hidden="true" />

        <button
          type="button"
          title="Bold"
          onClick={() => execCommand('bold')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Italic"
          onClick={() => execCommand('italic')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Underline"
          onClick={() => execCommand('underline')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Strikethrough"
          onClick={() => execCommand('strikeThrough')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-[#E8E0DF] mx-1" aria-hidden="true" />

        <button
          type="button"
          title="Bullet List"
          onClick={() => execCommand('insertUnorderedList')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Numbered List"
          onClick={() => execCommand('insertOrderedList')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Blockquote"
          onClick={() => handleBlockFormat('blockquote')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <Quote className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-[#E8E0DF] mx-1" aria-hidden="true" />

        <button
          type="button"
          title="Align Left"
          onClick={() => execCommand('justifyLeft')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Align Center"
          onClick={() => execCommand('justifyCenter')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Align Right"
          onClick={() => execCommand('justifyRight')}
          className="p-2 rounded-md text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-[#E8E0DF] mx-1" aria-hidden="true" />

        <button
          type="button"
          title="Insert Link"
          onClick={openLinkDialog}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Link</span>
        </button>
        <button
          type="button"
          title="Insert Image"
          onClick={openImageDialog}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Image</span>
        </button>
        <button
          type="button"
          title="Clear Formatting"
          onClick={() => execCommand('removeFormat')}
          className="p-2 rounded-md text-[#5C5355] hover:bg-[#F7EAEB] hover:text-[#1F1B1C] cursor-pointer"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>

      {/* Document Editing Canvas */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={handlePaste}
        aria-label="Article content editor"
        className="editor-surface min-h-[380px] max-h-[650px] overflow-y-auto px-6 py-6 text-base text-[#1F1B1C]"
      />

      {/* Footer Metrics */}
      <div className="px-4 py-2.5 bg-[#FCF9F6] border-t border-[#E8E0DF] flex items-center justify-between text-xs text-[#5C5355]">
        <span>Use Heading 2 and Heading 3 to automatically populate the article Table of Contents.</span>
        <span className="font-mono tabular-nums">
          {metrics.words} words · {metrics.minutes} min read
        </span>
      </div>

      {/* Insert Link Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1F1B1C]/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E0DF] rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold text-[#1F1B1C]">Insert Hyperlink</h3>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="p-1.5 rounded-lg text-[#5C5355] hover:bg-[#F6F0EA] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={applyLink} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#1F1B1C] mb-1">
                  Link Text (optional if text selected)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Read more here"
                  className="w-full px-3 py-2 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1F1B1C] mb-1">
                  Destination URL (https:// or http://)
                </label>
                <input
                  type="url"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-[#E8E0DF] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-[#8E3F4F] text-white rounded-lg cursor-pointer"
                >
                  Insert Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Insert Image Modal (Device Upload OR External URL) */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1F1B1C]/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E0DF] rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold text-[#1F1B1C]">Insert Article Image</h3>
              <button
                type="button"
                onClick={() => setImageModalOpen(false)}
                className="p-1.5 rounded-lg text-[#5C5355] hover:bg-[#F6F0EA] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#1F1B1C] mb-1">
                  Descriptive Alt Text (for SEO &amp; Accessibility)
                </label>
                <input
                  type="text"
                  value={imageAltInput}
                  onChange={(e) => setImageAltInput(e.target.value)}
                  placeholder="Describe the image"
                  className="w-full px-3 py-2 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg"
                />
              </div>

              <div className="p-4 bg-[#FCF9F6] border border-dashed border-[#C59B43] rounded-lg text-center">
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#8E3F4F] text-white text-xs font-medium hover:bg-[#75313F] cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{uploadingImage ? 'Optimizing & Uploading...' : 'Upload from Computer / Mobile'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={handleUploadInlineImage}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-[#5C5355] mt-2">
                  Automatically compressed to WebP for fast loading (uses Firebase Storage or compact inline optimization).
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#5C5355]">
                <span className="h-px flex-1 bg-[#E8E0DF]" />
                <span>or paste external image URL</span>
                <span className="h-px flex-1 bg-[#E8E0DF]" />
              </div>

              <form onSubmit={handleInsertUrlImage} className="space-y-3">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3 py-2 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg"
                />
                {imageError && (
                  <p className="text-xs text-[#9E2A3B] bg-[#F7EAEB] px-3 py-2 rounded-lg">
                    {imageError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setImageModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium border border-[#E8E0DF] rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium bg-[#1F1B1C] text-white rounded-lg cursor-pointer"
                  >
                    Insert Image URL
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
