import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

export const FileUpload = ({
  onChange,
}: {
  onChange?: (files: File[]) => void;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    onChange && onChange(newFiles);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const { getRootProps, isDragActive } = useDropzone({
  multiple: true,
  noClick: true,
  accept: {
    "application/pdf": [],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [], // .docx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [], // .pptx
    "text/plain": [], // .txt
    "text/markdown": [], // .md
  },
  onDrop: handleFileChange,
  onDropRejected: (error) => {
    console.log(error);
  },
});


    return (
    <div className="w-full" {...getRootProps()}>
      <div className="flex flex-col items-center justify-center">
        <motion.div
          onClick={handleClick}
          whileHover="animate"
          className="relative w-full cursor-pointer rounded-lg border border-dashed border-muted-foreground/40 bg-muted px-4 py-4 hover:shadow-2xl transition-shadow"
        >
          <input
            ref={fileInputRef}
            id="file-upload-handle"
            type="file"
            multiple
            accept=".pdf,.docx,.pptx,.txt,.md"
            onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
            className="hidden"
          />
          <div className="flex items-center justify-center w-full">
            <motion.div
              layoutId="file-upload"
              variants={mainVariant}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className={cn(
                "relative z-40 bg-white dark:bg-neutral-900 flex items-center justify-center h-[4rem] w-[4rem] rounded-md cursor-pointer transition-shadow hover:shadow-2xl",
                "shadow-[0px_10px_50px_rgba(0,0,0,0.1)]"
              )}
              onClick={handleClick}
            >
              {isDragActive ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-neutral-600 flex flex-col items-center"
                >
                  Drop it
                  <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </motion.p>
              ) : (
                <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
              )}
            </motion.div>
            {!files.length && (
                  <motion.div
                variants={secondaryVariant}
                className="absolute opacity-0 border border-dashed border-sky-400 inset-0 z-30 bg-transparent flex items-center justify-center h-[4rem] mt-[1rem] w-full max-w-[4rem] mx-auto rounded-md"
              ></motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
    );
    };

    export function GridPattern() {
    const columns = 41;
    const rows = 11;
    return (
        <div className="flex bg-gray-100 dark:bg-neutral-900 shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px  scale-105">
        {Array.from({ length: rows }).map((_, row) =>
            Array.from({ length: columns }).map((_, col) => {
            const index = row * columns + col;
            return (
                <div
                key={`${col}-${row}`}
                className={`w-10 h-10 flex shrink-0 rounded-[2px] ${
                    index % 2 === 0
                    ? "bg-gray-50 dark:bg-neutral-950"
                    : "bg-gray-50 dark:bg-neutral-950 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
                }`}
                />
            );
            })
        )}
        </div>
    );
}
