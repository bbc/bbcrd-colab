import { useOthers, useStorage } from '../liveblocks.config'
import { BoardIcon } from './icons'

function ActiveLabel ({ isLobby, color, roomId, metadata, activeOthers }) {
	return <div className={`absolute -top-3 -translate-y-full -translate-x-1/2 left-1/2 rounded-md bg-black text-sm font-bold leading-tight px-2 py-1 hidden group-hover:block ${isLobby ? 'text-white' : `text-${color}-300`}`}>
		<div className='w-full pb-1'>
			<div className='flex items-center space-x-4 pb-1'>
				{!isLobby && <div className='flex items-center space-x-0.5 text-white'>
					<BoardIcon className='w-4' />
					<div className={`whitespace-nowrap ${isLobby && 'small-caps leading-none'}`}>
						{isLobby ? roomId : metadata?.name}
					</div>
				</div>}
				<div className='small-caps'>{roomId}</div>
			</div>
			<div className='flex flex-wrap gap-1'>{activeOthers.map(({ presence, connectionId }) => <div key={connectionId} className={`text-black px-1.5 ${isLobby ? 'bg-white' : `bg-${color}-300`} rounded-md text-xs font-medium`}>{presence.username}</div>)}</div>
		</div>
		<div className='h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-black absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full' />
	</div>
}

function InactiveLabel ({ isLobby, color, roomId }) {
	return <div className={`absolute -top-3 -translate-y-full -translate-x-1/2 left-1/2 rounded-md bg-black text-sm font-bold leading-tight px-2 py-1 hidden group-hover:block ${isLobby ? 'text-white' : `text-${color}-300`}`}>
		<div className='w-full'>
			<div className='small-caps whitespace-nowrap'>{roomId}</div>
		</div>
		<div className='h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-black absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full' />
	</div>
}

function ActivityIndicator ({ roomId, color, isLobby }) {
	const others = useOthers()
	const metadata = useStorage((root) => root.metadata)
	const activeOthers = others.filter((p) => p?.presence?.cursor)
	const isActive = activeOthers.length > 0

	const props = { isLobby, color, roomId, metadata, activeOthers }

	if (!isActive) {
		return <div className='bg-neutral-300 rounded-md w-1/6 order-1 relative group mx-1'>
			<InactiveLabel {...props} />
		</div>
	}

	let span = 'w-4/6'

	if (activeOthers.length === 1) {
		span = 'w-1/6'
	}
	else if (activeOthers.length > 1 && activeOthers.length <= 4) {
		span = 'w-2/6'
	}
	else if (activeOthers.length > 4 && activeOthers.length <= 8) {
		span = 'w-3/6'
	}

	return <div className={`relative ${isLobby ? 'bg-black' : `bg-${color}-500`} rounded-md ${span} order-2 group mx-1`}>
		<ActiveLabel {...props} />
	</div>
}

export default ActivityIndicator
