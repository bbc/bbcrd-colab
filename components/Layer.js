import { SendIcon, CrossIcon, PinIcon, SmileIcon } from './icons'
import { useMutation, useStorage } from '../liveblocks.config'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import AutosizeInput from 'react-input-autosize'
import TextareaAutosize from 'react-textarea-autosize'
import useInterval from './useInterval'
import { cancelEvent, getConstrainedCamera } from '../utils'
import useSize from './useSize'
import Favicon from './Favicon'
import { VideoRenderer } from '@livekit/react-core'
import { ArrowsPointingOutIcon } from '@heroicons/react/24/solid'

const chatLifetime = 45000
const beaconLifetime = 15000

const DeleteButton = ({ color, layerId, deleteLayerById }) => {
	return <div className='absolute -right-2 translate-x-full top-2'>
		<button
			title='Delete'
			className={`rounded-lg border-2 hover:bg-${color}-700 hover:text-white transition-colors border-${color}-700 text-${color}-700 w-6 h-6 flex justify-center items-center z-20`}
			onPointerDown={cancelEvent}
			onPointerUp={(e) => {
				e.stopPropagation()
				deleteLayerById({ layerId })
			}}
		>
			<CrossIcon className='w-3/4' />
		</button>
	</div>
}

function Chat ({ username, layer, layerId, color, onLayerPointerDown, isSelected, deleteLayerById, layerSizes, isMultiSelection, isZooming, className }) {
	const now = Date.now()
	const [, setDelta] = useState(now - layer.createdAt)
	const elRef = useRef()
	const box = useSize(elRef)

	useEffect(() => {
		layerSizes.current[layerId] = box
	}, [box, layerId, layerSizes])

	const handleChange = useMutation(({ storage, setMyPresence, self }, e) => {
		storage.get('layers').get(layerId).set(`${self.presence.username}-text`, e.target.value)
		setMyPresence({ currentAction: 'edit' })
	}, [layerId])

	const handleEnter = useMutation(({ storage, self }) => {
		const layer = storage.get('layers').get(layerId)
		const username = self.presence.username

		if (!layer.get('started')) {
			layer.set('started', true)
		}

		layer.get('messages').push({
			createdBy: username,
			createdAt: Date.now(),
			text: layer.get(`${username}-text`).trim()
		})

		layer.set(`${username}-text`, '')
	}, [layerId])

	const deleteOldMessages = useMutation(({ storage }) => {
		const layer = storage.get('layers').get(layerId)

		if (layer) {
			const findOldMessage = () => layer.get('messages').findIndex((m) => Date.now() - m.createdAt > chatLifetime)
			let oldMessageIndex = findOldMessage()

			while (oldMessageIndex > -1) {
				layer.get('messages').delete(oldMessageIndex)
				oldMessageIndex = findOldMessage()
			}

			if (layer.get('messages').length === 0) {
				deleteLayerById({ layerId, isAuto: true })
			}
		}
	}, [deleteLayerById, layerId])

	useInterval(() => {
		if (layer.started) {
			deleteOldMessages()
			setDelta(Date.now() - layer.createdAt)
		}
	}, 1000)

	const callbackRef = useCallback((el) => {
		if (el) {
			setTimeout(() => {
				el.focus()
				el.selectionStart = el.value.length
				el.selectionEnd = el.value.length
			}, 0)
		}
	}, [])

	return <div
		className={`absolute w-[10rem] min-h-[3rem] ${layer.isGhost && 'opacity-60 pointer-events-none'}`}
		style={{
			transform: `translateX(${layer.x}px) translateX(-50%) translateY(${layer.y}px)`
		}}
		key={`${layerId}-${layer.createdAt}`}
		ref={elRef}
	>
		{!isZooming && isSelected && !isMultiSelection && <DeleteButton color={color} layerId={layerId} deleteLayerById={deleteLayerById} />}
		<div
			className={`absolute w-full h-auto rounded-lg p-1 ${className}`}
			onPointerDown={(e) => {
				onLayerPointerDown(e, layerId)
			}}
		>
			<div className='flex flex-col space-y-2'>
				{layer.messages?.map((message) => {
					const delta = now - message.createdAt
					const percent = 1 - Math.min(Math.max(delta / chatLifetime, 0), 1)

					return <div key={`${message.createdAt}-${message.createdBy}`} className='rounded-lg px-2 pt-0.5 pb-1 bg-white transition-opacity' style={{ opacity: percent }}>
						<span className={`text-${color}-500 small-caps`}>{message.createdBy}</span>
						<div className='w-full italic text-sm'>{message.text}</div>
					</div>
				})}
				{!layer.started && <div className='italic bg-white rounded-lg px-2 py-1 text-sm opacity-70'>
					New thread
				</div>}

				{isSelected && !isMultiSelection && <div className='relative rounded-lg px-2 py-1 bg-white'>
					<TextareaAutosize
						placeholder='Type here...'
						className='w-full outline-none italic resize-none text-sm'
						onChange={handleChange}
						value={layer[`${username}-text`]}
						ref={callbackRef}
						onKeyUp={(e) => {
							if (e.key === 'Enter' && layer[`${username}-text`].trim()) {
								handleEnter()
							}
						}}
					/>
					<div className={`text-xs opacity-50 italic text-${color}-600 leading-none flex justify-between items-center w-full space-x-1 -mt-1`}>
						<span>Press Enter to send</span>
						<SendIcon className={`text-${color}-600 h-4 flex-shrink-0`} />
					</div>
				</div>}
			</div>
		</div>
	</div>
}

function Sticky ({ username, layer, layerId, color, onLayerPointerDown, isSelected, deleteLayerById, layerSizes, isMultiSelection, isZooming, className }) {
	const textarea = useRef()
	const elRef = useRef()
	const box = useSize(elRef)

	useEffect(() => {
		layerSizes.current[layerId] = box
	}, [box, layerId, layerSizes])

	useEffect(() => {
		if ((!isSelected || isMultiSelection) && textarea.current) {
			const t = setTimeout(() => {
				textarea.current.blur()
			}, 0)

			return () => clearTimeout(t)
		}
	}, [textarea, isSelected, isMultiSelection])

	const handleChange = useMutation(({ storage, setMyPresence }, e) => {
		storage.get('layers').get(layerId).set('text', e.target.value)
		setMyPresence({ currentAction: 'edit' })
	}, [layerId])

	const handleVote = useMutation(({ storage, setMyPresence }, e) => {
		const layer = storage.get('layers').get(layerId)
		layer.set('votes', layer.get('votes') ? layer.get('votes') + 1 : 1)
		setMyPresence({ currentAction: 'vote' })
	}, [layerId])

	return <div
		className={`absolute w-[10rem] leading-[1.4] shadow-md bg-${color}-200 px-4 py-3 group ${layer.isGhost && 'pointer-events-none'} ${className}`}
		style={{
			transform: `translateX(${layer.x}px) translateX(-50%) translateY(${layer.y}px)`
		}}
		ref={elRef}
		onPointerDown={(e) => {
			onLayerPointerDown(e, layerId)

			// Don't focus on textarea if already selected
			if (isMultiSelection && isSelected) {
				cancelEvent(e)
			}
		}}
	>
		<TextareaAutosize
			key={`${layerId}-${layer.createdAt}`}
			ref={textarea}
			minRows={6}
			placeholder='Type here...'
			onChange={handleChange}
			value={layer.text}
			className='w-full h-full bg-transparent outline-none placeholder-black placeholder-opacity-20 resize-none overflow-hidden font-medium'
			autoFocus={layer.createdBy === username && !layer.text && Date.now() - layer.createdAt < 1000}
		/>
		<div className='-space-x-[0.45rem] flex justify-end w-full h-3.5'>
			{layer.votes && [...new Array(layer.votes)].map((_, i) => {
				return <div key={i} className={`w-3.5 h-3.5 bg-${color}-700 border-${color}-200 border-2 rounded-full`} />
			})}
		</div>
		{!isZooming && isSelected && !isMultiSelection && <>
			<DeleteButton color={color} layerId={layerId} deleteLayerById={deleteLayerById} />
			<div
				className='absolute -right-2 translate-x-full flex justify-end bottom-2'
				onPointerDown={(e) => {
					cancelEvent(e)

					if (isSelected) {
						handleVote()
					}
				}}
				onPointerUp={cancelEvent}
			>
				<button title='+1' className={`rounded-lg border-2 hover:bg-${color}-700 hover:text-white transition-colors border-${color}-700 text-${color}-700 w-6 h-6 flex justify-center items-center z-20 text-sm`}>
					<SmileIcon className='w-3/4' />
				</button>
			</div>
		</>}
	</div>
}

function Text ({ username, layer, layerId, color, onLayerPointerDown, isSelected, deleteLayerById, layerSizes, isMultiSelection, isZooming, className }) {
	const textarea = useRef()
	const elRef = useRef()
	const box = useSize(elRef)

	useEffect(() => {
		layerSizes.current[layerId] = box
	}, [box, layerId, layerSizes])

	useEffect(() => {
		if ((!isSelected || isMultiSelection) && textarea.current) {
			const t = setTimeout(() => {
				textarea.current.blur()
			}, 0)

			return () => clearTimeout(t)
		}
	}, [textarea, isSelected, isMultiSelection])

	const handleChange = useMutation(({ storage, setMyPresence }, e) => {
		storage.get('layers').get(layerId).set('text', e.target.value)
		setMyPresence({ currentAction: 'edit' })
	}, [layerId])

	return <div
		className={`absolute ${layer.isGhost && 'opacity-60 pointer-events-none'}`}
		style={{
			transform: `translateX(${layer.x}px) translateX(-50%) translateY(${layer.y}px)`
		}}
		ref={elRef}
	>
		<AutosizeInput
			ref={textarea}
			key={`${layerId}-${layer.createdAt}`}
			placeholder='Type here...'
			onPointerDown={(e) => onLayerPointerDown(e, layerId)}
			onChange={handleChange}
			value={layer.text || ''}
			className={`w-full h-full px-2 py-0.5 font-bold text-2xl ${className}`}
			inputClassName='outline-none bg-transparent placeholder-white placeholder-opacity-50'
			autoFocus={layer.createdBy === username && !layer.text && Date.now() - layer.createdAt < 1000}
		/>
		{!isZooming && isSelected && !isMultiSelection && <DeleteButton color={color} layerId={layerId} deleteLayerById={deleteLayerById} />}
	</div>
}

function Beacon ({ layer, layerId, color, deleteLayerById, camera, canvasRect, isZooming, setCamera, isActive, isAudioEnabled }) {
	const [delta, setDelta] = useState(Date.now() - layer.createdAt)
	const hasRendered = useRef(false)
	const [favicon, setFavicon] = useState(0)
	const hasExpired = delta > beaconLifetime
	const isBeaconAlertRunning = !(hasExpired || isActive || layer.isGhost)

	useEffect(() => {
		if (!layer.isGhost) {
			hasRendered.current = true
		}
	}, [layer.isGhost, isActive, isAudioEnabled])

	useInterval(() => {
		if (hasExpired) {
			setFavicon(0)
			deleteLayerById({ layerId, isAuto: true })
		}
		else {
			setDelta(Date.now() - layer.createdAt)
		}
	}, 1000)

	useInterval(() => {
		setFavicon((i) => (i + 1) % 3)
	}, isBeaconAlertRunning ? 500 : null)

	const opacity = 1 - Math.min(Math.max((delta - beaconLifetime * 0.75) / (beaconLifetime - beaconLifetime * 0.75), 0), 0.9)

	let posX = layer.x
	let posY = layer.y
	const offsetX = posX + camera.x
	const offsetY = posY + camera.y

	if (!isZooming && (offsetX < 0 || offsetY < 0 || offsetX > canvasRect?.width || offsetY > canvasRect?.height)) {
		const position = []

		// TODO: same code as cursor, refactor
		if (offsetX < 0) {
			position.push('left')
			posX = -camera.x + 5
		}
		else if (offsetX > canvasRect?.width) {
			position.push('right')
			posX = canvasRect?.width - camera.x - 5
		}

		if (offsetY < 0) {
			position.push('top')
			posY = -camera.y + 5
		}
		else if (offsetY > canvasRect?.height) {
			position.push('bottom')
			posY = canvasRect?.height - camera.y - 5
		}

		return <button
			className='absolute top-0 left-0 z-50 transition-transform'
			style={{
				transform: `translateX(${posX}px) translateY(${posY}px)`,
				opacity
			}}
			onPointerDown={(e) => {
				cancelEvent(e)

				const pos = getConstrainedCamera(-layer.x + canvasRect?.width / 2, -layer.y + canvasRect?.height / 2, canvasRect)
				setCamera(pos)
			}}
		>
			<div
				className={`flex text-white text-sm transition-opacity relative ${position.includes('right') && '-translate-x-full'} ${position.includes('bottom') && '-translate-y-full'} ${(position.includes('left') || position.includes('right')) && position.length === 1 && '-translate-y-1/2'}`}
			>
				<div className={`bg-${color}-700 flex justify-center items-center self-stretch rounded-full w-8 h-8 ${position.includes('top') && 'animate-bounce-down'} ${position.includes('bottom') && 'animate-bounce-up'} ${position.includes('left') && 'animate-bounce-right'} ${position.includes('right') && 'animate-bounce-left'}`}>
					<PinIcon className='w-3/4' />
				</div>
			</div>
		</button>
	}
	else {
		return <div className={`absolute -translate-x-1/2 transition-opacity rounded-full text-${color}-700 w-8 h-8 flex items-center justify-center ${layer.isGhost && 'opacity-60 pointer-events-none'}`} style={{ left: layer.x, top: layer.y, opacity }}>
			{isBeaconAlertRunning && <Favicon step={favicon} />}

			<div className={`w-full h-full absolute left-0 top-0 border-2 border-${color}-700 animate-ping rounded-full`} />
			<PinIcon className='w-full' />
		</div>
	}
}

function ScreenShare ({ layer, layerId, color, onLayerPointerDown, isSelected, deleteLayerById, layerSizes, isMultiSelection, isZooming, className, trackData, setExpandedScreenShare }) {
	const elRef = useRef()
	const box = useSize(elRef)
	const hasTrack = trackData?.track

	useEffect(() => {
		layerSizes.current[layerId] = box
	}, [box, layerId, layerSizes])

	return <div
		className={`absolute bg-${color}-200 text-${color}-700 p-2 pb-0 rounded-lg ${className}`}
		style={{
			transform: `translateX(${layer.x}px) translateX(-50%) translateY(${layer.y}px)`
		}}
		ref={elRef}
		onPointerDown={(e) => {
			onLayerPointerDown(e, layerId)
		}}
	>
		{!isZooming && isSelected && !isMultiSelection && <>
			<DeleteButton color={color} layerId={layerId} deleteLayerById={deleteLayerById} />
			<div
				className='absolute -right-2 translate-x-full flex justify-end bottom-2'
				onPointerDown={(e) => {
					cancelEvent(e)
					setExpandedScreenShare(trackData)
				}}
				onPointerUp={cancelEvent}
			>
				<button title='Expand screen share' className={`rounded-lg border-2 hover:bg-${color}-700 hover:text-white transition-colors border-${color}-700 text-${color}-700 w-6 h-6 flex justify-center items-center z-20 text-sm`}>
					<ArrowsPointingOutIcon className='w-3/4' />
				</button>
			</div>
		</>}
		{hasTrack && <VideoRenderer width={500} height={500 * (trackData.dimensions.height / trackData.dimensions.width)} {...trackData} className='rounded-md' />}
		<div className='text-sm py-1 flex items-center justify-center space-x-1'>
			<div className={`bg-${color}-700 text-white rounded-md px-2 py-0.5 font-medium`}>{layer.createdBy}</div>
			<div>is sharing their screen</div>
		</div>
	</div>
}

export default function Layer ({ layerId, ...props }) {
	const layer = useStorage((root) => root.layers.get(layerId))

	if (!layer) {
		return null
	}

	const { isZooming, isSelected, isSelectedByOthers, color } = props

	const ring = isZooming ? 'ring-4' : 'ring-2'
	const className = `${isSelected && `${ring} ring-${color}-700`} ${isSelectedByOthers && `${ring} ring-${color}-600`} ${layer.isGhost && 'opacity-60 z-50'}`

	switch (layer.type) {
		case 'sticky':
			return <Sticky layer={layer} layerId={layerId} className={className} {...props} />
		case 'chat':
			return <Chat layer={layer} layerId={layerId} className={className} {...props} />
		case 'text':
			return <Text layer={layer} layerId={layerId} className={className} {...props} />
		case 'beacon':
			return <Beacon layer={layer} layerId={layerId} className={className} {...props} />
		case 'screenshare':
			return <ScreenShare layer={layer} layerId={layerId} className={className} {...props} />
		default:
			// console.warn('Unknown layer type')

			return null
	}
}
