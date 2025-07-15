"use client";

import { useEffect, useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getOrCreateChat, uploadFile } from "@/hooks/useChat";
import { useChatContext } from "@/hooks/useChatContext";

export default function UploadedFilesSidebar() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const USER_ID = process.env.NEXT_PUBLIC_USER_ID || "fallback_u";
  const { chatId, setConversationIds } = useChatContext();

  // Append new files to the existing list
  const handleFileChange = (files: File[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const handleProcessFiles = async () => {
    if (!chatId || uploadedFiles.length === 0) return;
    setIsProcessing(true);
    const newConversationIds: string[] = [];
    try {
      for (const file of uploadedFiles) {
        console.log("Uploading:", file.name);
        try {
          const res = await uploadFile(file, USER_ID, chatId);
          if (res.conversation_id) newConversationIds.push(res.conversation_id);
          console.log("✅ Uploaded:", res);
        } catch (err) {
          console.error("❌ Upload failed for", file.name, err);
        }
      }
      setConversationIds(newConversationIds);
      setUploadedFiles([]); // Clear after processing
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-72 border-l border-border bg-secondary p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Upload Files</h2>

      <div className="flex-1 overflow-y-auto">
        {uploadedFiles.length > 0 &&
          uploadedFiles.map((file, idx) => (
            <motion.div
              key={"file" + idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="relative overflow-hidden z-40 bg-white dark:bg-neutral-900 flex flex-col items-start justify-start md:h-24 p-4 mt-4 w-full mx-auto rounded-md shadow-sm"
            >
              <div className="flex justify-between w-full items-center gap-4">
                <p className="text-base text-neutral-700 dark:text-neutral-300 truncate max-w-xs">
                  {file.name}
                </p>
                <p className="rounded-lg px-2 py-1 w-fit shrink-0 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-white shadow-input">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <div className="flex text-sm md:flex-row flex-col items-start md:items-center w-full mt-2 justify-between text-neutral-600 dark:text-neutral-400">
                <p className="px-1 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 ">
                  {(() => {
                    if (file.type === "application/pdf") return "PDF";
                    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                      return "Word";
                    if (file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation")
                      return "PowerPoint";
                    if (file.type === "text/plain") return "Text";
                    if (file.type === "text/markdown") return "Markdown";
                    return "Other";
                  })()}
                </p>
                <p>modified {new Date(file.lastModified).toLocaleDateString()}</p>
              </div>
            </motion.div>
          ))}

        {uploadedFiles.length > 0 && (
          <Button
            className="mt-4 w-full bg-accent-foreground  text-background font-semibold py-2 px-4 rounded shadow"
            onClick={handleProcessFiles}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Process Files"}
          </Button>
        )}
      </div>

      <div className="mt-auto">
        <FileUpload onChange={handleFileChange} />
      </div>
    </div>
  );
}
