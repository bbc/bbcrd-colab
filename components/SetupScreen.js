import { useRef, useState } from 'react'
import { useMutation, useOthers, useStorage } from '../liveblocks.config'
import { BoardIcon, MicOffIcon, MicOnIcon } from './icons'
import { motion } from 'framer-motion'
import { useRouter } from 'next/router'

export default function SetupScreen ({ roomId, livekit, audioAnalyser, color, handleDone }) {
	const metadata = useStorage((root) => root.metadata)
	const [joinMuted, setJoinMuted] = useState(true)
	const boardName = useRef()
	const router = useRouter()
	const others = useOthers()
	const activeOthers = others.filter((p) => p?.presence?.cursor)

	const handleChange = useMutation(({ storage }, e) => {
		storage.get('metadata').set('name', e.target.value)
	}, [])

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

	return <div className={`fixed top-0 left-0 w-full h-full backdrop-blur-sm bg-${color}-500 bg-opacity-80 flex justify-center items-center z-10 font-sans`}>
		<motion.div layout className={`bg-${color}-100 shadow-lg flex justify-center items-center rounded-lg overflow-hidden`}>
			{metadata === null && <div className='w-[25rem] overflow-hidden rounded-full flex space-x-4 px-16 py-14'>
				<div className={`w-full h-4 bg-${color}-300 rounded-full`}>
					<motion.div
						className='w-full relative h-full'
						initial={{
							x: '5%'
						}}
						animate={{
							x: '90%'
						}}
						transition={{ duration: 2, repeatType: 'reverse', repeat: Infinity }}
					>
						<div className={`w-1/12 rounded-full h-full absolute left-0 top-0 bg-${color}-700`} />
					</motion.div>
				</div>
			</div>}
			{metadata !== null && <motion.div layout className='flex-col space-y-8'>
				<div className='flex-col space-y-4'>
					<div className='bg-white rounded-t-lg px-16 py-4'>
						<h1 className='text-black text-4xl font-bold leading-tight'>Welcome to <span className={`small-caps text-${color}-500`}>{roomId}</span></h1>
						{activeOthers.length > 0 && <div className='flex flex-wrap space-x-1 items-center'>
							{activeOthers.map(({ connectionId, presence }) => {
								return <div key={connectionId} className={`text-xs bg-${color}-500 text-white px-2 py-0.5 rounded-lg`}>{presence.username}</div>
							})}
						</div>}
					</div>
					<div className='flex space-x-4 items-center px-16 pt-2'>
						<div className='small-caps w-30 flex items-center space-x-1'>
							<BoardIcon className='w-6' />
						</div>
						<input className={`text-2xl w-full font-bold text-left leading-normal outline-none px-2 border-2 border-${color}-300 rounded-lg focus:border-${color}-500`} value={metadata.name || ''} onChange={handleChange} placeholder='Enter board name' ref={boardName} />
					</div>
					<div className='flex space-x-4 items-center px-16'>
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
				<div className='flex justify-end space-x-4 px-16 pb-6'>
					<button
						className='border-black border-2 px-2 py-1 leading-none rounded-md hover:bg-black hover:text-white small-caps'
						onClick={() => router.push('/')}
					>
						Leave
					</button>
					<button
						className='border-black border-2 px-2 py-1 leading-none rounded-md hover:bg-black hover:text-white small-caps disabled:opacity-25'
						onClick={handleJoin}
						disabled={!metadata?.name?.trim()}
					>
						Join
					</button>
				</div>
			</motion.div>}
		</motion.div>
	</div>
}
