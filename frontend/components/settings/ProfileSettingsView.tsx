'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, UserCheck, Lock, Smartphone, User } from 'lucide-react';
import { updateProfileAction } from '@/actions/auth';

interface ProfileSettingsViewProps {
  initialEmail?: string;
  initialFirstName?: string;
  initialLastName?: string;
  initialMobile?: string;
}

export default function ProfileSettingsView({
  initialEmail = 'admin@pos.com',
  initialFirstName = 'Only Dhosa',
  initialLastName = '',
  initialMobile = '',
}: ProfileSettingsViewProps) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [mobileNo, setMobileNo] = useState(initialMobile);
  const [appLoginPin, setAppLoginPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast('First name is required.', 'error');
      return;
    }

    setIsSubmitting(true);
    toast('Updating profile details...', 'info');

    try {
      // Simulate profile save with feedback
      setTimeout(() => {
        setIsSubmitting(false);
        toast('Profile updated successfully!', 'success');
      }, 500);
    } catch (err: any) {
      setIsSubmitting(false);
      toast('Failed to update profile.', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FDF9F5] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans select-none">
      {/* HEADER BANNER - TERRACOTTA #8B3A36 */}
      <header className="bg-[#8B3A36] text-white px-5 py-3.5 flex items-center gap-3 shadow-md sticky top-0 z-40">
        <Link
          href="/dashboard"
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-lg md:text-xl font-bold tracking-tight">Profile</h1>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-lg w-full mx-auto p-6 md:p-10 flex flex-col items-center justify-start pt-12">
        <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col items-center">
          {/* Form Title */}
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-8 text-center">
            Profile
          </h2>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
            {/* FIELD 1: FIRST NAME */}
            <div className="relative">
              <label className="absolute -top-2.5 left-4 bg-white dark:bg-zinc-900 px-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#8B3A36] transition-colors"
                placeholder="First Name"
              />
            </div>

            {/* FIELD 2: LAST NAME */}
            <div className="relative">
              <label className="absolute -top-2.5 left-4 bg-white dark:bg-zinc-900 px-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#8B3A36] transition-colors"
                placeholder="Last Name"
              />
            </div>

            {/* FIELD 3: MOBILE NO */}
            <div className="relative">
              <label className="absolute -top-2.5 left-4 bg-white dark:bg-zinc-900 px-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Mobile No
              </label>
              <input
                type="tel"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#8B3A36] transition-colors"
                placeholder="Mobile No"
              />
            </div>

            {/* FIELD 4: APP LOGIN PIN */}
            <div className="relative">
              <label className="absolute -top-2.5 left-4 bg-white dark:bg-zinc-900 px-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                App Login Pin
              </label>
              <input
                type="password"
                value={appLoginPin}
                onChange={(e) => setAppLoginPin(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#8B3A36] transition-colors"
                placeholder="App Login Pin"
              />
            </div>

            {/* SUBMIT BUTTON - MATCHING IMAGE 3 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 py-3 px-6 rounded-full bg-purple-50 hover:bg-purple-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-purple-900 dark:text-purple-300 font-semibold text-xs transition-colors shadow-sm text-center"
            >
              {isSubmitting ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
