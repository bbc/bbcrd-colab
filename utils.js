import { ClickIcon, AddIcon, LookIcon, MoveIcon, InactiveIcon, EditIcon, ZoomOutIcon, ZoomInIcon, UndoIcon, RedoIcon, CrossIcon, DownloadIcon, TrashIcon, PinIcon, StickyIcon, ThreadIcon, TextIcon, SmileIcon, CopyIcon, DuplicateIcon } from './components/icons'
import { findLastIndex } from 'lodash'
import { ComputerDesktopIcon } from '@heroicons/react/24/solid'

export const rooms = [
	{ id: 'forties', color: 'amber', className: 'col-span-4 row-span-3' },
	{ id: 'malin', color: 'sky', className: 'col-span-4 row-span-3' },
	{ id: 'viking', color: 'pink', className: 'col-span-4 row-span-3' },
	{ id: 'shannon', color: 'indigo', className: 'col-span-6 row-span-4' },
	{ id: 'fastnet', color: 'teal', className: 'col-span-6 row-span-4' },
	{ id: 'faeroes', color: 'lime', className: 'col-span-4 row-span-3' },
	{ id: 'rockall', color: 'red', className: 'col-span-4 row-span-3' },
	{ id: 'cromarty', color: 'orange', className: 'col-span-4 row-span-3' }
]

export const tools = [
	{ type: 'sticky', Icon: StickyIcon },
	{ type: 'text', Icon: TextIcon },
	{ type: 'chat', Icon: ThreadIcon },
	{ type: 'beacon', Icon: PinIcon },
	{ type: 'screenshare', Icon: ComputerDesktopIcon }
]

export const CANVAS_SIZE = 3000
export const CANVAS_PADDING = 20

export const getPointerPosition = (e, rect) => {
	return {
		x: Math.round(e.clientX - rect?.left),
		y: Math.round(e.clientY - rect?.top)
	}
}

export const cancelEvent = (e) => {
	e.preventDefault()
	e.stopPropagation()
}

export const getActionIcon = (currentAction, isActive) => {
	if (isActive) {
		switch (currentAction) {
			case 'create-sticky':
				return AddIcon
			case 'create-chat':
				return AddIcon
			case 'create-text':
				return AddIcon
			case 'create-beacon':
				return PinIcon
			case 'select':
				return ClickIcon
			case 'move':
				return MoveIcon
			case 'edit':
				return EditIcon
			case 'zoom-out':
				return ZoomOutIcon
			case 'zoom-in':
				return ZoomInIcon
			case 'vote':
				return SmileIcon
			case 'copy':
				return CopyIcon
			case 'paste':
				return DuplicateIcon
			case 'duplicate':
				return DuplicateIcon
			case 'undo':
				return UndoIcon
			case 'redo':
				return RedoIcon
			case 'delete':
				return CrossIcon
			case 'download':
				return DownloadIcon
			case 'trash':
				return TrashIcon
			default:
				return LookIcon
		}
	}
	else {
		return InactiveIcon
	}
}

export function getConstrainedCamera (x, y, canvasRect) {
	const offsetX = Math.max(Math.min(CANVAS_PADDING, x), -CANVAS_SIZE + canvasRect?.width - CANVAS_PADDING)
	const offsetY = Math.max(Math.min(CANVAS_PADDING, y), -CANVAS_SIZE + canvasRect?.height - CANVAS_PADDING)

	return {
		x: offsetX,
		y: offsetY
	}
}

export function getConstrainedZoomOutCamera (x, y, canvasRect) {
	return {
		x: lerp(x, [CANVAS_PADDING, -CANVAS_SIZE + canvasRect?.width], [0, CANVAS_SIZE - canvasRect?.width - CANVAS_PADDING]),
		y: lerp(y, [CANVAS_PADDING, -CANVAS_SIZE + canvasRect?.height], [0, CANVAS_SIZE - canvasRect?.height - CANVAS_PADDING])
	}
}

export function lerp (x, [a1, a2], [b1, b2]) {
	return b1 + (b2 - b1) / (a2 - a1) * (x - a1)
}

export function colorToCss (color) {
	return `#${color.r.toString(16).padStart(2, '0')}${color.g
		.toString(16)
		.padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`
}

export function findIntersectingLayersWithRectangle (layers, layerSizes, a, b) {
	const rect = {
		x: Math.min(a.x, b.x),
		y: Math.min(a.y, b.y),
		width: Math.abs(a.x - b.x),
		height: Math.abs(a.y - b.y)
	}

	const ids = []

	Object.keys(layerSizes.current).forEach((layerId) => {
		const box = layerSizes.current[layerId]
		const { height, width } = box
		const layer = layers.get(layerId)

		if (layer) {
			const x = layer.get('x') - width / 2
			const y = layer.get('y')

			if (rect.x + rect.width > x && rect.x < x + width && rect.y + rect.height > y && rect.y < y + height) {
				ids.push(layerId)
			}
		}
	})

	return ids
}

export function findLayerPosition ({ layerIds, layers, type, isInserting }) {
	const offset = isInserting ? 1 : 0
	const arr = layerIds.toArray()

	let to = findLastIndex(arr, (id) => {
		return layers.get(id)?.get('type') === type
	})

	// if there are no objects like these, we need to make sure it respects the order
	// threads/beacons > text > sticky
	if (to === -1) {
		if (type === 'sticky') {
			to = 0
		}
		else if (type === 'text') {
			to = findLastIndex(arr, (id) => layers.get(id).get('type') === 'sticky')

			if (to === -1) {
				to = 0
			}
			else {
				to += offset
			}
		}
		else {
			to = arr.length
		}
	}
	else {
		to += offset
	}

	return to
}
