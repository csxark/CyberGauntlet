import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { TerminalBox } from './TerminalBox';

interface Event {
  id: string;
  event_name: string;
  start_date: string;
  end_date: string;
  active_challenges: string[];
  created_at: string;
}

interface Challenge {
  id: string;
  title: string;
  category: string;
  difficulty: string;
}

const SAMPLE_CHALLENGES: Challenge[] = [
  { id: 'q1', title: 'The Cryptographer\'s Dilemma', category: 'Cryptography', difficulty: 'Intermediate' },
  { id: 'q2', title: 'Pair Sum Optimization', category: 'Programming', difficulty: 'Beginner' },
  { id: 'q3', title: 'The Security Key Reverser', category: 'Programming', difficulty: 'Intermediate' },
  { id: 'q4', title: 'Invisible Ink Scenario', category: 'Steganography', difficulty: 'Advanced' },
  { id: 'q5', title: 'The Final Register Readout', category: 'Cryptography', difficulty: 'Advanced' }
];

export function EventManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    event_name: '',
    start_date: '',
    end_date: '',
    active_challenges: [] as string[]
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      if (!isSupabaseConfigured) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.event_name || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields');
      return;
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      alert('End date must be after start date');
      return;
    }

    try {
      if (editingEvent) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update({
            event_name: formData.event_name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            active_challenges: formData.active_challenges
          })
          .eq('id', editingEvent.id);

        if (error) throw error;
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert({
            event_name: formData.event_name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            active_challenges: formData.active_challenges
          });

        if (error) throw error;
      }

      await loadEvents();
      resetForm();
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Error saving event. Please try again.');
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      event_name: event.event_name,
      start_date: event.start_date.slice(0, 16), // Remove seconds and timezone
      end_date: event.end_date.slice(0, 16),
      active_challenges: event.active_challenges
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      await loadEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Error deleting event. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      event_name: '',
      start_date: '',
      end_date: '',
      active_challenges: []
    });
    setEditingEvent(null);
    setShowCreateForm(false);
  };

  const toggleChallenge = (challengeId: string) => {
    setFormData(prev => ({
      ...prev,
      active_challenges: prev.active_challenges.includes(challengeId)
        ? prev.active_challenges.filter(id => id !== challengeId)
        : [...prev.active_challenges, challengeId]
    }));
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isEventActive = (event: Event) => {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    return now >= start && now <= end;
  };

  const isEventUpcoming = (event: Event) => {
    const now = new Date();
    const start = new Date(event.start_date);
    return now < start;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Calendar className="w-12 h-12 text-green-500" />
          </div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono p-6">
      <div className="scanlines"></div>
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-green-400">
            <Calendar className="inline w-8 h-8 mr-2" />
            EVENT MANAGER
          </h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded transition-all"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? 'CANCEL' : 'CREATE EVENT'}
          </button>
        </div>

        {showCreateForm && (
          <TerminalBox title={editingEvent ? 'edit_event.sh' : 'create_event.sh'} className="mb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-green-400 mb-2">Event Name *</label>
                <input
                  type="text"
                  value={formData.event_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_name: e.target.value }))}
                  className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-3 text-green-400 placeholder-green-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  placeholder="Enter event name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-green-400 mb-2" htmlFor="start-date">Start Date & Time *</label>
                  <input
                    id="start-date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-3 text-green-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-green-400 mb-2" htmlFor="end-date">End Date & Time *</label>
                  <input
                    id="end-date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-3 text-green-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-green-400 mb-2">Active Challenges</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SAMPLE_CHALLENGES.map((challenge) => (
                    <label
                      key={challenge.id}
                      className="flex items-center gap-3 p-3 bg-black/30 border border-green-500/20 rounded hover:border-green-500/40 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={formData.active_challenges.includes(challenge.id)}
                        onChange={() => toggleChallenge(challenge.id)}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <p className="text-green-400 text-sm font-medium">{challenge.title}</p>
                        <p className="text-green-300/60 text-xs">{challenge.category} • {challenge.difficulty}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-black font-bold py-3 px-6 rounded transition-all"
                >
                  <Save className="w-4 h-4" />
                  {editingEvent ? 'UPDATE EVENT' : 'CREATE EVENT'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded transition-all"
                >
                  <X className="w-4 h-4" />
                  CANCEL
                </button>
              </div>
            </form>
          </TerminalBox>
        )}

        <div className="space-y-6">
          {events.length === 0 ? (
            <TerminalBox title="events.sh">
              <div className="text-center text-green-300/60 py-8">
                No events created yet. Create your first event to get started!
              </div>
            </TerminalBox>
          ) : (
            events.map((event) => (
              <TerminalBox key={event.id} title={`event_${event.id.slice(0, 8)}.sh`}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl text-green-400 font-bold mb-2">{event.event_name}</h3>
                      <div className="flex items-center gap-4 text-sm text-green-300/80">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Start: {formatDateTime(event.start_date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>End: {formatDateTime(event.end_date)}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        {isEventActive(event) && (
                          <span className="inline-block bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">
                            ACTIVE
                          </span>
                        )}
                        {isEventUpcoming(event) && (
                          <span className="inline-block bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-medium">
                            UPCOMING
                          </span>
                        )}
                        {!isEventActive(event) && !isEventUpcoming(event) && (
                          <span className="inline-block bg-gray-500/20 text-gray-400 px-2 py-1 rounded text-xs font-medium">
                            ENDED
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(event)}
                        className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500 text-blue-400 px-3 py-2 rounded transition-all text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500 text-red-400 px-3 py-2 rounded transition-all text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        DELETE
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-green-400 mb-2">Active Challenges ({event.active_challenges.length})</h4>
                    {event.active_challenges.length === 0 ? (
                      <p className="text-green-300/60 text-sm">No challenges selected</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {event.active_challenges.map((challengeId) => {
                          const challenge = SAMPLE_CHALLENGES.find(c => c.id === challengeId);
                          return (
                            <div key={challengeId} className="bg-black/30 border border-green-500/20 rounded p-2">
                              <p className="text-green-400 text-sm font-medium">
                                {challenge?.title || challengeId}
                              </p>
                              {challenge && (
                                <p className="text-green-300/60 text-xs">
                                  {challenge.category} • {challenge.difficulty}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </TerminalBox>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
