import React, { useState } from 'react';
import { Search, Plus, Phone, Globe, Clock, UserCheck, Calendar, Filter, X } from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface Props {
  leads: Lead[];
  onAddLead: (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'shiftContactOffsetSeconds'>) => void;
  onLogLeadCall: (leadId: number, disposition: string, isTransfer: boolean) => void;
}

const TIMEZONES = [
  { value: 'US/Eastern (EST)', label: 'US/Eastern (EST/EDT)', tz: 'America/New_York' },
  { value: 'US/Central (CST)', label: 'US/Central (CST/CDT)', tz: 'America/Chicago' },
  { value: 'US/Mountain (MST)', label: 'US/Mountain (MST/MDT)', tz: 'America/Denver' },
  { value: 'US/Pacific (PST)', label: 'US/Pacific (PST/PDT)', tz: 'America/Los_Angeles' },
  { value: 'Europe/London (GMT)', label: 'Europe/London (GMT/BST)', tz: 'Europe/London' },
  { value: 'Europe/Berlin (CET)', label: 'Europe/Berlin (CET/CEST)', tz: 'Europe/Berlin' }
];

export const LeadCrmTab: React.FC<Props> = ({ leads, onAddLead, onLogLeadCall }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLeadForDispo, setSelectedLeadForDispo] = useState<Lead | null>(null);

  // New Lead Form State
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    timezone: 'US/Eastern (EST)',
    status: 'New Lead' as LeadStatus,
    nextFollowup: '',
    notes: ''
  });

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.company.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      lead.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onAddLead(formData);
    setIsAddModalOpen(false);
    setFormData({
      name: '',
      company: '',
      phone: '',
      email: '',
      timezone: 'US/Eastern (EST)',
      status: 'New Lead',
      nextFollowup: '',
      notes: ''
    });
  };

  // Helper to get live local time in lead's timezone
  const getLeadLocalTime = (tzLabel: string) => {
    try {
      const match = TIMEZONES.find((t) => t.value === tzLabel);
      const timeZoneName = match ? match.tz : 'America/New_York';
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timeZoneName,
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(new Date());
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Control Bar: Search, Status Filter, and "+ Add Lead" */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl p-3.5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search leads, company, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#181825] border border-[#363a4f] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#181825] border border-[#363a4f] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Statuses ({leads.length})</option>
              <option value="New Lead">New Lead</option>
              <option value="Contacted">Contacted</option>
              <option value="Follow-Up Required">Follow-Up Required</option>
              <option value="Meeting Booked">Meeting Booked</option>
              <option value="Transferred to AE">Transferred to AE</option>
            </select>
          </div>
        </div>

        {/* Add Lead Trigger Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lead & Stamp Timeline</span>
        </button>
      </div>

      {/* 2. Leads Data Table */}
      <div className="bg-[#24273a] border border-[#363a4f] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#181825] border-b border-[#363a4f] text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Lead & Organization</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">Timezone & Local Time</th>
                <th className="py-3 px-4">Pipeline Status</th>
                <th className="py-3 px-4">Shift Timeline Stamp</th>
                <th className="py-3 px-4">Next Follow-Up</th>
                <th className="py-3 px-4 text-center">Disposition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#363a4f]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No leads found matching your search.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const hours = lead.shiftContactOffsetSeconds !== null ? Math.floor(lead.shiftContactOffsetSeconds / 3600) : 0;
                  const mins = lead.shiftContactOffsetSeconds !== null ? Math.floor((lead.shiftContactOffsetSeconds % 3600) / 60) : 0;
                  const offsetStr = lead.shiftContactOffsetSeconds !== null ? `+${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m into Shift` : 'Pre-Shift';

                  return (
                    <tr key={lead.id} className="hover:bg-[#2b2e46] transition-colors group">
                      {/* Name & Company */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100 text-xs">{lead.name}</div>
                        <div className="text-slate-400 text-[11px]">{lead.company}</div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <div className="text-sky-300 font-mono text-[11px] flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{lead.phone}</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">{lead.email}</div>
                      </td>

                      {/* Timezone with Live Local Time */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-300">
                          <Globe className="w-3 h-3 text-indigo-400" />
                          <span>{lead.timezone.split(' ')[0]}</span>
                        </div>
                        <div className="text-emerald-400 font-mono text-[10px] font-semibold">
                          Local: {getLeadLocalTime(lead.timezone)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lead.status === 'Transferred to AE'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : lead.status === 'Meeting Booked'
                              ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                              : lead.status === 'Follow-Up Required'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                              : lead.status === 'Contacted'
                              ? 'bg-sky-950/80 text-sky-300 border border-sky-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      {/* Shift Contact Timeline Stamp */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-emerald-400 font-bold text-[11px] flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{offsetStr}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {lead.shiftContactOffsetSeconds !== null ? 'Logged during active block' : 'Added manually'}
                        </div>
                      </td>

                      {/* Next Followup */}
                      <td className="py-3 px-4">
                        <div className="text-slate-300 text-[11px] flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{lead.nextFollowup || 'Not scheduled'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedLeadForDispo(lead)}
                          className="px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          ⚡ Log Call
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Add Lead Modal Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#24273a] border border-[#363a4f] rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#363a4f] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Log New Lead into CRM</h3>
                <p className="text-xs text-slate-400">
                  Automatically timestamps relative to the active shift dialing block.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Price"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#181825] border border-[#363a4f] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Quantum Dynamics"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-[#181825] border border-[#363a4f] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Direct Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#181825] border border-[#363a4f] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    placeholder="jordan@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#181825] border border-[#363a4f] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full bg-[#181825] border border-[#363a4f] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Next Follow-up
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tomorrow at 2:00 PM"
                    value={formData.nextFollowup}
                    onChange={(e) => setFormData({ ...formData, nextFollowup: e.target.value })}
                    className="w-full bg-[#181825] border border-[#363a4f] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Call Scratchpad / Discovery Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Key prospect pain points, current vendor, team size..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#181825] border border-[#363a4f] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#363a4f]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Lead & Stamp Timeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Single Lead Call Disposition Modal */}
      {selectedLeadForDispo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#24273a] border border-[#363a4f] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#363a4f] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Log Call: {selectedLeadForDispo.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedLeadForDispo.company} • {selectedLeadForDispo.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedLeadForDispo(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase">
                Select Call Outcome:
              </div>

              <button
                onClick={() => {
                  onLogLeadCall(selectedLeadForDispo.id, 'Live Transfer Completed', true);
                  setSelectedLeadForDispo(null);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <span>🔥 Live Transfer Completed (AE Picked Up)</span>
                <span className="text-[10px] bg-emerald-900/90 px-2 py-0.5 rounded">High Value</span>
              </button>

              <button
                onClick={() => {
                  onLogLeadCall(selectedLeadForDispo.id, 'Scheduled Demo', false);
                  setSelectedLeadForDispo(null);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <span>📅 Scheduled Demo with AE</span>
                <span className="text-[10px] bg-purple-900/90 px-2 py-0.5 rounded">Calendar Sent</span>
              </button>

              <button
                onClick={() => {
                  onLogLeadCall(selectedLeadForDispo.id, 'Connected (Pitching)', false);
                  setSelectedLeadForDispo(null);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-sky-950/70 hover:bg-sky-900 border border-sky-500/40 text-sky-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <span>🗣️ Connected & Pitched (Follow Up Needed)</span>
                <span className="text-[10px] bg-sky-900/90 px-2 py-0.5 rounded">Conversational</span>
              </button>

              <button
                onClick={() => {
                  onLogLeadCall(selectedLeadForDispo.id, 'Left Voicemail', false);
                  setSelectedLeadForDispo(null);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-[#181825] hover:bg-[#2b2e46] border border-[#363a4f] text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              >
                <span>📬 Left Voicemail</span>
                <span className="text-[10px] text-slate-500">Cadence Step</span>
              </button>

              <button
                onClick={() => {
                  onLogLeadCall(selectedLeadForDispo.id, 'Gatekeeper Rejection', false);
                  setSelectedLeadForDispo(null);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-[#181825] hover:bg-[#2b2e46] border border-[#363a4f] text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              >
                <span>🛡️ Gatekeeper Block</span>
                <span className="text-[10px] text-slate-500">Assistant</span>
              </button>

              <button
                onClick={() => {
                  onLogLeadCall(selectedLeadForDispo.id, 'Not Interested', false);
                  setSelectedLeadForDispo(null);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-rose-950/40 hover:bg-rose-950 border border-rose-500/30 text-rose-300 font-medium text-xs transition-colors cursor-pointer"
              >
                <span>❌ Not Interested / Unqualified</span>
                <span className="text-[10px] text-rose-500">Archived</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
