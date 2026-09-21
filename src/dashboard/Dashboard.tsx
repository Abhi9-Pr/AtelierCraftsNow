import { useState } from 'react'
import { signOut } from './api'
import { Notice } from './components/Notice'
import { Shell } from './components/Shell'
import { SignIn } from './components/SignIn'
import { useSession } from './useSession'
import { Workspace } from './Workspace'

/** The owner's page for orders. Everything on it is fetched from the order service, which answers only to the signed-in owner. */
export function Dashboard() {
  const { session, signedOut } = useSession()
  const [ended, setEnded] = useState(false)

  const onSignedOut = () => {
    setEnded(true)
    signedOut()
  }

  if (session.state === 'signed-in') {
    return (
      <Shell login={session.login} onSignOut={() => void signOut().then(signedOut, signedOut)}>
        <Workspace onSignedOut={onSignedOut} />
      </Shell>
    )
  }

  return (
    <Shell>
      {session.state === 'checking' && <p role="status" className="text-ink-soft">Checking your sign-in</p>}
      {session.state === 'signed-out' && <SignIn ended={ended} />}
      {session.state === 'problem' && <Notice problem>{session.message}</Notice>}
    </Shell>
  )
}
