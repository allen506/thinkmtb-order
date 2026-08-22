"use client";

import { useState, useEffect } from "react";

interface AdminEmail {
  id: number;
  email: string;
}

export default function EmailNotificationSettings() {
  const [smtpSettings, setSmtpSettings] = useState({
    host: "",
    port: 587,
    secure: false,
    username: "",
    from_email: "",
  });
  const [smtpPassword, setSmtpPassword] = useState("");
  const [adminEmails, setAdminEmails] = useState<AdminEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    fetchSettings();
    fetchAdminEmails();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/smtp-settings");
      const data = await res.json();
      setSmtpSettings(data);
    } catch (error) {
      console.error("Error fetching SMTP settings:", error);
    }
  };

  const fetchAdminEmails = async () => {
    try {
      const res = await fetch("/api/admin/admin-emails");
      const data = await res.json();
      setAdminEmails(data.emails || []);
    } catch (error) {
      console.error("Error fetching admin emails:", error);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/smtp-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...smtpSettings,
          password: smtpPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsError(false);
        setMessage("SMTP settings saved successfully!");
        setSmtpPassword("");
      } else {
        setIsError(true);
        setMessage(data.error || "Failed to save settings");
      }
    } catch (error) {
      setIsError(true);
      setMessage("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingEmail(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/admin-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsError(false);
        setMessage("Email added successfully!");
        setNewEmail("");
        setAdminEmails([...adminEmails, { id: data.id, email: newEmail }]);
      } else {
        setIsError(true);
        setMessage(data.error || "Failed to add email");
      }
    } catch (error) {
      setIsError(true);
      setMessage("Error adding email");
    } finally {
      setAddingEmail(false);
    }
  };

  const handleDeleteEmail = async (id: number, email: string) => {
    if (!confirm(`Remove ${email} from admin notifications?`)) return;

    try {
      const res = await fetch(`/api/admin/admin-emails/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAdminEmails(adminEmails.filter(e => e.id !== id));
        setMessage("Email removed successfully!");
        setIsError(false);
      } else {
        setIsError(true);
        setMessage("Failed to remove email");
      }
    } catch (error) {
      setIsError(true);
      setMessage("Error removing email");
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) {
      setMessage("Please enter a test email address");
      setIsError(true);
      return;
    }

    setTesting(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsError(false);
        setMessage("✓ Test email sent successfully! Check your inbox.");
        setTestEmail("");
      } else {
        setIsError(true);
        setMessage(data.error || "Failed to send test email");
      }
    } catch (error) {
      setIsError(true);
      setMessage("Error sending test email");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SMTP Configuration */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notification Settings</h3>
        
        <form onSubmit={handleSaveSmtp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">SMTP Host (e.g., smtp.gmail.com)</label>
            <input
              type="text"
              value={smtpSettings.host}
              onChange={e => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
              placeholder="smtp.gmail.com"
              className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">For Gmail: smtp.gmail.com</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Port (e.g., 587 or 465)</label>
              <input
                type="number"
                value={smtpSettings.port}
                onChange={e => setSmtpSettings({ ...smtpSettings, port: parseInt(e.target.value) })}
                className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 text-base leading-tight focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Security</label>
              <select
                value={smtpSettings.secure ? "465" : "587"}
                onChange={e => setSmtpSettings({ ...smtpSettings, secure: e.target.value === "465" })}
                className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 text-base leading-tight focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="587">TLS (587)</option>
                <option value="465">SSL (465)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">SMTP Username (Your Email)</label>
            <input
              type="email"
              value={smtpSettings.username}
              onChange={e => setSmtpSettings({ ...smtpSettings, username: e.target.value })}
              placeholder="your-email@gmail.com"
              className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">For Gmail: your full email address. For Gmail, you may need an app-specific password.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">SMTP Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={smtpPassword}
                onChange={e => setSmtpPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-3 py-2.5 pr-12 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 text-base leading-tight focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-xs sm:text-sm text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded transition-colors"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter your app-specific password (not your regular Gmail password)</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Email Address</label>
            <input
              type="email"
              value={smtpSettings.from_email}
              onChange={e => setSmtpSettings({ ...smtpSettings, from_email: e.target.value })}
              placeholder="notifications@thinkmtb.com"
              className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">The email address that notifications will be sent from</p>
          </div>

          {message && (
            <p className={`text-xs p-2 rounded ${isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving…" : "Save SMTP Settings"}
          </button>
        </form>

        {/* Test SMTP */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Test SMTP Configuration</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Send test email to:</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="flex-1 px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testing || !testEmail}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {testing ? "Testing…" : "Send Test"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Send a test email to verify your SMTP configuration is working before enabling payment notifications.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Emails */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Email Notifications</h3>

        <form onSubmit={handleAddEmail} className="space-y-4 mb-6">
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="admin@example.com"
              className="flex-1 px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={addingEmail || !newEmail}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {addingEmail ? "Adding…" : "Add Email"}
            </button>
          </div>
        </form>

        {adminEmails.length === 0 ? (
          <p className="text-gray-400 text-sm">No admin emails configured yet. Add one above to receive payment notifications.</p>
        ) : (
          <div className="space-y-2">
            {adminEmails.map(email => (
              <div key={email.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{email.email}</p>
                </div>
                <button
                  onClick={() => handleDeleteEmail(email.id, email.email)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
          <p className="font-semibold mb-1">✓ Payment notifications will be sent to all configured emails when:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>A user submits a payment</li>
            <li>Includes order details, items, and payment method</li>
            <li>Status shows as "Pending Review"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
