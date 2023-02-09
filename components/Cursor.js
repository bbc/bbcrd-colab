import { ChevronDoubleDownIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ChevronDoubleUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from './icons'

import { getActionIcon } from '../utils'
import { useMemo } from 'react'

function Cursor ({ presence, color, isSpeaking, camera, canvasRect, setCamera, isZooming, scaleFactor }) {
	const { cursor, username, currentAction, isActive } = presence

	const scale = useMemo(() => {
		return 1 / (scaleFactor * 1.1)
	}, [scaleFactor])

	const x = cursor.x
	const y = cursor.y
	let posX = x
	let posY = y
	const cursorOffsetX = x + camera.x
	const cursorOffsetY = y + camera.y
	const displayName = `${username}`

	const ActionIcon = getActionIcon(currentAction, isActive)

	if (!isZooming && (cursorOffsetX < 0 || cursorOffsetY < 0 || cursorOffsetX > canvasRect?.width || cursorOffsetY > canvasRect?.height)) {
		let Icon = () => ''
		const position = []

		if (cursorOffsetX < 0) {
			position.push('left')
			posX = -camera.x + 5
			Icon = ChevronLeftIcon

			if (Math.abs(cursorOffsetX) > canvasRect?.width * 2) {
				Icon = ChevronDoubleLeftIcon
			}
		}
		else if (cursorOffsetX > canvasRect?.width) {
			position.push('right')
			posX = canvasRect?.width - camera.x - 5
			Icon = ChevronRightIcon

			if (Math.abs(cursorOffsetX) > canvasRect?.width * 2) {
				Icon = ChevronDoubleRightIcon
			}
		}

		if (cursorOffsetY < 0) {
			position.push('top')
			posY = -camera.y + 5
			Icon = ChevronUpIcon

			if (Math.abs(cursorOffsetY) > canvasRect?.height * 2) {
				Icon = ChevronDoubleUpIcon
			}
		}
		else if (cursorOffsetY > canvasRect?.height) {
			position.push('bottom')
			posY = canvasRect?.height - camera.y - 5
			Icon = ChevronDownIcon

			if (Math.abs(cursorOffsetY) > canvasRect?.height * 2) {
				Icon = ChevronDoubleDownIcon
			}
		}

		return <div
			className='absolute top-0 left-0'
			style={{
				transition: 'transform 0.5s cubic-bezier(.17,.93,.38,1)',
				transform: `translateX(${posX}px) translateY(${posY}px)`
			}}
		>
			<div
				className={`flex text-white text-sm relative ${position.includes('right') && '-translate-x-full'} ${position.includes('bottom') && '-translate-y-full'} ${(position.includes('left') || position.includes('right')) && position.length === 1 && '-translate-y-1/2'}`}
				onClick={() => {
					setCamera({ x: -x + canvasRect?.width / 2, y: -y + canvasRect?.height / 2 })
				}}>
				<div className='bg-neutral-800 flex justify-center items-center self-stretch rounded-l-md w-7'><ActionIcon className='w-3/5' /></div>
				<div className='bg-neutral-700 font-medium px-1.5 py-1'>{displayName}</div>
				<div className='bg-neutral-700 flex justify-center items-center rounded-r-md'><Icon className='h-6 pr-1 py-1' /></div>
				<div className={`absolute left-0 top-0 w-full h-full ring-2 ring-offset-2 ring-offset-${color}-400 rounded-md ring-black z-0 transition-opacity ${isSpeaking ? 'opacity-80' : 'opacity-0'}`} />
			</div>
		</div>
	}
	else {
		return <div
			className='absolute top-0 left-0 pointer-events-none z-50'
			style={{
				transition: 'transform 0.5s cubic-bezier(.17,.93,.38,1)',
				transform: `translateX(${posX}px) translateY(${posY}px) ${isZooming ? `scale(${scale})` : ''}`
			}}
		>
			<div className='-translate-y-1/2 -translate-x-3 relative'>
				<div className='flex text-black text-sm items-center relative z-10'>
					<div className='bg-neutral-200 flex justify-center items-center self-stretch rounded-l-md w-7'>
						<ActionIcon className='w-3/5' />
					</div>
					<div className='bg-neutral-100 font-medium px-1.5 py-1 rounded-r-md'>
						{displayName}
					</div>
				</div>
				<div className={`absolute left-0 top-0 w-full h-full ring-2 ring-offset-2 ring-offset-${color}-400 rounded-md ring-black z-0 transition-opacity ${isSpeaking ? 'opacity-80' : 'opacity-0'}`} />
			</div>
		</div>
	}
}

export default Cursor
