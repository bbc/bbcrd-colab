import { AccessToken } from 'livekit-server-sdk'

export function getAccessToken (roomId, username) {
	const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_SECRET_KEY, {
		identity: username
	})

	at.addGrant({ room: roomId, roomJoin: true, canPublish: true, canSubscribe: true })

	const token = at.toJwt()

	return token
}
