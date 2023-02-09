/* eslint-disable camelcase */
import { MicOffIcon, MicOnIcon, ZoomInIcon, ZoomOutIcon, TrashIcon, UndoIcon, RedoIcon, DownloadIcon, BoardIcon } from './icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { LiveList, LiveObject } from '@liveblocks/client'
import { toPng } from 'html-to-image'
import Link from 'next/link'

import Layer from './Layer'
import useSize from './useSize'
import { RoomProvider, useCanRedo, useCanUndo, useHistory, useMutation, useMyPresence, useOthers, useStorage } from '../liveblocks.config'
import { unstable_batchedUpdates } from 'react-dom'
import { CANVAS_SIZE, findLayerPosition, rooms, getConstrainedCamera, lerp, findIntersectingLayersWithRectangle, getPointerPosition, getConstrainedZoomOutCamera, cancelEvent, tools, CANVAS_PADDING } from '../utils'
import ActivityIndicator from './ActivityIndicator'
import Cursor from './Cursor'
import { AnimatePresence, motion } from 'framer-motion'
import { VideoRenderer } from '@livekit/react-core'
import { ArrowsPointingInIcon } from '@heroicons/react/24/solid'

function SelectionNet ({ color, origin, current }) {
	return <div className={`absolute border-2 border-${color}-700 bg-${color}-200 bg-opacity-25`} style={{ left: Math.min(origin.x, current.x), top: Math.min(origin.y, current.y), width: Math.abs(origin.x - current.x), height: Math.abs(origin.y - current.y) }} />
}

function deleteLayer ({ layerId, layerIds, layers, layerSizes }) {
	layers.delete(layerId)
	const index = layerIds.indexOf(layerId)

	if (index !== -1) {
		layerIds.delete(index)
	}

	delete layerSizes[layerId]
}

function Stage ({ username, color, participants, toggleMute, toggleScreenShare, isScreenSharing, isTalkingWhileMuted, isSpeaking, metadata, isAudioEnabled, roomId }) {
	const layers = useStorage((root) => root.layers)
	const layerIds = useStorage((root) => root.layerIds)

	const layerSizes = useRef({})

	const [{ selection, isActive, ...canvasState }, setPresence] = useMyPresence()
	const others = useOthers()
	const history = useHistory()
	const canRedo = useCanRedo()
	const canUndo = useCanUndo()
	const [camera, setCamera] = useState({ x: 0, y: 0 })
	const [isZooming, setZooming] = useState(false)
	const [zoomPoint, setZoomPoint] = useState()

	const canvasRef = useRef()
	const fullCanvasRef = useRef()
	const canvasRect = useSize(canvasRef)

	const zoomOutScale = Math.min(canvasRect?.height, canvasRect?.width) / (CANVAS_SIZE * 1.05)
	const zoomOutX = (CANVAS_SIZE * 0.05) / 2 + (((canvasRect?.width - CANVAS_SIZE * zoomOutScale * 1.05) / 2) * 1 / zoomOutScale)
	const zoomOutY = (CANVAS_SIZE * 0.05) / 2 + (((canvasRect?.height - CANVAS_SIZE * zoomOutScale * 1.05) / 2) * 1 / zoomOutScale)

	const zoomOutSize = CANVAS_SIZE * zoomOutScale
	const zoomOutOriginX = (canvasRect?.width - zoomOutSize) / 2
	const zoomOutOriginY = (canvasRect?.height - zoomOutSize) / 2
	const [needsZoomAnim, setNeedZoomAnim] = useState()
	const [expandedScreenShare, setExpandedScreenShare] = useState()
	const [isRequestingScreenShare, setRequestingScreenShare] = useState(false)

	const [isRequestingToClear, setIsRequestingToClear] = useState(null)
	const [isMultiSelecting, setIsMultiSelecting] = useState(false)
	const [isDuplicating, setIsDuplicating] = useState(false)
	const [hasDuplicated, setHasDuplicated] = useState(false)
	const [pasteCount, setPasteCount] = useState(0)

	const isCreating = selection?.length === 1 && layers?.get(selection[0])?.isGhost

	const getParticipant = (username) => {
		return participants.find(({ identity }) => {
			// There's a date attached to the identity to make it unique in case
			// of multiple connections
			return identity.split('-')[0] === username
		})
	}

	const getDynamicPointerPosition = useCallback((e) => {
		const pos = getPointerPosition(e, canvasRect)

		let point = {
			x: Math.min(Math.max(pos.x - camera.x, CANVAS_PADDING), CANVAS_SIZE - CANVAS_PADDING),
			y: Math.min(Math.max(pos.y - camera.y, CANVAS_PADDING), CANVAS_SIZE - CANVAS_PADDING)
		}

		if (isZooming) {
			point = {
				x: lerp(Math.min(Math.max(pos.x - zoomOutOriginX, 0), CANVAS_SIZE * zoomOutScale), [0, zoomOutSize], [0, CANVAS_SIZE]),
				y: lerp(Math.min(Math.max(pos.y - zoomOutOriginY, 0), CANVAS_SIZE * zoomOutScale), [0, zoomOutSize], [0, CANVAS_SIZE])
			}
		}

		return point
	}, [camera, canvasRect, isZooming, zoomOutOriginX, zoomOutOriginY, zoomOutScale, zoomOutSize])

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

	const handleUndo = useCallback(() => {
		history.undo()
		setPresence({ currentAction: 'undo' })
	}, [history, setPresence])

	const handleRedo = useCallback(() => {
		history.redo()
		setPresence({ currentAction: 'redo' })
	}, [history, setPresence])

	const deleteLayers = useMutation(({ storage, setMyPresence, self }) => {
		const layers = storage.get('layers')
		const layerIds = storage.get('layerIds')

		for (const layerId of self.presence.selection) {
			deleteLayer({ layerId, layerIds, layers, layerSizes })
		}

		setMyPresence({ currentAction: 'delete' })
	}, [])

	const deleteLayerById = useMutation(({ storage, setMyPresence }, { layerId, isAuto }) => {
		const layers = storage.get('layers')
		const layerIds = storage.get('layerIds')

		deleteLayer({ layerId, layerIds, layers, layerSizes })

		if (!isAuto) {
			setMyPresence({ currentAction: 'delete', selection: [] })
		}
	}, [])

	const handleAddToSelection = useMutation(({ storage, self, setMyPresence }, layerId) => {
		const layers = storage.get('layers')
		const layerIds = storage.get('layerIds')
		const currentSelection = self.presence.selection
		const isSelected = currentSelection.includes(layerId)

		if (isMultiSelecting || !isSelected) {
			const type = layers.get(layerId).get('type')
			let selection = [...currentSelection, layerId]

			if (isSelected) {
				selection = selection.filter((id) => id !== layerId)
			}
			else if (!isMultiSelecting) {
				selection = [layerId]
			}

			setMyPresence({ selection, currentAction: 'select' }, { addToHistory: true })

			if (!isMultiSelecting) {
				const from = layerIds.findIndex((id) => id === layerId)
				const to = findLayerPosition({ layerIds, layers, type })

				layerIds.move(from, to)
			}
		}
	}, [isMultiSelecting])

	/**
   	* Select the layer if not already selected and start translating the selection
	*/
	const onLayerPointerDown = useCallback((e, layerId) => {
		e.stopPropagation()

		if (!isCreating) {
			history.pause()

			handleAddToSelection(layerId)

			const current = getDynamicPointerPosition(e)
			setPresence({ mode: 'move', current })
		}
	}, [isCreating, history, handleAddToSelection, getDynamicPointerPosition, setPresence])

	/**
   * Start multiselection with the selection net if the pointer move enough since pressed
   */
	const startMultiSelection = useMutation(({ setMyPresence }, current, origin) => {
		// If the distance between the pointer position and the pointer position when it was pressed
		if (Math.abs(current.x - origin.x) + Math.abs(current.y - origin.y) > 5) {
			setMyPresence({
				mode: 'selection',
				origin,
				current
			})
		}
	}, [])

	/**
   * Update the position of the selection net and select the layers accordingly
   */
	const updateSelectionNet = useMutation(({ setMyPresence, storage }, current, origin) => {
		const layers = storage.get('layers')
		const ids = findIntersectingLayersWithRectangle(layers, layerSizes, origin, current)

		setMyPresence({
			selection: ids,
			mode: 'selection',
			origin,
			current
		})
	}, [])

	/**
	 * Move selected layers on the canvas
	 */
	const translateSelectedLayers = useMutation(({ setMyPresence, storage, self }, point, current, showDuplicating) => {
		const offset = {
			x: point.x - current.x,
			y: point.y - current.y
		}

		const layers = storage.get('layers')
		const selection = self.presence.selection

		for (const id of selection) {
			const layer = layers.get(id)

			if (layer) {
				layer.update({
					x: layer.get('x') + offset.x,
					y: layer.get('y') + offset.y
				})

				let currentAction = showDuplicating ? 'duplicate' : 'move'

				if (layer.get('isGhost')) {
					currentAction = `create-${layer.get('type')}`
				}

				setMyPresence({ currentAction })
			}
		}

		setMyPresence({ mode: 'move', current: point })
	}, [])

	// Inserts a layer at the given position and select it
	const copyLayers = useMutation(({ storage, setMyPresence, self }, ids, offset) => {
		const layers = storage.get('layers')
		const layerIds = storage.get('layerIds')
		const username = self.presence.username
		const sources = ids.filter((id) => layers.get(id))

		const newSelection = sources.map((source) => {
			const layerId = nanoid()
			const sourceData = layers.get(source).toObject()

			const base = {
				...sourceData,
				votes: undefined,
				messages: sourceData.type === 'chat' ? new LiveList() : undefined
			}

			if (offset) {
				base.x -= offset
				base.y -= offset
			}

			const layer = new LiveObject({
				...base,
				createdBy: username,
				createdAt: Date.now()
			})

			const to = findLayerPosition({ layerIds, layers, type: base.type, isInserting: true })

			layerIds.insert(layerId, to)
			layers.set(layerId, layer)

			return layerId
		})

		setMyPresence({ selection: newSelection }, { addToHistory: true })
	}, [])

	// Inserts a layer at the given position and select it
	const insertLayer = useMutation(({ storage, setMyPresence, self }, { type, point, isMoveable }) => {
		const username = self.presence.username
		const layerId = nanoid()
		const layers = storage.get('layers')
		const layerIds = storage.get('layerIds')

		const layer = new LiveObject({
			type,
			...point,
			messages: type === 'chat' ? new LiveList() : undefined,
			isGhost: isMoveable,
			createdBy: username,
			createdAt: Date.now()
		})

		const to = findLayerPosition({ layerIds, layers, type, isInserting: true })

		layerIds.insert(layerId, to)
		layers.set(layerId, layer)

		if (isMoveable) {
			setMyPresence({ selection: [layerId] }, { addToHistory: true })
		}
		else {
			setMyPresence({ selection: [] }, { addToHistory: true })
		}
	}, [])

	const handleCreating = useMutation(({ storage, self, setMyPresence }) => {
		const layers = storage.get('layers')
		const item = layers.get(self.presence.selection[0])

		item.update({
			isGhost: false,
			createdAt: Date.now()
		})

		if (item.get('type') === 'beacon') {
			setMyPresence({ selection: [] }, { addToHistory: true })
		}
	}, [])

	const clearStage = useMutation(({ storage, setMyPresence }) => {
		const layers = storage.get('layers')
		const layerIds = storage.get('layerIds')

		for (const k of layers.keys()) {
			layers.delete(k)
		}

		layerIds.clear()

		setMyPresence({ currentAction: 'trash' })
	}, [])

	// Stop screen share if layer is deleted
	useEffect(() => {
		const layerId = layerIds?.find((id) => {
			const layer = layers.get(id)

			return layer.type === 'screenshare' && layer.createdBy === username
		})

		if (isScreenSharing && !isRequestingScreenShare && !layerId) {
			toggleScreenShare()
		}
	}, [isRequestingScreenShare, isScreenSharing, layerIds, layers, toggleScreenShare, username])

	// Remove layer if screenshare is stopped
	useEffect(() => {
		const layerId = layerIds?.find((id) => {
			const layer = layers.get(id)

			return layer.type === 'screenshare' && layer.createdBy === username
		})

		if (!isScreenSharing && layerId) {
			deleteLayerById({ layerId, isAuto: true })
		}
	}, [deleteLayerById, isScreenSharing, layerIds, layers, toggleScreenShare, username])

	const toggleZoom = useCallback(() => {
		setZooming(!isZooming)

		if (isZooming) {
			setNeedZoomAnim(true)

			setTimeout(() => {
				setNeedZoomAnim(false)
			}, 350)

			setPresence({ currentAction: 'zoom-in' })
		}
		else {
			const pos = getConstrainedZoomOutCamera(camera.x, camera.y, canvasRect)
			setZoomPoint(pos)
			setPresence({ currentAction: 'zoom-out' })
		}
	}, [camera, canvasRect, isZooming, setPresence])

	useEffect(() => {
		const selectedText = window.getSelection()
		selectedText.removeAllRanges()
	}, [selection])

	const handleDeselect = useMutation(({ storage, self, setMyPresence }) => {
		const layers = storage.get('layers')

		for (const id of self.presence.selection) {
			const item = layers.get(id)

			if (item && item.get('isGhost')) {
				deleteLayerById({ layerId: id, isAuto: true })
			}
		}

		setMyPresence({ selection: [], currentAction: null })
	}, [deleteLayerById])

	/**
   	* Hook used to listen to Undo / Redo and delete selected layers
   	*/
	useEffect(() => {
		function onKeyDown (e) {
			switch (e.key) {
				case 'Backspace': {
					if (selection.length > 1) {
						deleteLayers()
					}

					break
				}

				case 'Alt': {
					setIsDuplicating(true)

					break
				}

				case 'Shift': {
					setIsMultiSelecting(true)

					break
				}

				case 'z': {
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault()

						if (e.shiftKey) {
							handleRedo()
						}
						else {
							handleUndo()
						}
					}

					break
				}

				case '-': {
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault()
						toggleZoom()
					}

					break
				}

				case '=': {
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault()
						toggleZoom()
					}

					break
				}

				case 'Escape': {
					handleDeselect()
					setExpandedScreenShare(null)

					break
				}
			}
		}

		function onKeyUp (e) {
			switch (e.key) {
				case 'Alt': {
					setIsDuplicating(false)

					break
				}

				case 'Shift': {
					setIsMultiSelecting(false)

					break
				}
			}
		}

		function onCopy (e) {
			const selectedText = document.activeElement?.value?.substring(document.activeElement.selectionStart, document.activeElement.selectionEnd)

			if (!selectedText) {
				e.preventDefault()
				e.clipboardData.setData('data/colab', JSON.stringify(selection))
				setPasteCount(0)

				setPresence({ currentAction: 'copy' })
			}
		}

		function onPaste (e) {
			if (e.clipboardData.types.indexOf('data/colab') > -1) {
				e.preventDefault()

				const data = e.clipboardData.getData('data/colab')
				const source = JSON.parse(data)

				copyLayers(source, 20 * (pasteCount + 1))
				setPasteCount((c) => c + 1)

				setPresence({ currentAction: 'paste' })
			}
		}

		document.addEventListener('copy', onCopy)
		document.addEventListener('paste', onPaste)
		document.addEventListener('keydown', onKeyDown)
		document.addEventListener('keyup', onKeyUp)

		return () => {
			document.removeEventListener('copy', onCopy)
			document.removeEventListener('paste', onPaste)
			document.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('keyup', onKeyUp)
		}
	}, [copyLayers, deleteLayers, handleDeselect, handleRedo, handleUndo, history, pasteCount, selection, setPresence, toggleZoom])

	// We handle the wheel event separately because the handler
	// needs to be active in order to preventDefault
	// which prevents gesture-based navigation on Safari/Firefox
	useEffect(() => {
		function handleWheel (e) {
			e.preventDefault()

			const deltaX = isZooming ? -e.deltaX : e.deltaX
			const deltaY = isZooming ? -e.deltaY : e.deltaY

			// Pan the camera based on the wheel delta
			const cameraPos = getConstrainedCamera(camera.x - deltaX, camera.y - deltaY, canvasRect)
			setCamera(cameraPos)

			if (isZooming) {
				const pos = getConstrainedZoomOutCamera(cameraPos.x, cameraPos.y, canvasRect)
				setZoomPoint(pos)
			}

			const cursor = getDynamicPointerPosition(e)

			setPresence({ cursor })
		}

		document.addEventListener('wheel', handleWheel, { passive: false })

		return () => {
			document.removeEventListener('wheel', handleWheel)
		}
	}, [camera, canvasRect, getDynamicPointerPosition, isZooming, setPresence])

	const onPointerDown = useCallback((e) => {
		const cursor = getDynamicPointerPosition(e)

		setPresence({ mode: 'press', current: cursor, origin: cursor })
	}, [getDynamicPointerPosition, setPresence])

	const onPointerMove = useCallback((e) => {
		const cursor = getDynamicPointerPosition(e)

		setPresence({ cursor })

		if (canvasState?.mode === 'move') {
			if (isDuplicating && !hasDuplicated) {
				setHasDuplicated(true)
				copyLayers(selection)

				setPresence({ currentAction: 'duplicate' })
			}
			else {
				translateSelectedLayers(cursor, canvasState.current, isDuplicating && hasDuplicated)
			}
		}
		else if (canvasState?.mode === 'press') {
			startMultiSelection(cursor, canvasState.origin)
		}
		else if (canvasState?.mode === 'selection') {
			updateSelectionNet(cursor, canvasState.origin)
		}
	}, [canvasState, copyLayers, getDynamicPointerPosition, hasDuplicated, isDuplicating, selection, setPresence, startMultiSelection, translateSelectedLayers, updateSelectionNet])

	const onPointerUp = useCallback((e) => {
		if (!canvasState?.mode || (canvasState.mode === 'press' && !isCreating)) {
			if (selection?.length) {
				setPresence({ selection: [], currentAction: null }, { addToHistory: true })
			}
			else {
				setPresence({ currentAction: null })
			}
		}
		else { // Creating, moving or selecting
			if (isCreating) {
				handleCreating()
			}

			setHasDuplicated(false)
			history.resume()
		}

		setPresence({ mode: null })
	}, [canvasState, handleCreating, history, isCreating, selection, setPresence])

	return <div
		className='flex flex-col w-full h-full relative p-2 pb-0'
		onPointerDown={onPointerDown}
		onPointerMove={onPointerMove}
		onPointerUp={onPointerUp}
	>
		<div className={`bg-${color}-200 w-full rounded-t-xl flex justify-between items-stretch px-2 py-2 shadow-md relative z-20`}>
			<div className='relative h-full'>
				<button title='Toggle Mute' className={`text-black flex items-center ${isAudioEnabled ? `bg-${color}-700 text-white` : 'bg-neutral-100'} rounded-lg relative z-20 h-full px-2 py-1`} onClick={toggleMute}>
					{isAudioEnabled ? <MicOnIcon className='w-5' /> : <MicOffIcon className='w-5' />}
					<div className='pl-1 font-semibold'>{username}</div>
					<div className={`absolute left-0 top-0 w-full h-full ring-2 ring-offset-2 ring-offset-${color}-300 rounded-md ring-black z-0 transition-opacity ${isSpeaking ? 'opacity-80' : 'opacity-0'}`} />
				</button>
				<div className={`absolute top-0.5 -right-2 transition-all ${!isAudioEnabled && isTalkingWhileMuted ? 'translate-x-full opacity-100' : '-translate-x-0 opacity-0'} z-10`}>
					<div className={`bg-${color}-700 text-white py-1 px-2 rounded-lg font-medium whitespace-nowrap leading-tight animate-shake`}>You are muted</div>
				</div>
			</div>
			{!expandedScreenShare?.track && <div className='flex justify-center items-center space-x-2 absolute left-1/2 -translate-x-1/2'>
				{tools.map(({ Icon, type }) => {
					return <button
						key={type}
						title={`${type} tool`}
						onPointerUp={cancelEvent}
						onPointerDown={(e) => {
							e.stopPropagation()

							if (type === 'screenshare' && isScreenSharing) {
								toggleScreenShare()
							}
							else {
								handleDeselect()

								const point = getDynamicPointerPosition(e)

								setPresence({
									currentAction: `create-${type}`,
									mode: 'move',
									current: point,
									origin: point
								})

								if (type === 'screenshare') {
									setRequestingScreenShare(true)

									toggleScreenShare().then(() => {
										insertLayer({ type, point, isMoveable: false })
										setRequestingScreenShare(false)
									}).catch(() => {
										setRequestingScreenShare(false)
									})
								}
								else {
									history.pause()
									insertLayer({ type, point, isMoveable: true })
								}
							}
						}}
						className={`rounded-full h-8 w-8 border-2 text-${color}-700 border-${color}-700 flex justify-center items-center transition-colors hover:bg-${color}-700 hover:text-white outline-none ${((isCreating && layers.get(selection[0]).type === type) || (type === 'screenshare' && isScreenSharing)) && `bg-${color}-700 text-white`}`}>
						<Icon className='w-3/4' />
					</button>
				})}
			</div>}

			{!expandedScreenShare?.track && <div className={`text-${color}-700 flex space-x-2`}>
				<button
					className={`w-8 h-8 transition-colors border-${color}-700 hover:bg-${color}-700 hover:text-white rounded-lg border-2 flex items-center justify-center disabled:opacity-30`}
					title='Undo'
					onPointerDown={(e) => {
						cancelEvent(e)

						handleUndo()
					}}
					onPointerUp={cancelEvent}
					disabled={!canUndo}
				>
					<UndoIcon className='w-3/4' />
				</button>
				<button
					className={`w-8 h-8 transition-colors border-${color}-700 hover:bg-${color}-700 hover:text-white rounded-lg border-2 flex items-center justify-center disabled:opacity-30`}
					title='Redo'
					onPointerDown={(e) => {
						cancelEvent(e)

						handleRedo()
					}}
					onPointerUp={cancelEvent}
					disabled={!canRedo}
				>
					<RedoIcon className='w-3/4' />
				</button>
				<button
					title={isZooming ? 'Zoom in' : 'Zoom out'}
					className={`w-8 h-8 transition-colors text-${color}-700 border-${color}-700 hover:bg-${color}-700 hover:text-white rounded-lg border-2 flex items-center justify-center`}
					onPointerDown={(e) => {
						cancelEvent(e)
						toggleZoom()
					}}
					onPointerUp={cancelEvent}
				>
					{isZooming ? <ZoomInIcon className='w-3/4' /> : <ZoomOutIcon className='w-3/4' />}
				</button>
			</div>}
			{expandedScreenShare?.track && <button
				title='Reduce screen share'
				className={`w-8 h-8 transition-colors text-${color}-700 border-${color}-700 hover:bg-${color}-700 hover:text-white rounded-lg border-2 flex items-center justify-center`}
				onPointerDown={(e) => {
					cancelEvent(e)
					setExpandedScreenShare(null)
				}}
				onPointerUp={cancelEvent}
			>
				<ArrowsPointingInIcon className='w-3/4' />
			</button>}
		</div>
		<div
			ref={canvasRef}
			className={`w-full h-full bg-${color}-200 rounded-b-xl overflow-hidden relative`}
		>
			<div
				className={`absolute bg-${color}-400 will-change-transform rounded-lg origin-top-left select-none ${(isZooming || needsZoomAnim) && 'transition-transform'}`}
				ref={fullCanvasRef}
				style={{
					width: CANVAS_SIZE,
					height: CANVAS_SIZE,
					top: 0,
					left: 0,
					transform: isZooming ? `scale(${zoomOutScale}) translate(${zoomOutX}px, ${zoomOutY}px)` : `translate(${camera.x}px, ${camera.y}px)`,
					backgroundImage: 'url(/images/grid.png)'
				}}
			>
				<AnimatePresence>
					{isZooming && zoomPoint && <motion.div
						className={`bg-${color}-300 bg-opacity-50 absolute pointer-events-none`}
						style={{
							width: canvasRect?.width,
							height: canvasRect?.height,
							left: zoomPoint.x,
							top: zoomPoint.y
						}}
						transition={{ ease: 'easeInOut' }}
						initial={{ scale: 2, opacity: 0 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 2 }}
					/>}
				</AnimatePresence>

				<div className={`top-4 left-3 absolute text-${color}-700 font-bold text-xl flex space-x-1 items-center`}>
					<BoardIcon className='h-6' />
					<div>{metadata?.name}</div>
				</div>

				{layerIds?.map((layerId) => {
					const isSelected = selection?.includes(layerId)
					const isSelectedByOthers = !isSelected && others.find(({ presence }) => presence.selection?.includes(layerId))
					const layer = layers.get(layerId)

					const props = {
						layerId,
						layerSizes,
						username,
						onLayerPointerDown,
						color,
						isSelected,
						isSelectedByOthers,
						deleteLayerById,
						camera,
						setCamera,
						canvasRect,
						isZooming,
						isActive,
						isAudioEnabled,
						setExpandedScreenShare,
						isMultiSelection: selection?.length > 1
					}

					if (layer.type === 'screenshare') {
						const participant = getParticipant(layer.createdBy)
						props.trackData = participant?.getTrack('screen_share')
					}

					return <Layer key={layerId} {...props} />
				})}

				{canvasState?.mode === 'selection' && <SelectionNet color={color} origin={canvasState.origin} current={canvasState.current} />}

				{others.map(({ connectionId, presence }) => {
					if (presence?.mode === 'selection' && presence?.origin && presence?.current) {
						return <SelectionNet key={connectionId} color={color} origin={presence.origin} current={presence.current} />
					}
					else {
						return null
					}
				})}

				{others.map(({ connectionId, presence }) => {
					if (!presence || !presence.cursor) {
						return null
					}

					const participant = getParticipant(presence.username)

					return <Cursor
						color={color}
						key={`cursor-${connectionId}`}
						canvasRect={canvasRect}
						setCamera={({ x, y }) => setCamera(getConstrainedCamera(x, y, canvasRect))}
						camera={camera}
						isZooming={isZooming}
						isAudioEnabled={participant?.isMicrophoneEnabled}
						isSpeaking={participant?.isSpeaking}
						presence={presence}
						scaleFactor={zoomOutScale}
					/>
				})}
			</div>

			<AnimatePresence>
				{expandedScreenShare && expandedScreenShare.track && <motion.div
					className='absolute top-0 left-0 bg-black w-full h-full z-50 flex justify-center items-center p-4'
					transition={{ ease: 'easeInOut' }}
					initial={{ y: '100%' }}
					animate={{ y: 0 }}
					exit={{ y: '100%' }}
				>
					<VideoRenderer {...expandedScreenShare} className='w-full h-full' />
				</motion.div>}
			</AnimatePresence>
		</div>
		<div className='w-full flex items-center space-x-2 py-1 px-0.5 relative z-50'>
			{isRequestingToClear && <div className={`absolute z-20 -top-2 left-0 w-full h-[110%] bg-${color}-700 text-white flex justify-center items-center space-x-2 rounded-b-lg`}>
				<h3>Delete everything in this room?</h3>
				<button
					className='border-2 small-caps rounded-lg px-2 flex items-center justify-center leading-none pb-0.5 hover:bg-white hover:text-black'
					onClick={() => {
						clearStage()
						setIsRequestingToClear(false)
					}}
				>Delete everything</button>
				<button className='border-2 small-caps rounded-lg px-2 flex items-center justify-center leading-none pb-0.5 hover:bg-white hover:text-black' onClick={() => setIsRequestingToClear(false)}>Cancel</button>
			</div>}

			<div className='flex-shrink-0 flex space-x-2 items-center'>
				<Link href='/'><a title='Back to Lobby' className={`border-${color}-700 hover:bg-${color}-700 hover:text-white border-2 small-caps text-${color}-700 rounded-lg px-2 flex items-center justify-center leading-none font-medium pb-0.5`}>Leave</a></Link>

				<div className={`text-${color}-700 small-caps leading-none -mt-1`}>{roomId}</div>
			</div>

			<div className='w-full h-7 rounded-lg py-2 flex'>
				{rooms.filter(({ id }) => id !== roomId).map(({ id, color }) => {
					return <RoomProvider unstable_batchedUpdates={unstable_batchedUpdates} initialPresence={{}} key={id} id={id}>
						<ActivityIndicator roomId={id} color={color} />
					</RoomProvider>
				})}
				<RoomProvider unstable_batchedUpdates={unstable_batchedUpdates} initialPresence={{}} id='lobby'>
					<ActivityIndicator roomId='lobby' isLobby />
				</RoomProvider>
			</div>
			<div className={`text-${color}-700 flex space-x-2`}>
				<button
					title='Download canvas'
					className={`w-8 h-8 border-${color}-700 transition-colors hover:bg-${color}-700 hover:text-white rounded-lg border-2 flex items-center justify-center`}
					onPointerDown={cancelEvent}
					onPointerUp={cancelEvent}
					onClick={() => {
						toPng(fullCanvasRef.current, { cacheBust: true, style: { transform: 'none' } })
							.then((dataUrl) => {
								const link = document.createElement('a')
								link.download = `${metadata.name}-${Date.now()}.png`
								link.href = dataUrl
								link.click()
							})
							.catch((err) => {
								console.log(err)
							})

						setPresence({ currentAction: 'download' })
					}}
				>
					<DownloadIcon className='w-3/4' />
				</button>

				<button title='Clear canvas' className={`w-8 h-8 border-${color}-700 transition-colors hover:bg-${color}-700 hover:text-white rounded-lg border-2 flex items-center justify-center`} onClick={() => setIsRequestingToClear(true)}><TrashIcon className='w-3/4' /></button>
			</div>
		</div>
	</div>
}

export default Stage
