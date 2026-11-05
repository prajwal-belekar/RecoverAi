"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { apiUpload } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface KnowledgeDocument {
  id: number;
  title: string;
  source_type: string;
  created_at: string;
  chunk_count: number;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "processing" | "completed" | "error";
  error?: string;
}

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; title: string } | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<KnowledgeDocument[]>("/knowledge");
      setDocuments(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load documents", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFileUpload = useCallback(async (files: File[]) => {
    for (const file of files) {
      const uploadId = `${file.name}-${Date.now()}`;
      const progress: UploadProgress = {
        file,
        progress: 0,
        status: "pending",
      };
      setUploadProgress((prev) => [...prev, progress]);

      try {
        // Update status to uploading
        setUploadProgress((prev) =>
          prev.map((p) => (p.file.name === file.name && p.status === "pending" ? { ...p, status: "uploading", progress: 10 } : p))
        );

        const formData = new FormData();
        formData.append("file", file);

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) =>
            prev.map((p) =>
              p.file.name === file.name && p.status === "uploading" && p.progress < 90
                ? { ...p, progress: p.progress + 10 }
                : p
            )
          );
        }, 200);

        const data = await apiUpload<KnowledgeDocument>("/knowledge/upload", formData);
        
        clearInterval(progressInterval);

        // Update progress to completed
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.file.name === file.name
              ? { ...p, progress: 100, status: "completed" }
              : p
          )
        );

        toast({ title: "Success", description: `${file.name} uploaded successfully`, variant: "success" });
        loadDocuments();
      } catch (error) {
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.file.name === file.name
              ? { ...p, status: "error", error: error instanceof Error ? error.message : "Upload failed" }
              : p
          )
        );
        toast({ title: "Error", description: `Failed to upload ${file.name}`, variant: "danger" });
      }
    }
  }, [toast, loadDocuments]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(Array.from(e.target.files));
    }
  };

  const handleDelete = (id: number, title: string) => {
    setDeleteConfirm({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/knowledge/${deleteConfirm.id}`);
      toast({ title: "Deleted", description: `${deleteConfirm.title} has been removed`, variant: "success" });
      loadDocuments();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete document", variant: "danger" });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const clearCompletedUploads = () => {
    setUploadProgress((prev) => prev.filter((p) => p.status !== "completed"));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Upload documentation, FAQs, and procedures to ground AI responses in real company data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(true)}
              disabled={isUploading}
            >
              Select Files
            </Button>
            <Button onClick={() => setShowUploadModal(true)} disabled={isUploading}>
              Upload Document
            </Button>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadProgress.length > 0 && (
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upload Progress</CardTitle>
                {uploadProgress.some((p) => p.status === "completed") && (
                  <Button variant="ghost" size="sm" onClick={clearCompletedUploads}>
                    Clear Completed
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadProgress.map((progress) => (
                  <div key={`${progress.file.name}-${progress.file.size}`} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-xs">{progress.file.name}</span>
                      <span className="text-muted-foreground">
                        {progress.status === "uploading" && `${progress.progress}%`}
                        {progress.status === "completed" && "Completed"}
                        {progress.status === "error" && "Failed"}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          progress.status === "uploading" && "bg-primary",
                          progress.status === "completed" && "bg-success",
                          progress.status === "error" && "bg-danger"
                        )}
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                    {progress.error && (
                      <p className="text-xs text-danger">{progress.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Drag & Drop Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            "border-border bg-card hover:border-primary/50"
          )}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".pdf,.txt,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <svg className="mx-auto h-12 w-12 text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium text-foreground mb-1">
              Drop PDF, TXT, or DOCX files here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Files are chunked and converted to embeddings automatically
            </p>
          </label>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documents</CardTitle>
              {loading && <Skeleton className="h-6 w-20" />}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                </svg>
                <h3 className="text-lg font-semibold text-foreground mb-2">No documents yet</h3>
                <p className="text-muted-foreground">Upload your first document to get started</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">Document Title</th>
                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">Source Type</th>
                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">Chunks Indexed</th>
                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">Created Date</th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 font-medium text-foreground">{doc.title}</td>
                        <td className="px-6 py-4 text-muted-foreground">{doc.source_type}</td>
                        <td className="px-6 py-4 text-muted-foreground">{doc.chunk_count} chunks</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger hover:bg-danger/10"
                            onClick={() => handleDelete(doc.id, doc.title)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}