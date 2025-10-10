import React from 'react';
import { useDropzone } from 'react-dropzone';

interface MediaDropzoneProps {
  onFilesSelected: (files: File[]) => void;
}

export const MediaDropzone: React.FC<MediaDropzoneProps> = ({ onFilesSelected }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': [],
      'video/*': []
    },
    onDrop: acceptedFiles => {
        console.log('Dropped files:', acceptedFiles);
      onFilesSelected(acceptedFiles);
    },
    multiple: true
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition 
        ${isDragActive ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'}
      `}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-yellow-500">Drop the files here...</p>
      ) : (
        <p className="text-gray-500">Drag & drop images/videos here, or click to select</p>
      )}
    </div>
  );
};