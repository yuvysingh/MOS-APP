'use client';

import { useCallback, useRef, useState } from 'react';

type PreflightResp =
  | { state: 'OK' }
  | { state: 'NEEDS_ACCOUNT' }
  | { state: 'NEEDS_ONBOARDING'; onboardingUrl: string };

export function useSubmitWithStripe(opts: {
  
  openConfirmModal?: () => void;
}) {
  const [redirecting, setRedirecting] = useState(false);
  const inFlight = useRef(false); // prevents double-clicks without showing a spinner

  const onSubmit = useCallback(async () => {
    if (redirecting || inFlight.current) return;
    inFlight.current = true;

    try {
      

      // Try preflight first
      const pfRes = await fetch('/api/sales/preflight', { method: 'POST' });
      if (pfRes.ok) {
        const data = (await pfRes.json()) as PreflightResp;

        if (data.state === 'OK') {
          opts.openConfirmModal?.();
          return; // done, no redirect
        }

        if (data.state === 'NEEDS_ONBOARDING') {
          setRedirecting(true);
          window.location.assign(data.onboardingUrl);
          return;
        }
        // NEEDS_ACCOUNT → fall through to create account + link
      }

      // Create account then ask your existing /api/account_link for a fresh link
      const acct = await fetch('/api/account', { method: 'POST' });
      if (!acct.ok) throw new Error('Failed to create Stripe account');
      const { account } = await acct.json();

      const linkRes = await fetch('/api/account_link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account }),
      });
      if (!linkRes.ok) throw new Error('Failed to create Account Link');
      const { url } = await linkRes.json();

      setRedirecting(true);
      window.location.assign(url);
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      // If we didn’t redirect, allow another attempt
      if (document.visibilityState === 'visible') {
        inFlight.current = false;
      }
    }
  }, [redirecting, opts]);

  return { onSubmit, redirecting };
}
