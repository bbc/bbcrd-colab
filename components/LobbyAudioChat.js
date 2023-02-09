import { useState } from 'react'
import { MicOffIcon, MicOnIcon } from './icons'

export default function LobbyAudioChat ({ livekit, audioAnalyser, handleDone }) {
	const [joinMuted, setJoinMuted] = useState(true)

	const handleJoin = () => {
		livekit.room.startAudio()
		handleDone()

		if (joinMuted) {
			audioAnalyser.setRunning(true)
		}
		else {
			livekit.room.localParticipant.setMicrophoneEnabled(true)
		}
	}

	return <div className='fixed top-0 left-0 w-full h-full backdrop-blur-sm bg-neutral-500 bg-opacity-80 flex justify-center items-center z-50 font-sans'>
		<div className='bg-neutral-100 shadow-lg flex justify-center items-center rounded-lg px-16 py-14 overflow-hidden'>
			<div className='flex-col space-y-8'>
				<div className='flex-col space-y-4'>
					<h1 className='text-neutral-600 text-4xl font-bold'>Join the Lobby</h1>
					<div className='flex space-x-4 items-center'>
						<div className='small-caps w-30 flex space-x-1 items-center'>
							{joinMuted ? <MicOffIcon className='w-6' /> : <MicOnIcon className='w-6' />}
						</div>
						<button
							className={`border-2 border-black px-2 py-1 leading-none rounded-md ${joinMuted && 'bg-black text-white'}`}
							onClick={() => setJoinMuted(true)}
						>
							Muted
						</button>
						<button
							className={`border-2 border-black px-2 py-1 leading-none rounded-md ${!joinMuted && 'bg-black text-white'}`}
							onClick={() => setJoinMuted(false)}
						>
							Unmuted
						</button>
					</div>
				</div>
				<div className='flex justify-end space-x-4'>
					<button
						className='border-black border-2 px-2 py-1 leading-none rounded-md hover:bg-black hover:text-white small-caps disabled:opacity-25'
						onClick={handleJoin}
					>
						Enter
					</button>
				</div>
			</div>
		</div>
	</div>
}
