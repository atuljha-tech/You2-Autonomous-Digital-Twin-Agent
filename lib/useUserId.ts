'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { userAPI } from './api';

/**
 * Reads the stored user ID, validates it against the server,
 * and clears stale IDs (404) by redirecting to /create-twin.
 *
 * Returns null while loading, the userId string once confirmed valid.
 */
export function useUserId(): string | null {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('you2_user_id');
    if (!id) {
      router.push('/create-twin');
      return;
    }

    // Optimistically set the ID so the page can start rendering
    setUserId(id);

    // Validate in background — if the user no longer exists, clear and redirect
    userAPI.getUser(id).catch((err: any) => {
      if (err?.response?.status === 404) {
        localStorage.removeItem('you2_user_id');
        localStorage.removeItem('you2_user_name');
        router.push('/create-twin');
      }
    });
  }, [router]);

  return userId;
}
