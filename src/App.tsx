/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';

export default function App() {
  const [status, setStatus] = useState<string>('');
  const [pesanan, setPesanan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [logs, setLogs] = useState<{ time: string; msg: string; color?: string }[]>([
    { time: new Date().toLocaleTimeString('en-GB'), msg: 'System boot successful.' },
    { time: new Date().toLocaleTimeString('en-GB'), msg: 'AI AGENT: Ready.' },
  ]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [progress, setProgress] = useState(0);

  const addLog = (msg: string, color?: string) => {
    setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString('en-GB'), msg, color }]);
  };

  const handleSubmit = async () => {
    if (!pesanan && (!fileInputRef.current?.files || fileInputRef.current.files.length === 0)) {
       addLog('Error: Nothing to send. Add notes or a file.', 'text-red-600');
       return;
    }

    setIsSubmitting(true);
    setProgress(10);
    setStatus('Processing... Please wait.');
    addLog('AI Processing: Requesting summary...', 'text-blue-600');

    const formData = new FormData();
    formData.append('pesanan', pesanan);

    if (fileInputRef.current?.files && fileInputRef.current.files.length > 0) {
      formData.append('fail', fileInputRef.current.files[0]);
    }
    
    // Fake progress increment while waiting
    const progressInterval = setInterval(() => {
      setProgress(p => p < 45 ? p + 5 : p);
    }, 500);

    try {
      const processResponse = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      const processResult = await processResponse.json();
      clearInterval(progressInterval);
      setProgress(50);

      if (processResponse.ok && processResult.status === 'success') {
        setStatus('Processing complete.');
        addLog('AI Summary generated & saved successfully!', 'text-green-600');
        setAiSummary(processResult.summary || 'Summary completed.');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(70);
        addLog('Syncing with Google Sheets & Telegram...', 'text-blue-600');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(100);

        setStatus(processResult.message || 'Success! Data processed and sent.');
        addLog('Success: Sent to Telegram via Apps Script.', 'text-green-600');
        setPesanan('');
        if (fileInputRef.current) {
            const textInput = fileInputRef.current.parentElement?.querySelector('input[type="text"]');
            if (textInput) (textInput as HTMLInputElement).value = "";
            fileInputRef.current.value = '';
        }
      } else {
        setStatus(`Error: ${processResult.message}`);
        addLog(`Error: ${processResult.message}`, 'text-red-600');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setStatus(`System Error: ${error.message}`);
      addLog(`System Error: ${error.message}`, 'text-red-700');
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
        setProgress(0);
        addLog('Idle: Waiting for input...');
      }, 1000);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-[#c0c0c0] text-[#000000] font-['MS_Sans_Serif',Arial,sans-serif] select-none p-2 flex flex-col overflow-hidden" 
      style={{ border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' }}
    >
      <div className="flex items-center justify-between px-1 mb-1 text-xs border-b border-[#808080] pb-1 font-sans">
        <div className="flex space-x-3">
          <span className="hover:bg-[#000080] hover:text-white px-2 cursor-pointer">File</span>
          <span className="hover:bg-[#000080] hover:text-white px-2 cursor-pointer">Edit</span>
          <span className="hover:bg-[#000080] hover:text-white px-2 cursor-pointer">AI-Tools</span>
          <span className="hover:bg-[#000080] hover:text-white px-2 cursor-pointer">Help</span>
        </div>
        <div className="flex space-x-2 text-[10px] items-center pr-2">
          <span className="text-[#808080]">API Status:</span>
          <span className="text-[#008000] font-bold">CONNECTED</span>
        </div>
      </div>

      <div className="flex-1 flex gap-2 overflow-hidden">
        {/* Left Form Column */}
        <div className="w-2/3 flex flex-col h-full">
          <div className="flex-1 bg-[#c0c0c0] p-1 flex flex-col" style={{ border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff', boxShadow: '1px 1px 0px black' }}>
            <div className="bg-[#000080] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
              <span>Leader Sales Report v1.0.4 - AI Bridge</span>
              <div className="flex space-x-1">
                <div className="w-4 h-4 bg-[#c0c0c0] border border-[#ffffff] shadow-[1px_1px_0px_black] text-black flex items-center justify-center text-[10px] cursor-pointer">_</div>
                <div className="w-4 h-4 bg-[#c0c0c0] border border-[#ffffff] shadow-[1px_1px_0px_black] text-black flex items-center justify-center text-[10px] cursor-pointer">X</div>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col space-y-4">
              <div className="space-y-1">
                <label className="text-xs block">Reporter Name:</label>
                <input type="text" defaultValue="Sir Zulatika" className="w-full text-xs p-1 bg-white outline-none" style={{ border: '2px inset #ffffff' }} />
              </div>

              <div className="flex-1 space-y-1 flex flex-col">
                <label className="text-xs block">Nota/Laporan Ringkas:</label>
                <textarea 
                  value={pesanan}
                  onChange={(e) => setPesanan(e.target.value)}
                  className="w-full flex-1 p-2 text-xs font-mono bg-white outline-none resize-none leading-tight" 
                  style={{ border: '2px inset #ffffff' }} 
                  placeholder="Masukkan laporan jualan harian di sini..."
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="text-xs block">Lampiran (Excel/Doc/TXT):</label>
                <div className="flex relative">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv, .docx, .txt"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    onChange={(e) => {
                      // Trigger a small re-render to update the display
                      if (e.target.files && e.target.files.length > 0) {
                        const fakeInput = e.target.parentElement?.querySelector('input[type="text"]');
                        if (fakeInput) {
                          (fakeInput as HTMLInputElement).value = e.target.files[0].name;
                        }
                      }
                    }}
                  />
                  {/* Fake input layer for look */}
                  <div className="flex w-full pointer-events-none">
                    <input 
                      type="text" 
                      placeholder="Sila muat naik fail Excel atau Doc di sini..." 
                      className="flex-1 text-xs p-1 bg-[#e0e0e0] text-black outline-none placeholder-gray-600" 
                      style={{ border: '2px inset #ffffff' }} 
                      readOnly 
                    />
                    <button type="button" className="ml-1 px-4 py-1 text-xs bg-[#c0c0c0] border-2 shadow-[1px_1px_0px_black] pointer-events-auto cursor-pointer" style={{ borderColor: '#ffffff #808080 #808080 #ffffff' }}>Buka Fail...</button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end pt-2">
                <div className="flex flex-col">
                  <div className="text-[10px] text-blue-800 italic">
                    * AI AGENT ready to summarize...
                  </div>
                </div>
                
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-sm font-bold bg-[#c0c0c0] border-2 shadow-[1px_1px_0px_black] hover:bg-[#d0d0d0] active:shadow-none cursor-pointer disabled:opacity-50" 
                  style={{ borderColor: '#ffffff #808080 #808080 #ffffff' }}
                >
                  SEND TO SIR ZULATIKA
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Log/Preview Column */}
        <div className="w-1/3 flex flex-col gap-2 h-full overflow-hidden">
          <div className="h-1/2 flex flex-col" style={{ border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080', background: '#ffffff' }}>
            <div className="bg-[#808080] text-white px-2 py-1 text-[10px] uppercase font-bold">System Activity Logs</div>
            <div className="p-2 text-[10px] font-mono overflow-y-auto space-y-1 h-full">
              {logs.map((log, i) => (
                <p key={i} className={log.color || 'text-black'}>
                  [{log.time}] {log.msg}
                </p>
              ))}
            </div>
          </div>

          <div className="h-1/2 flex flex-col" style={{ border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080', background: '#c0c0c0' }}>
            <div className="bg-[#000080] text-white px-2 py-1 text-[10px] uppercase font-bold">AI Analysis Preview</div>
            <div className="p-2 text-[11px] leading-relaxed h-full overflow-hidden flex flex-col">
              <div className="bg-white p-2 flex-1 overflow-y-auto" style={{ border: '2px inset #ffffff' }}>
                {aiSummary ? (
                  <div className="whitespace-pre-wrap font-mono text-[10px]">{aiSummary}</div>
                ) : (
                  <div className="text-gray-500 italic">Waiting for analysis...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Retro Processing Modal */}
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none text-[#000000]">
          {/* A fake backdrop to subtly indicate unresponsiveness without darkening, or slightly darkening */}
          <div className="absolute inset-0 bg-black opacity-10 pointer-events-auto"></div>
          
          <div className="bg-[#c0c0c0] p-1 flex flex-col w-80 pointer-events-auto shadow-[2px_2px_0px_black]" style={{ border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' }}>
            <div className="bg-[#000080] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
              <span>System Activity</span>
            </div>
            <div className="p-5 flex flex-col items-center">
               <p className="text-xs mb-4 text-center font-bold">Processing AI Summary & Telegram Sync...</p>
               <div className="w-full text-left text-[10px] mb-1">{progress}% Complete</div>
               <div className="w-full h-5 relative bg-white" style={{ border: '2px inset #808080' }}>
                  <div className="h-full bg-[#000080]" style={{ width: `${progress}%` }}></div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Level Status Bar */}
      <div className="mt-1 h-6 bg-[#c0c0c0] flex items-center px-2 text-[10px] border-t border-[#ffffff] shadow-[inset_1px_1px_0px_#808080]" style={{ border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080' }}>
        <div className="flex-1">{isSubmitting ? 'Sending Request...' : 'Ready'}</div>
        <div className="w-32 border-l border-[#808080] pl-2">MEM: 42.1 MB</div>
        <div className="w-32 border-l border-[#808080] pl-2">CPU: 2%</div>
        <div className="w-32 border-l border-[#808080] pl-2">{currentTime}</div>
      </div>
    </div>
  );
}
