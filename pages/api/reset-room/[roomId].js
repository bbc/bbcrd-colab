import fetch from 'node-fetch'

const SECRET_KEY = 'sk_test_icUP8l9cUJm7sFaePfxL2S74'

export default function handler (req, res) {
	const { roomId } = req.query

	fetch(`https://api.liveblocks.io/v2/rooms/${roomId}/storage`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${SECRET_KEY}`
		}
	}).then(() => {
		res.status(200).json()
	})
}
