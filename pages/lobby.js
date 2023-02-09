/* eslint-disable camelcase */
import { RoomProvider, useMutation, useMyPresence, useOthers, useStorage } from '../liveblocks.config'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import ThumbLayer from '../components/ThumbLayer'
import useSize from '../components/useSize'
import { CANVAS_SIZE, getActionIcon, getPointerPosition, rooms } from '../utils'
import * as Dayjs from 'dayjs'
import RelativeTime from 'dayjs/plugin/relativeTime'
import { LiveList, LiveMap, LiveObject } from '@liveblocks/client'
import StartScreen from '../components/StartScreen'
import { BoardIcon, EditIcon, InactiveIcon, MicOffIcon, MicOnIcon } from '../components/icons'
import Cookies from 'cookies'
import { getAccessToken } from '../server-utils'
import useLivekitRoom from '../components/useLivekitRoom'
import useMeydaAnalyser from '../components/useMeydaAnalyser'
import { AudioRenderer, useParticipant } from '@livekit/react-core'
import LobbyAudioChat from '../components/LobbyAudioChat'
import { UsersIcon } from '@heroicons/react/24/solid'
import { unstable_batchedUpdates } from 'react-dom'

Dayjs.extend(RelativeTime)

function Cursor ({ presence }) {
	const { cursor, username, currentAction, isActive } = presence

	const posX = cursor.x / CANVAS_SIZE
	const posY = cursor.y / CANVAS_SIZE

	const ActionIcon = getActionIcon(currentAction, isActive)

	return <div
		className='absolute z-0 top-0 left-0 w-full h-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity'
		style={{
			transition: 'transform 0.5s cubic-bezier(.17,.93,.38,1)',
			transform: `translateX(${posX * 100}%) translateY(${posY * 100}%)`
		}}
	>
		<div className='absolute top-0 left-0'>
			<div className='rounded-md w-5 h-5 bg-white text-black flex justify-center items-center rounded-r-none'>
				<ActionIcon className='w-3/4' />
			</div>
			<div className='absolute translate-x-full right-0 top-1/2 bg-white text-black text-xs rounded-r-md px-1 py-0.5 -translate-y-1/2 whitespace-nowrap'>{username}</div>
		</div>
	</div>
}

const MAX_PEOPLE_IN_OVERVIEW = 6

function Room ({ id, className, path, color, username, setEmptyRooms }) {
	const others = useOthers()
	const layerIds = useStorage((root) => root.layerIds)
	const metadata = useStorage((root) => root.metadata)
	const isActive = others.map(({ presence }) => !!(presence && presence.cursor)).some((v) => v)
	const router = useRouter()
	const lastUsed = metadata?.lastUsed ? metadata.lastUsed : Date.now()

	const handleEnterRoom = useMutation(({ storage }, username) => {
		storage.get('metadata').set('users', [username])
		storage.get('metadata').set('lastUsed', Date.now())
	}, [])

	const handleClick = () => {
		if (metadata !== null) {
			if (!isActive) {
				handleEnterRoom(username)
			}

			router.push(path)
		}
	}

	useEffect(() => {
		if (isActive) {
			setEmptyRooms((rooms) => {
				const { [id]: value, ...emptyRooms } = rooms

				return emptyRooms
			})
		}
		else {
			setEmptyRooms((rooms) => {
				return {
					...rooms,
					[id]: metadata?.lastUsed || 0
				}
			})
		}
	}, [id, isActive, metadata, setEmptyRooms])

	return <button className={`block relative z-10 ${className} overflow-hidden rounded-xl group flex flex-col transition-colors border-4 ${isActive ? `bg-${color}-400 border-${color}-400 hover:border-${color}-700 shadow-md` : `bg-white border-white hover:border-${color}-200`}`} onClick={handleClick}>
		{metadata !== null && <div className={`px-2 py-1 z-40 text-left text-${color}-700 w-full`}>
			<div className='font-bold leading-[1.1] flex items-center flex-wrap gap-1'>
				<div className='flex space-x-1 items-center pr-1'>
					<BoardIcon className='w-4' />
					<div>{metadata?.name || 'Untitled Board'}</div>
				</div>
				{!isActive && metadata?.users?.length && metadata.users?.slice(0, MAX_PEOPLE_IN_OVERVIEW).map((n) => <div key={n} className={`px-1.5 bg-${color}-200 text-${color}-700 rounded-md text-sm font-semibold`}>{n}</div>)}
				{!isActive && metadata.users?.length - MAX_PEOPLE_IN_OVERVIEW > 0 && <div className={`px-1.5 bg-${color}-400 rounded-md font-semibold text-sm`}>{`+${metadata.users.length - MAX_PEOPLE_IN_OVERVIEW}`}</div>}
			</div>
		</div>}

		<div className='w-full h-full relative'>
			{layerIds && layerIds.map((layerId) => {
				return <ThumbLayer key={layerId} layerId={layerId} color={color} isActive={isActive} />
			})}

			<div className='absolute top-0 left-0 w-full h-full backdrop-blur-xs rounded-xl' />

			{others.map(({ connectionId, presence }) => {
				if (!presence || !presence.cursor) {
					return null
				}

				return <Cursor
					key={`cursor-${connectionId}`}
					presence={presence}
				/>
			})}

			{metadata === null && <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 text-${color}-300 small-caps`}>Loading...</div>}
			{metadata !== null && <div className={`small-caps px-2 rounded-md text-${color}-700 inline-block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-${color}-300 bg-opacity-50 backdrop-blur-sm z-40 tracking-wider transition-opacity opacity-0 group-hover:opacity-100`}>
				<div className='text-sm'>{!isActive ? 'Enter' : 'Join'}</div>
			</div>}
		</div>

		{metadata !== null && <div className={`px-2 py-1 z-40 text-${color}-700 w-full flex justify-between items-end`}>
			<div className='small-caps'>{id}</div>
			{!isActive && metadata?.lastUsed && <div className='text-sm font-medium'>{Dayjs(lastUsed).fromNow()}</div>}
			{isActive && <div className={`small-caps px-2 py-0.5 bg-${color}-700 text-${color}-100 rounded-md`}>Now</div>}
		</div>}
	</button>
}

function Lobby ({ username, livekit }) {
	const others = useOthers()
	const othersWithCursors = others.filter(({ presence }) => presence && presence.cursor)
	const [, setPresence] = useMyPresence()
	const usernames = useStorage((root) => root.usernames)

	const canvasRef = useRef()
	const canvasRect = useSize(canvasRef)

	const [isLoading, setLoading] = useState(false)
	const router = useRouter()

	const [name, setName] = useState(username)
	const [needName, setNeedName] = useState(false)

	const audioAnalyser = useMeydaAnalyser()
	const isTalkingWhileMuted = audioAnalyser.hasPeaked
	const [audioChat, setAudioChat] = useState('connecting') // connecting / connected
	const { microphonePublication, isSpeaking } = useParticipant(livekit.room.localParticipant)
	const isAudioEnabled = microphonePublication && !microphonePublication.isMuted

	const handleSaveName = (newName) => {
		setNeedName(false)
		setName(newName)
	}

	useEffect(() => {
		if (!needName && name) {
			setPresence({ username: name })
		}
	}, [needName, name, setPresence])

	useEffect(() => {
		const onFocus = () => {
			setPresence({ isActive: true })
		}

		const onBlur = () => {
			setPresence({ isActive: false })
		}

		onFocus()

		window.addEventListener('focus', onFocus)
		window.addEventListener('blur', onBlur)

		return () => {
			window.removeEventListener('focus', onFocus)
			window.removeEventListener('blur', onBlur)
		}
	}, [setPresence])

	const [emptyRooms, setEmptyRooms] = useState({})
	const currentEmptyRoom = Object.keys(emptyRooms).sort((a, b) => emptyRooms[a] - emptyRooms[b])[0]

	const handleConnect = () => {
		setAudioChat('connected')
	}

	const toggleMute = () => {
		audioAnalyser.setRunning(isAudioEnabled)
		livekit.room.localParticipant.setMicrophoneEnabled(!isAudioEnabled)
	}

	const handleNewBoard = () => {
		setLoading(currentEmptyRoom)

		fetch(`/api/reset-room/${currentEmptyRoom}`).then(() => {
			router.push(`/r/${currentEmptyRoom}`)
		})
	}

	return <div className='h-full p-2 bg-zinc-100 flex flex-col space-y-2'>
		{audioChat === 'connected' && livekit.audioTracks.map((track) => <AudioRenderer key={track.sid} track={track} isLocal={false} />)}
		{audioChat === 'connecting' && <LobbyAudioChat livekit={livekit} audioAnalyser={audioAnalyser} handleDone={handleConnect} />}

		<div className='relative shadow-sm bg-white px-2 py-2 rounded-xl flex items-center space-x-2 justify-between z-30'>
			<div className='text-neutral-500 font-bold flex space-x-1'>
				<div className='relative h-full'>
					<button title='Toggle Mute' className={`text-black flex items-center px-2 py-1 ${isAudioEnabled ? 'bg-black text-white' : 'bg-neutral-200'} rounded-lg relative z-20 h-full`} onClick={toggleMute}>
						{isAudioEnabled ? <MicOnIcon className='w-5' /> : <MicOffIcon className='w-5' />}
						<div className='pl-1 font-semibold'>{name}</div>
						<div className={`absolute left-0 top-0 w-full h-full ring-2 ring-offset-2 ring-offset-neutral-300 rounded-md ring-black z-0 transition-opacity ${isSpeaking ? 'opacity-80' : 'opacity-0'}`} />
					</button>
					<div className={`absolute top-0.5 -right-2 transition-all ${!isAudioEnabled && isTalkingWhileMuted ? 'translate-x-full opacity-100' : '-translate-x-0 opacity-0'} z-10`}>
						<div className={`bg-neutral-700 text-white py-1 px-2 rounded-lg font-medium whitespace-nowrap leading-tight ${!isAudioEnabled && isTalkingWhileMuted && 'animate-shake'}`}>You are muted</div>
					</div>
				</div>
				<button title='Change name' className='flex justify-between items-center bg-white text-black px-2 py-1 rounded-lg hover:bg-black hover:text-white transition-colors' onClick={() => setNeedName(true)}>
					<EditIcon className='w-5' />
				</button>
			</div>
			<button
				title='New Colab Session'
				className='absolute left-1/2 -translate-x-1/2 rounded-lg border-2 border-black transition-colors hover:bg-black hover:text-white disabled:bg-neutral-200 disabled:text-neutral-400 py-1 px-3 flex justify-center items-center space-x-1'
				disabled={Object.keys(emptyRooms).length === 0 || isLoading}
				onClick={handleNewBoard}
			>
				<BoardIcon className='w-4 pt-0.5' />
				<div className='small-caps'>{isLoading ? 'Setting up...' : 'New Colab'}</div>
			</button>
			<div className='px-2 py-1 bg-black text-white rounded-lg flex items-center space-x-1'>
				<UsersIcon className='h-5' />
				<div>{othersWithCursors.length + 1}</div>
			</div>
		</div>

		<div
			ref={canvasRef}
			className='relative grid grid-cols-12 grid-rows-10 gap-2 h-full'
			onPointerMove={(e) => {
				if (!needName) {
					const pos = getPointerPosition(e, canvasRect)

					const cursor = {
						x: Math.max(pos.x, 0),
						y: Math.max(pos.y, 0),
						w: canvasRect?.width,
						h: canvasRect?.height
					}

					setPresence({
						username: name,
						cursor
					})
				}
			}}
		>
			{rooms.map(({ id, color, className }, i) => {
				return <RoomProvider
					unstable_batchedUpdates={unstable_batchedUpdates}
					key={id}
					id={id}
					initialPresence={{}}
					initialStorage={{
						metadata: new LiveObject(),
						layerIds: new LiveList(),
						layers: new LiveMap()
					}}
				>
					<Room id={id} className={className} username={name} path={`/r/${id}`} color={color} setEmptyRooms={setEmptyRooms} />
				</RoomProvider>
			})}
			{!needName && others.map(({ presence }) => {
				if (!presence.username || !presence.cursor) {
					return null
				}
				else {
					const { cursor } = presence
					const posX = cursor.x / cursor.w
					const posY = cursor.y / cursor.h

					return <div key={presence.username} className='absolute top-0 left-0 transition-transform font-medium text-white px-2 py-0.5 rounded-md z-40 pointer-events-none flex bg-neutral-700 space-x-1 items-center' style={{ transform: `translate(-50%, -50%) translate(${posX * canvasRect?.width}px, ${posY * canvasRect?.height}px) scale(${presence.isActive ? 1 : 0.8})` }}>
						{!presence.isActive && <InactiveIcon className='w-4' />}
						<div>{presence.username}</div>
					</div>
				}
			})}
		</div>

		{(needName || (usernames !== null && !usernames.includes(name))) && <StartScreen handleSaveName={handleSaveName} usernames={usernames} username={name} />}
	</div>
}

export default function LobbyPage ({ username, token }) {
	const livekit = useLivekitRoom({ token })

	return <div className='h-full w-full font-sans flex flex-col'>
		<RoomProvider unstable_batchedUpdates={unstable_batchedUpdates} initialPresence={{}} initialStorage={{ usernames: new LiveList() }} id='lobby'>
			<Lobby username={username} livekit={livekit} />
		</RoomProvider>
	</div>
}

export const getServerSideProps = async ({ req, res }) => {
	const cookies = new Cookies(req, res)
	const rawUsername = cookies.get('username')

	if (rawUsername) {
		const username = decodeURI(rawUsername)
		const token = getAccessToken('lobby', `${username}-${Date.now()}`)

		return {
			props: {
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
