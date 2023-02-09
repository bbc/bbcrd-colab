import { getAccessToken } from '../../../server-utils'

export default function handler (req, res) {
	const { roomId, username } = req.query

	const token = getAccessToken(roomId, username)

	res.status(200).json({ token })
}
