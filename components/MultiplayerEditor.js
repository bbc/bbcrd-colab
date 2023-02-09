import { useParticipant } from '@livekit/react-core'
import Stage from './Stage'
import { useMutation, useStorage } from '../liveblocks.config'
import { useCallback, useEffect } from 'react'

export default function MultiplayerEditor ({ username, roomId, color, livekit, audioAnalyser }) {
	const { microphonePublication, isSpeaking } = useParticipant(livekit.room.localParticipant)
	const isAudioEnabled = microphonePublication && !microphonePublication.isMuted
	const isScreenSharing = livekit.room.localParticipant.isScreenShareEnabled

	// Contains board name and participants
	const metadata = useStorage((root) => root.metadata)

	const handleEnter = useMutation(({ storage }, username) => {
		const metadata = storage.get('metadata')

		metadata.set('lastUsed', Date.now())
		metadata.set('users', Array.from(new Set([...(metadata.get('users') || []), username])))
	}, [])

	useEffect(() => {
		if (metadata !== null && (!metadata.users || !metadata.users.includes(username))) {
			handleEnter(username)
		}
	}, [handleEnter, username, metadata])

	const toggleMute = () => {
		audioAnalyser.setRunning(isAudioEnabled)
		livekit.room.localParticipant.setMicrophoneEnabled(!isAudioEnabled)
	}

	const toggleScreenShare = useCallback(() => {
		return livekit.room.localParticipant.setScreenShareEnabled(!isScreenSharing, { audio: true })
	}, [isScreenSharing, livekit])

	return (
		<div className='fixed top-0 left-0 right-0 bottom-0 w-full h-full font-sans'>
			<Stage username={username} color={color} participants={livekit.participants} toggleMute={toggleMute} toggleScreenShare={toggleScreenShare} metadata={metadata} isAudioEnabled={isAudioEnabled} roomId={roomId} isTalkingWhileMuted={audioAnalyser.hasPeaked} isSpeaking={isSpeaking} isScreenSharing={isScreenSharing} />
		</div>
	)
}
