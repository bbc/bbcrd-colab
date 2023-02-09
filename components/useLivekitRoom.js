import { useRoom } from '@livekit/react-core'
import { useEffect } from 'react'

export default function useLivekitRoom ({ token }) {
	const roomOptions = {
		adaptiveStream: true,
		dynacast: true
	}

	const livekit = useRoom(roomOptions)

	// We only want this to be executed on the first render
	// and when the component unmounts
	// TODO: this is an issue for React 18 and needs a fix in Livekit
	useEffect(() => {
		livekit.connect(process.env.NEXT_PUBLIC_LIVEKIT_SERVER, token)

		return () => {
			livekit.room?.disconnect()
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return livekit
}
