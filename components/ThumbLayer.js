import { useStorage } from '../liveblocks.config'
import { CANVAS_SIZE } from '../utils'
import { PinIcon } from './icons'

export default function ThumbLayer ({ layerId, color, isActive }) {
	const layer = useStorage((root) => root.layers.get(layerId))

	if (!layer) {
		return null
	}

	const posX = layer.x / CANVAS_SIZE
	const posY = layer.y / CANVAS_SIZE

	switch (layer.type) {
		case 'sticky':
			return <div
				className='w-full h-full absolute top-0 left-0'
				style={{
					transition: 'transform 0.5s cubic-bezier(.17,.93,.38,1)',
					transform: `translateX(${posX * 100}%) translateY(${posY * 100}%)`
				}}
			>
				<div className={`border ${isActive ? `bg-${color}-200 border-${color}-400` : `bg-${color}-100 border-white`} absolute left-0 top-0 w-[1rem] h-[1rem] z-10 -translate-x-1/2`} />
			</div>
		case 'chat':
			return <div
				className='w-full h-full absolute top-0 left-0 flex flex-col space-y-1'
				style={{
					transition: 'transform 0.5s cubic-bezier(.17,.93,.38,1)',
					transform: `translateX(${posX * 100}%) translateY(${posY * 100}%)`
				}}
			>
				{layer.messages && layer.messages.map((message) => {
					return <div key={`${message.createdAt}-${message.createdBy}`} className='bg-white w-[2rem] h-[1rem]' />
				})}
			</div>
		case 'text':
			return <div
				className='w-full h-full absolute top-0 left-0'
				style={{
					fontSize: '0.15rem',
					transition: 'transform 0.5s cubic-bezier(.17,.93,.38,1)',
					transform: `translateX(-50%) translateX(${posX * 100}%) translateY(${posY * 100}%)`
				}}
			>
				{layer.text}
			</div>
		case 'screenshare':
			return <div
				className='w-full h-full absolute top-0 left-0'
				style={{
					transition: 'transform 0.5s cubic-bezier(.17,.93,.38,1)',
					transform: `translateX(${posX * 100}%) translateY(${posY * 100}%)`
				}}
			>
				<div className={`border-2 border-${color}-200 bg-${color}-700 absolute left-0 top-0 w-[3rem] h-[2rem] z-10 -translate-x-1/2`} />
			</div>
		case 'beacon':
			return <div
				className='w-full h-full absolute top-0 left-0'
				style={{
					transition: 'transform 0.5s cubic-bezier(.17,.93,.38,1)',
					transform: `translateX(${posX * 100}%) translateY(${posY * 100}%)`
				}}
			>
				<PinIcon className='w-2 text-black animate-ping' />
			</div>
		default:
			// console.warn('Unknown layer type', layer.type)

			return null
	}
}
