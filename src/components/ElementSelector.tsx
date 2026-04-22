"use client";

import { type DomElementSelectorInfo, useDomElementSelector } from "@vybe-adk/dom-element-selector";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";

function getDirectTextContent(element: HTMLElement): string {
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    }
  }
  return text.trim();
}

function useModalPosition(
  elementBounds: DomElementSelectorInfo["boundingBox"],
  modalRef: React.RefObject<HTMLDivElement | null>,
) {
  const [position, setPosition] = useState<{ top: number; left: number; placement: "below" | "above" }>({
    top: 0,
    left: 0,
    placement: "below",
  });

  useEffect(() => {
    if (!elementBounds || !modalRef.current) return;

    const modalRect = modalRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const padding = 12;

    const spaceBelow = viewportHeight - elementBounds.y - elementBounds.height - padding;
    const spaceAbove = elementBounds.y - padding;

    let top: number;
    let placement: "below" | "above";

    if (spaceBelow >= modalRect.height || spaceBelow >= spaceAbove) {
      top = elementBounds.y + elementBounds.height + padding;
      placement = "below";
    } else {
      top = elementBounds.y - modalRect.height - padding;
      placement = "above";
    }

    top = Math.max(padding, Math.min(top, viewportHeight - modalRect.height - padding));

    let left = elementBounds.x;
    left = Math.max(padding, Math.min(left, viewportWidth - modalRect.width - padding));

    setPosition({ top, left, placement });
  }, [elementBounds, modalRef]);

  return position;
}

export function ElementSelector() {
  const [selectedElement, setSelectedElement] = useState<DomElementSelectorInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [changeRequest, setChangeRequest] = useState("");
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isSavingText, setIsSavingText] = useState(false);
  const [canEditText, setCanEditText] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const { startSelection, stopSelection, DomElementSelectorOverlay } = useDomElementSelector({
    onSelect: (info) => {
      setSelectedElement(info);
      setIsModalOpen(true);
      setChangeRequest("");
      setIsEditingText(false);
      setIsSavingText(false);
      setCanEditText(true);
      const text = getDirectTextContent(info.domElement);
      setEditedText(text);
    },
    onCancel: () => {
      // Selection cancelled
    },
    filter: (element) => element.hasAttribute("data-source"),
  });

  const position = useModalPosition(selectedElement?.boundingBox ?? null, modalRef);

  const originalText = useMemo(() => {
    if (!selectedElement) return "";
    return getDirectTextContent(selectedElement.domElement);
  }, [selectedElement]);

  const hasTextChanged = editedText !== originalText;

  useEffect(() => {
    if (isModalOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isEditingText && textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, [isEditingText]);

  const handleClose = () => {
    stopSelection();
    setIsModalOpen(false);
    setSelectedElement(null);
    setChangeRequest("");
    setIsEditingText(false);
    setEditedText("");
  };

  const handleSaveText = useCallback(() => {
    if (selectedElement && hasTextChanged) {
      setIsSavingText(true);
      const source = selectedElement.domElement.getAttribute("data-source")?.replace(/^\/vybe\//, "");
      parent.postMessage(
        {
          action: "replaceText",
          source,
          oldText: originalText,
          newText: editedText,
        },
        process.env.NEXT_PUBLIC_VYBE_BASE_URL,
      );
    }
  }, [selectedElement, originalText, editedText, hasTextChanged]);

  const handleCancelTextEdit = () => {
    setEditedText(originalText);
    setIsEditingText(false);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveText();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelTextEdit();
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== process.env.NEXT_PUBLIC_VYBE_BASE_URL) return;

      if (event.data.action === "showElementSelector") {
        if (!isModalOpen) {
          startSelection();
        } else {
          handleClose();
        }
      }

      if (event.data.action === "replaceTextResult") {
        setIsSavingText(false);
        if (event.data.success) {
          handleClose();
          setIsEditingText(false);
        } else {
          setCanEditText(false);
          setIsEditingText(false);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isModalOpen]);

  const handleSubmit = useCallback(() => {
    if (selectedElement && changeRequest.trim()) {
      const source = selectedElement.domElement.getAttribute("data-source").replace(/^\/vybe\//, "");
      const message = `[${source}] ${changeRequest.trim()}`;
      parent.postMessage({ action: "sendMessage", message }, process.env.NEXT_PUBLIC_VYBE_BASE_URL);
      handleClose();
    }
  }, [selectedElement, changeRequest]);

  const handleGoToCode = useCallback(() => {
    if (selectedElement) {
      const source = selectedElement.domElement.getAttribute("data-source").replace(/^\/vybe\//, "");
      parent.postMessage({ action: "goToCode", message: source }, process.env.NEXT_PUBLIC_VYBE_BASE_URL);
      handleClose();
    }
  }, [selectedElement]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    },
    [handleSubmit],
  );

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <>
      <DomElementSelectorOverlay />

      {/* Highlight overlay for selected element */}
      {isModalOpen && selectedElement && (
        <div
          className="fixed pointer-events-none z-[1000]"
          style={{
            top: selectedElement.boundingBox.y,
            left: selectedElement.boundingBox.x,
            width: selectedElement.boundingBox.width,
            height: selectedElement.boundingBox.height,
            border: "2px solid hsl(var(--primary))",
            borderRadius: "4px",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
          }}
        />
      )}

      {/* Modal */}
      {isModalOpen && selectedElement && (
        <div className="fixed inset-0 z-[999999]" onClick={handleClose}>
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="fixed w-[350px] bg-background border border-border rounded-xl shadow-2xl p-4"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {/* Editable text section */}
            {originalText && canEditText && (
              <div className="mb-3 pb-3 border-b border-border">
                <div className="text-xs text-muted-foreground mb-1.5">Text content</div>
                {isSavingText ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </div>
                ) : isEditingText ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={textInputRef}
                      type="text"
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      onKeyDown={handleTextKeyDown}
                      className="flex-1 bg-muted border border-primary rounded px-2 py-1 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveText}
                      disabled={!hasTextChanged}
                      className="p-1 text-green-600 hover:bg-green-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelTextEdit}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingText(true)}
                    className="group flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors w-full text-left"
                  >
                    <span className="truncate">{originalText}</span>
                    <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                )}
              </div>
            )}

            {/* Change request textarea */}
            <textarea
              ref={textareaRef}
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your change..."
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary"
              rows={2}
            />
            <div className="flex justify-between items-center mt-3">
              <Button variant="ghost" onClick={handleGoToCode}>
                Go to code
              </Button>
              <Button onClick={handleSubmit} disabled={!changeRequest.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ElementSelector;
