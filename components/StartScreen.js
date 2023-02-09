import { useState } from 'react'
import { useMutation } from '../liveblocks.config'
import Cookies from 'js-cookie'

export default function StartScreen ({ handleSaveName, username, usernames }) {
	const [name, setName] = useState(username || '')
	const [error, setError] = useState(false)

	const handleNameChange = useMutation(({ storage }, newName) => {
		const existingUsers = storage.get('usernames')

		if (username) {
			const index = existingUsers.indexOf(username)

			if (index > -1) {
				existingUsers.delete(index)
			}
		}

		const newNameIndex = existingUsers.indexOf(newName)

		if (newNameIndex === -1) {
			existingUsers.push(newName)
		}

		Cookies.set('username', newName)
	}, [username])

	const handleChange = (e) => {
		setName(e.target.value)

		if (e.target.value !== username && usernames !== null && usernames.includes(e.target.value)) {
			setError(true)
		}
		else {
			setError(false)
		}
	}

	return <div className='fixed top-0 left-0 w-full h-full backdrop-blur-sm bg-neutral-700 bg-opacity-80 flex justify-center items-center font-sans z-50'>
		<div className='bg-neutral-200 text-black shadow-lg flex justify-center items-center rounded-lg px-16 py-14 min-w-[40rem] overflow-hidden'>
			<div className='flex-col space-y-8'>
				<div className='flex-col space-y-4'>
					<h1 className='text-4xl font-bold'>What should we call you?</h1>
					<div className='flex flex-col space-y-2'>
						<input className='text-2xl font-bold text-left leading-normal w-full outline-none bg-white text-black rounded-lg px-2 border-2 border-neutral-400' placeholder='Enter your name' autoFocus value={name} onChange={handleChange} />
					</div>
				</div>
				<div className='flex justify-end space-x-4'>
					{error && <div className='text-orange-500'>Username may already be taken</div>}

					<button
						className='border-black border-2 px-2 py-1 leading-none rounded-md small-caps hover:bg-black hover:text-white disabled:opacity-30'
						disabled={!name?.trim()}
						onClick={() => {
							handleSaveName(name)
							handleNameChange(name)
						}}
					>
						Next
					</button>
				</div>
			</div>
		</div>
	</div>
}
