/* eslint-disable camelcase */
import { RoomProvider } from '../../liveblocks.config'
import { AudioRenderer } from '@livekit/react-core'
import dynamic from 'next/dynamic'
import SetupScreen from '../../components/SetupScreen'
import { rooms } from '../../utils'
import { getAccessToken } from '../../server-utils'
import { LiveList, LiveMap, LiveObject } from '@liveblocks/client'
import Cookies from 'cookies'
import Favicon from '../../components/Favicon'
import useLivekitRoom from '../../components/useLivekitRoom'
import useMeydaAnalyser from '../../components/useMeydaAnalyser'
import { useState } from 'react'
import { unstable_batchedUpdates } from 'react-dom'

const MultiplayerEditor = dynamic(() => import('../../components/MultiplayerEditor'), { ssr: false })

export default function Room ({ token, roomId, color, username }) {
	const livekit = useLivekitRoom({ token })
	const audioAnalyser = useMeydaAnalyser()
	const [needMicScreen, setMicScreen] = useState(true)

	return <RoomProvider
		unstable_batchedUpdates={unstable_batchedUpdates}
		id={roomId}
		initialPresence={() => ({ selection: [], cursor: null, username })}
		initialStorage={{
			metadata: new LiveObject(),
			layerIds: new LiveList(),
			layers: new LiveMap()
		}}
	>
		<Favicon />
		{!needMicScreen && livekit.audioTracks.map((track) => <AudioRenderer key={track.sid} track={track} isLocal={false} />)}
		{livekit.room && needMicScreen && <SetupScreen roomId={roomId} livekit={livekit} audioAnalyser={audioAnalyser} handleDone={() => setMicScreen(false)} color={color} username={username} />}
		<MultiplayerEditor username={username} roomId={roomId} color={color} livekit={livekit} audioAnalyser={audioAnalyser} />
	</RoomProvider>
}

export const getServerSideProps = async ({ query, req, res }) => {
	const { roomId } = query
	const cookies = new Cookies(req, res)
	const rawUsername = cookies.get('username')

	const { color } = rooms.find(({ id }) => id === roomId)

	if (rawUsername) {
		const username = decodeURI(rawUsername)
		const token = getAccessToken(roomId, `${username}-${Date.now()}`)

		return {
			props: {
				roomId,
				color,
				username: decodeURI(username),
				token
			}
		}
	}
	else {
		return {
			redirect: {
				destination: '/',
				permanent: false
			}
		}
	}
}
