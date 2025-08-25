import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import { UploadIcon, ArrowDownTrayIcon } from '../Icons';

// Set up the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.min.mjs`;

interface ConvertedPage {
    pageNumber: number;
    dataUrl: string;
}

const qualityScales = {
    high: 4.0, // Best for print, high-res displays
    medium: 2.5, // Good balance for most screens
    low: 1.5, // Faster, smaller files
};

const AdminPdfConverter: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState('');
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [convertedPages, setConvertedPages] = useState<ConvertedPage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            const uploadedFile = files[0];
            if (uploadedFile.type === 'application/pdf') {
                setFile(uploadedFile);
                setError(null);
                setConvertedPages([]);
                setProgress('');
                setProgressPercentage(0);
            } else {
                setError('Please upload a valid .pdf file.');
            }
        }
    };

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, type: 'enter' | 'leave' | 'over') => {
        e.preventDefault();
        e.stopPropagation();
        if (type === 'enter' || type === 'over') setIsDragging(true);
        else if (type === 'leave') setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files);
        }
    };

    const processPdf = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setConvertedPages([]);
        setProgress('Starting conversion...');
        setProgressPercentage(0);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdf.numPages;
            const newPages: ConvertedPage[] = [];
            const scale = qualityScales[quality];

            for (let i = 1; i <= numPages; i++) {
                setProgress(`Processing page ${i} of ${numPages}...`);
                setProgressPercentage(Math.round((i / numPages) * 100));
                
                await new Promise(resolve => setTimeout(resolve, 10)); // Yield to main thread
                
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { alpha: false });
                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                context.imageSmoothingEnabled = false;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    background: 'rgba(255, 255, 255, 1)',
                } as any).promise;

                newPages.push({
                    pageNumber: i,
                    dataUrl: canvas.toDataURL('image/png')
                });
                setConvertedPages([...newPages]);
            }
            setProgress(`Conversion complete! ${numPages} pages processed.`);
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Could not process PDF.";
            setError(`Error: ${errorMessage}`);
            setProgress('');
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadZip = async () => {
        if (convertedPages.length === 0) return;

        const zip = new JSZip();
        for (const page of convertedPages) {
            const base64Data = page.dataUrl.split(',')[1];
            zip.file(`page_${String(page.pageNumber).padStart(3, '0')}.png`, base64Data, { base64: true });
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        const safeFileName = file?.name.replace(/\.pdf$/i, '').replace(/[^a-z0-9]/gi, '_') || 'converted_pages';
        link.download = `${safeFileName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    return (
        <div className="space-y-6">
            <div className="bg-gray-100 dark:bg-gray-900/50 border-l-4 border-gray-500 dark:border-gray-600 text-gray-800 dark:text-gray-200 p-4 rounded-r-lg">
                <p className="font-bold">PDF to Image Converter</p>
                <p className="text-sm mt-1">Upload a PDF to convert each page into a high-quality PNG image. You can then download all images as a zip file.</p>
            </div>
            
            <div 
                className={`p-6 border-2 border-dashed rounded-2xl text-center transition-colors ${isDragging ? 'border-gray-500 dark:border-gray-400 bg-gray-200 dark:bg-gray-700/50' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'}`}
                onDragEnter={(e) => handleDragEvents(e, 'enter')}
                onDragLeave={(e) => handleDragEvents(e, 'leave')}
                onDragOver={(e) => handleDragEvents(e, 'over')}
                onDrop={handleDrop}
            >
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                <label htmlFor="pdf-upload" className="mt-2 block text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white cursor-pointer">
                    {file ? 'Change PDF file' : 'Upload a PDF file'}
                    <input ref={fileInputRef} id="pdf-upload" name="pdf-upload" type="file" className="sr-only" accept="application/pdf" onChange={(e) => handleFileChange(e.target.files)} />
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">{file ? file.name : 'or drag and drop'}</p>
            </div>

            <div className="bg-white dark:bg-gray-800/50 p-4 rounded-2xl shadow-lg border dark:border-gray-700/50">
                <fieldset>
                    <legend className="text-sm font-semibold text-gray-800 dark:text-gray-100">Conversion Quality</legend>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Higher quality results in larger images and longer processing time.</p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                        {(['low', 'medium', 'high'] as const).map(q => (
                             <div key={q}>
                                <input type="radio" name="quality" value={q} id={q} checked={quality === q} onChange={() => setQuality(q)} className="sr-only peer" disabled={isProcessing}/>
                                <label htmlFor={q} className="flex flex-col items-center justify-between rounded-lg border-2 p-3 text-gray-500 dark:text-gray-400 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-50 border-gray-200 dark:border-gray-700 peer-checked:border-indigo-600 peer-checked:text-indigo-600 dark:peer-checked:text-indigo-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">                           
                                    <span className="text-sm font-medium capitalize">{q}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </fieldset>
            </div>

            <button
                onClick={processPdf}
                disabled={!file || isProcessing}
                className="btn btn-primary w-full"
            >
                {isProcessing ? 'Processing...' : 'Convert to Images'}
            </button>

             {isProcessing && (
                <div className="space-y-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, transition: 'width 0.3s ease-in-out' }}></div>
                    </div>
                    <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-300">{progress}</p>
                </div>
            )}
             {error && <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
             {!isProcessing && progress && !error && <p className="text-center text-sm font-medium text-green-600 dark:text-green-400">{progress}</p>}

            {convertedPages.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Conversion Results</h3>
                        <button onClick={downloadZip} className="btn btn-primary bg-green-600 hover:bg-green-700">
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Download All as .zip
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 bg-gray-100 dark:bg-gray-900/30 rounded-lg max-h-[500px] overflow-y-auto">
                        {convertedPages.map(page => (
                            <div key={page.pageNumber} className="relative aspect-[8.5/11] bg-white dark:bg-gray-800 rounded-md shadow-md overflow-hidden">
                                <img src={page.dataUrl} alt={`Page ${page.pageNumber}`} className="w-full h-full object-contain" />
                                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-xs font-mono px-1.5 py-0.5 rounded-tl-md">
                                    {page.pageNumber}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPdfConverter;