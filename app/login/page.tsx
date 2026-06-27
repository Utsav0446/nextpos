'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loginSchema, LoginInput } from '@/schemas/auth';
import { loginAction } from '@/actions/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      const res = await loginAction(data);
      if (res?.error) {
        toast(res.error, 'error');
      } else {
        toast('Logged in successfully.', 'success');
        // Force refresh root layout to fetch session cookie and mount the Sidebar layout
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err) {
      toast('Login failed. Check server/database connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 relative overflow-hidden select-none">
      {/* Background blobs for premium glassmorphism */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[15%] w-72 h-72 rounded-full bg-zinc-200/50 dark:bg-zinc-800/10 blur-3xl" />
        <div className="absolute bottom-[20%] right-[15%] w-96 h-96 rounded-full bg-zinc-300/30 dark:bg-zinc-800/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl overflow-hidden p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 dark:bg-zinc-50 flex items-center justify-center text-white dark:text-zinc-950 font-bold shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight mt-2">
            Gastronomy Admin
          </h1>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
            Sign in to access POS ordering, receipt printing, and stocks.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4.5">
          <Input
            label="Email Address"
            type="email"
            placeholder="admin@restaurant.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" className="w-full mt-2 py-3 text-[13px] font-semibold" isLoading={loading}>
            Sign In
          </Button>
        </form>
        
        <div className="flex justify-center text-[10px] text-zinc-400 font-medium mt-1">
          <span>Security locked: Admin-only access panel.</span>
        </div>
      </div>
    </div>
  );
}
