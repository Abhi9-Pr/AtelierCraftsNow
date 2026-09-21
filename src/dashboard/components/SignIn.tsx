import { actionClass } from './actionStyle'

/** Shown to anyone who is not signed in. Only the GitHub accounts on the owner list get further. */
export function SignIn({ ended }: { ended: boolean }) {
  return (
    <section aria-labelledby="sign-in-heading" className="mx-auto max-w-md py-10 text-center">
      <h1 id="sign-in-heading" className="font-display text-4xl leading-none">
        Sign in
      </h1>
      <p className="mt-6 text-ink-soft">
        {ended ? 'Your sign-in has ended. ' : ''}
        This page is for the owner. Sign in with the GitHub account that is on the owner list.
      </p>
      <p className="mt-8">
        <a href="/api/admin/login" className={actionClass('solid')}>
          Sign in with GitHub
        </a>
      </p>
    </section>
  )
}
