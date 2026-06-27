'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';

interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  received_at: string;
}

interface EmailBox {
  id: string;
  address: string;
  created_at: string;
  expires_at: string;
  messages: EmailMessage[];
}

export default function Home() {
  const [emailBox, setEmailBox] = useState<EmailBox | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const createEmail = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/email', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setEmailBox(data.data);
      }
    } catch (err) {
      console.error('Failed to create email');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (emailBox?.address) {
      navigator.clipboard.writeText(emailBox.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const refreshInbox = async () => {
    if (!emailBox) return;
    try {
      const res = await fetch(`/api/email/${emailBox.id}`);
      const data = await res.json();
      if (data.success) {
        setEmailBox(data.data);
      }
    } catch (err) {
      console.error('Failed to refresh');
    }
  };

  useEffect(() => {
    if (emailBox) {
      const interval = setInterval(refreshInbox, 5000);
      return () => clearInterval(interval);
    }
  }, [emailBox]);

  return (
    <>
      <Head>
        <title>TempMail - Temporary Email</title>
        <meta name="description" content="One-click temporary email" />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-gray-900">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 to-teal-500 bg-clip-text text-transparent">
                TempMail
              </h1>
              <p className="text-gray-400 text-xl">
                Disposable temporary email address
              </p>
            </div>

            {!emailBox ? (
              <div className="text-center">
                <button
                  onClick={createEmail}
                  disabled={loading}
                  className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-lg font-semibold rounded-xl transition-colors"
                >
                  {loading ? 'Creating...' : 'Generate Temp Email'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Email Address Box */}
                <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-gray-400 text-sm block mb-2">
                        Your temporary email address
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={emailBox.address}
                          className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-lg"
                        />
                        <button
                          onClick={copyAddress}
                          className="px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                        >
                          {copied ? '✓ Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={refreshInbox}
                          className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                          🔄 Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-4 text-sm text-gray-400">
                    <span>Created: {new Date(emailBox.created_at).toLocaleString()}</span>
                    <span>Expires: {new Date(emailBox.expires_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Inbox */}
                <div className="bg-gray-800/50 backdrop-blur rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <h2 className="text-white font-semibold">
                      Inbox ({emailBox.messages.length} messages)
                    </h2>
                  </div>
                  
                  {emailBox.messages.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <div className="text-4xl mb-4">📭</div>
                      <p>No messages yet. Waiting for emails...</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-700">
                      {emailBox.messages.map((msg) => (
                        <button
                          key={msg.id}
                          onClick={() => setSelectedMessage(msg)}
                          className="w-full p-4 text-left hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">{msg.from}</p>
                              <p className="text-gray-400 text-sm">{msg.subject}</p>
                            </div>
                            <span className="text-gray-500 text-xs">
                              {new Date(msg.received_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Preview */}
                {selectedMessage && (
                  <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl text-white font-semibold">
                          {selectedMessage.subject}
                        </h3>
                        <p className="text-gray-400">From: {selectedMessage.from}</p>
                      </div>
                      <button
                        onClick={() => setSelectedMessage(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 text-gray-300 whitespace-pre-wrap">
                      {selectedMessage.body}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
